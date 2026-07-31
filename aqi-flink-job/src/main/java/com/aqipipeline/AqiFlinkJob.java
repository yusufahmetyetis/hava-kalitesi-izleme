package com.aqipipeline;

import com.aqipipeline.model.AnomalyEvent;
import com.aqipipeline.model.AqiReading;
import com.aqipipeline.model.WindowAggregate;
import com.hkizleme.flink.mqtt.MqttSourceFunction;
import com.aqipipeline.parser.AqiReadingParser;
import com.aqipipeline.process.AnomalyDetector;
import com.aqipipeline.process.MeasuredAtDeduplicator;
import com.aqipipeline.process.WindowAggregator;
import com.aqipipeline.sink.AnomalySink;
import com.aqipipeline.sink.RawReadingsSink;
import com.aqipipeline.sink.StationSink;
import com.aqipipeline.sink.WindowAggregateSink;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.TumblingProcessingTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;

public class AqiFlinkJob {

    public static void main(String[] args) throws Exception {
        String mqttBroker = getEnv("MQTT_BROKER", "mosquitto");
        int mqttPort = Integer.parseInt(getEnv("MQTT_PORT", "1883"));

        String dbHost = getEnv("DB_HOST", "timescaledb");
        String dbPort = getEnv("DB_PORT", "5432");
        String dbName = getEnv("DB_NAME", "aqi_db");
        String dbUser = getEnv("DB_USER", "yusuf");
        String dbPassword = getEnv("DB_PASSWORD", "aqi123");
        String jdbcUrl = String.format("jdbc:postgresql://%s:%s/%s", dbHost, dbPort, dbName);

        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(1);

        DataStream<String> rawMessages = env.addSource(
                new MqttSourceFunction(mqttBroker, mqttPort, new String[]{"air_quality/#"},
                        "aqi-flink-mqtt-source-"),
                "mqtt-source");

        SingleOutputStreamOperator<AqiReading> readings = rawMessages
                .flatMap(new AqiReadingParser())
                .name("parse-and-filter");

        // WAQI ayni measured_at'i her poll'da (5 dk) yeniden yayinliyor. Fan-out'tan ONCE
        // tekillestir ki asagidaki uc kol da (station/raw sink, pencere, anomali) her fiziksel
        // olcumu tek kez gorsun - yoksa anomali EMA'si ayni degerle defalarca guncellenip bozuluyor
        // ve mukerrer anomali satiri yaziliyordu (bkz. MeasuredAtDeduplicator).
        SingleOutputStreamOperator<AqiReading> deduped = readings
                .keyBy(AqiReading::getStationId)
                .process(new MeasuredAtDeduplicator())
                .name("dedup-by-measured-at");

        // Keep the "stations" table alive - aqi-subscriber, its previous owner, is gone
        deduped.addSink(new StationSink(jdbcUrl, dbUser, dbPassword)).name("station-sink");

        deduped.addSink(new RawReadingsSink(jdbcUrl, dbUser, dbPassword))
                .name("raw-readings-sink");

        // 5-minute tumbling window aggregation per station. Processing time, not event time:
        // WAQI's own measured_at only advances roughly hourly, so an event-time watermark tied
        // to it would stall and windows would never close even though we poll every 5 minutes.
        DataStream<WindowAggregate> windowAggregates = deduped
                .keyBy(AqiReading::getStationId)
                .window(TumblingProcessingTimeWindows.of(Time.minutes(5)))
                .aggregate(new WindowAggregator.Aggregate(), new WindowAggregator.ToWindowAggregate())
                .name("window-aggregate");

        windowAggregates
                .addSink(new WindowAggregateSink(jdbcUrl, dbUser, dbPassword))
                .name("window-aggregate-sink");

        // Anomaly detection: keyed moving average with side-output for deviations
        SingleOutputStreamOperator<AqiReading> anomalyProcessed = deduped
                .keyBy(AqiReading::getStationId)
                .process(new AnomalyDetector())
                .name("anomaly-detection");

        DataStream<AnomalyEvent> anomalies = anomalyProcessed.getSideOutput(AnomalyDetector.ANOMALY_TAG);
        anomalies
                .addSink(new AnomalySink(jdbcUrl, dbUser, dbPassword))
                .name("anomaly-sink");

        env.execute("AQI MQTT to TimescaleDB Job");
    }

    private static String getEnv(String key, String defaultValue) {
        String value = System.getenv(key);
        return (value == null || value.isEmpty()) ? defaultValue : value;
    }
}

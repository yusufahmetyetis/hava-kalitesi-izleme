package com.aqipipeline;

import com.aqipipeline.model.AnomalyEvent;
import com.aqipipeline.model.AqiReading;
import com.aqipipeline.model.WindowAggregate;
import com.aqipipeline.mqtt.MqttSourceFunction;
import com.aqipipeline.parser.AqiReadingParser;
import com.aqipipeline.process.AnomalyDetector;
import com.aqipipeline.process.WindowAggregator;
import com.aqipipeline.sink.AnomalySink;
import com.aqipipeline.sink.StationSink;
import com.aqipipeline.sink.WindowAggregateSink;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;

import java.time.Duration;

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
                new MqttSourceFunction(mqttBroker, mqttPort, new String[]{"air_quality/#"}),
                "mqtt-source");

        SingleOutputStreamOperator<AqiReading> readings = rawMessages
                .flatMap(new AqiReadingParser())
                .name("parse-and-filter")
                .assignTimestampsAndWatermarks(
                        WatermarkStrategy.<AqiReading>forBoundedOutOfOrderness(Duration.ofSeconds(5))
                                .withTimestampAssigner((reading, ts) -> reading.getMeasuredAt().toEpochMilli()));

        // Keep the "stations" table alive - aqi-subscriber, its previous owner, is gone
        readings.addSink(new StationSink(jdbcUrl, dbUser, dbPassword)).name("station-sink");

        // 5-minute tumbling window aggregation per station
        DataStream<WindowAggregate> windowAggregates = readings
                .keyBy(AqiReading::getStationId)
                .window(TumblingEventTimeWindows.of(Time.minutes(5)))
                .aggregate(new WindowAggregator.Aggregate(), new WindowAggregator.ToWindowAggregate())
                .name("window-aggregate");

        windowAggregates
                .addSink(new WindowAggregateSink(jdbcUrl, dbUser, dbPassword))
                .name("window-aggregate-sink");

        // Anomaly detection: keyed moving average with side-output for deviations
        SingleOutputStreamOperator<AqiReading> anomalyProcessed = readings
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

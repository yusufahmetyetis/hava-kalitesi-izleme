package com.energydemo;

import com.energydemo.model.AnomalyEvent;
import com.energydemo.model.EnergyReading;
import com.energydemo.model.ReadingType;
import com.energydemo.model.WindowAggregate;
import com.energydemo.mqtt.MqttSourceFunction;
import com.energydemo.parser.EnergyReadingParser;
import com.energydemo.process.AnomalyDetector;
import com.energydemo.process.WindowAggregator;
import com.energydemo.sink.AnomalySink;
import com.energydemo.sink.ElectricityReadingSink;
import com.energydemo.sink.GasReadingSink;
import com.energydemo.sink.WindowAggregateSink;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;

import java.time.Duration;

public class EnergyStreamJob {

    public static void main(String[] args) throws Exception {
        String mqttBroker = getEnv("MQTT_BROKER", "mosquitto");
        int mqttPort = Integer.parseInt(getEnv("MQTT_PORT", "1883"));

        String dbHost = getEnv("DB_HOST", "timescaledb");
        String dbPort = getEnv("DB_PORT", "5432");
        String dbName = getEnv("DB_NAME", "energy_demo");
        String dbUser = getEnv("DB_USER", "yusuf");
        String dbPassword = getEnv("DB_PASSWORD", "energy123");
        String jdbcUrl = String.format("jdbc:postgresql://%s:%s/%s", dbHost, dbPort, dbName);

        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(1);

        DataStream<String> rawMessages = env.addSource(
                new MqttSourceFunction(mqttBroker, mqttPort, new String[]{"energy/+/electricity", "energy/+/gas"}),
                "mqtt-source");

        SingleOutputStreamOperator<EnergyReading> readings = rawMessages
                .flatMap(new EnergyReadingParser())
                .name("parse-and-filter")
                .assignTimestampsAndWatermarks(
                        WatermarkStrategy.<EnergyReading>forBoundedOutOfOrderness(Duration.ofSeconds(5))
                                .withTimestampAssigner((reading, ts) -> reading.getMeasuredAt().toEpochMilli()));

        // Raw readings -> existing tables
        readings.filter(r -> r.getReadingType() == ReadingType.ELECTRICITY)
                .name("filter-electricity")
                .addSink(new ElectricityReadingSink(jdbcUrl, dbUser, dbPassword))
                .name("electricity-sink");

        readings.filter(r -> r.getReadingType() == ReadingType.GAS)
                .name("filter-gas")
                .addSink(new GasReadingSink(jdbcUrl, dbUser, dbPassword))
                .name("gas-sink");

        // 1-minute tumbling window aggregation per household + device/usage_type
        DataStream<WindowAggregate> windowAggregates = readings
                .keyBy(EnergyReading::compositeKey)
                .window(TumblingEventTimeWindows.of(Time.minutes(1)))
                .aggregate(new WindowAggregator.Aggregate(), new WindowAggregator.ToWindowAggregate())
                .name("window-aggregate");

        windowAggregates
                .addSink(new WindowAggregateSink(jdbcUrl, dbUser, dbPassword))
                .name("window-aggregate-sink");

        // Anomaly detection: keyed moving average with side-output for deviations
        SingleOutputStreamOperator<EnergyReading> anomalyProcessed = readings
                .keyBy(EnergyReading::compositeKey)
                .process(new AnomalyDetector())
                .name("anomaly-detection");

        DataStream<AnomalyEvent> anomalies = anomalyProcessed.getSideOutput(AnomalyDetector.ANOMALY_TAG);
        anomalies
                .addSink(new AnomalySink(jdbcUrl, dbUser, dbPassword))
                .name("anomaly-sink");

        env.execute("Energy MQTT to TimescaleDB Job");
    }

    private static String getEnv(String key, String defaultValue) {
        String value = System.getenv(key);
        return (value == null || value.isEmpty()) ? defaultValue : value;
    }
}

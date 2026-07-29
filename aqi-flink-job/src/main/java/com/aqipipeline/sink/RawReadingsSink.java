package com.aqipipeline.sink;

import com.aqipipeline.model.AqiReading;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.sql.Types;

/**
 * Writes each individual reading to raw_readings - aqi-subscriber's previous
 * responsibility, restored here. Relies on a unique index on
 * (station_id, measured_at) for the ON CONFLICT dedup, since WAQI republishes
 * the same station/measured_at pair across multiple poll cycles whenever its
 * own upstream data hasn't refreshed yet.
 */
public class RawReadingsSink extends RichSinkFunction<AqiReading> {

    private static final Logger LOG = LoggerFactory.getLogger(RawReadingsSink.class);

    private final String jdbcUrl;
    private final String user;
    private final String password;

    private transient Connection connection;
    private transient PreparedStatement insertStmt;

    public RawReadingsSink(String jdbcUrl, String user, String password) {
        this.jdbcUrl = jdbcUrl;
        this.user = user;
        this.password = password;
    }

    @Override
    public void open(Configuration parameters) throws Exception {
        Class.forName("org.postgresql.Driver");
        connection = DriverManager.getConnection(jdbcUrl, user, password);
        insertStmt = connection.prepareStatement(
                "INSERT INTO raw_readings " +
                        "(station_id, measured_at, aqi, dominant, pm25, pm10, o3, no2, so2, co, temperature, humidity, wind) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
                        "ON CONFLICT (station_id, measured_at) DO NOTHING");
    }

    @Override
    public void invoke(AqiReading reading, Context context) {
        try {
            insertStmt.setInt(1, reading.getStationId());
            insertStmt.setTimestamp(2, Timestamp.from(reading.getMeasuredAt()));
            insertStmt.setInt(3, reading.getAqi());
            insertStmt.setString(4, reading.getDominant());
            setNullableDouble(5, reading.getPm25());
            setNullableDouble(6, reading.getPm10());
            setNullableDouble(7, reading.getO3());
            setNullableDouble(8, reading.getNo2());
            setNullableDouble(9, reading.getSo2());
            setNullableDouble(10, reading.getCo());
            setNullableDouble(11, reading.getTemperature());
            setNullableDouble(12, reading.getHumidity());
            setNullableDouble(13, reading.getWind());

            int inserted = insertStmt.executeUpdate();
            if (inserted > 0) {
                LOG.info("raw_readings ← station={} ({}) aqi={}",
                        reading.getStationId(), reading.getStationName(), reading.getAqi());
            } else {
                LOG.debug("Duplicate skipped: station={} measured_at={}",
                        reading.getStationId(), reading.getMeasuredAt());
            }
        } catch (Exception e) {
            LOG.error("Failed to insert raw reading for station {}: {}", reading.getStationId(), e.getMessage());
        }
    }

    private void setNullableDouble(int index, Double value) throws Exception {
        if (value != null) {
            insertStmt.setDouble(index, value);
        } else {
            insertStmt.setNull(index, Types.DOUBLE);
        }
    }

    @Override
    public void close() throws Exception {
        if (insertStmt != null) {
            insertStmt.close();
        }
        if (connection != null) {
            connection.close();
        }
    }
}

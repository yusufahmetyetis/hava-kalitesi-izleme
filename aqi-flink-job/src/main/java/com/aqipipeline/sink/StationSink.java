package com.aqipipeline.sink;

import com.aqipipeline.model.AqiReading;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;

/**
 * Keeps the "stations" table (id/name/lat/lng) alive now that aqi-subscriber -
 * the previous owner of that table - has been removed. Runs off the raw reading
 * stream, upstream of windowing/anomaly detection, so aqi_window_aggregates and
 * aqi_anomalies don't need to carry lat/lng themselves.
 */
public class StationSink extends RichSinkFunction<AqiReading> {

    private static final Logger LOG = LoggerFactory.getLogger(StationSink.class);

    private final String jdbcUrl;
    private final String user;
    private final String password;

    private transient Connection connection;

    public StationSink(String jdbcUrl, String user, String password) {
        this.jdbcUrl = jdbcUrl;
        this.user = user;
        this.password = password;
    }

    @Override
    public void open(Configuration parameters) throws Exception {
        Class.forName("org.postgresql.Driver");
        connection = DriverManager.getConnection(jdbcUrl, user, password);
    }

    @Override
    public void invoke(AqiReading reading, Context context) {
        try {
            StationUpsert.upsert(connection, reading.getStationId(), reading.getStationName(),
                    reading.getLat(), reading.getLng());
        } catch (Exception e) {
            LOG.error("Failed to upsert station {}: {}", reading.getStationId(), e.getMessage());
        }
    }

    @Override
    public void close() throws Exception {
        if (connection != null) {
            connection.close();
        }
    }
}

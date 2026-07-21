package com.aqipipeline.sink;

import com.aqipipeline.model.AnomalyEvent;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;

public class AnomalySink extends RichSinkFunction<AnomalyEvent> {

    private static final Logger LOG = LoggerFactory.getLogger(AnomalySink.class);

    private static final String CREATE_TABLE_SQL =
            "CREATE TABLE IF NOT EXISTS aqi_anomalies (" +
                    "id SERIAL PRIMARY KEY, " +
                    "station_id INTEGER NOT NULL, " +
                    "station_name TEXT, " +
                    "measured_at TIMESTAMPTZ NOT NULL, " +
                    "actual_aqi INTEGER NOT NULL, " +
                    "expected_aqi NUMERIC(6, 2) NOT NULL, " +
                    "deviation_pct NUMERIC(6, 2) NOT NULL, " +
                    "severity VARCHAR(8) NOT NULL, " +
                    "detected_at TIMESTAMPTZ NOT NULL DEFAULT now())";

    private final String jdbcUrl;
    private final String user;
    private final String password;

    private transient Connection connection;
    private transient PreparedStatement insertStmt;

    public AnomalySink(String jdbcUrl, String user, String password) {
        this.jdbcUrl = jdbcUrl;
        this.user = user;
        this.password = password;
    }

    @Override
    public void open(Configuration parameters) throws Exception {
        Class.forName("org.postgresql.Driver");
        connection = DriverManager.getConnection(jdbcUrl, user, password);
        try (Statement stmt = connection.createStatement()) {
            stmt.execute(CREATE_TABLE_SQL);
        }
        insertStmt = connection.prepareStatement(
                "INSERT INTO aqi_anomalies " +
                        "(station_id, station_name, measured_at, actual_aqi, expected_aqi, deviation_pct, severity) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?)");
    }

    @Override
    public void invoke(AnomalyEvent event, Context context) {
        try {
            insertStmt.setInt(1, event.getStationId());
            insertStmt.setString(2, event.getStationName());
            insertStmt.setTimestamp(3, Timestamp.from(event.getMeasuredAt()));
            insertStmt.setInt(4, event.getActualAqi());
            insertStmt.setDouble(5, event.getExpectedAqi());
            insertStmt.setDouble(6, event.getDeviationPct());
            insertStmt.setString(7, event.getSeverity());
            insertStmt.executeUpdate();
            LOG.info("Anomaly detected: station={} severity={} actual={} expected={} deviation={}%",
                    event.getStationId(), event.getSeverity(), event.getActualAqi(),
                    String.format("%.1f", event.getExpectedAqi()), String.format("%.1f", event.getDeviationPct()));
        } catch (Exception e) {
            LOG.error("Failed to insert anomaly for station {}: {}", event.getStationId(), e.getMessage());
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

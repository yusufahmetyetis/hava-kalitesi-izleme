package com.energydemo.sink;

import com.energydemo.model.AnomalyEvent;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.Map;

public class AnomalySink extends RichSinkFunction<AnomalyEvent> {

    private static final Logger LOG = LoggerFactory.getLogger(AnomalySink.class);

    private static final String CREATE_TABLE_SQL =
            "CREATE TABLE IF NOT EXISTS energy_anomalies (" +
                    "id SERIAL PRIMARY KEY, " +
                    "household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE, " +
                    "metric_key VARCHAR(50) NOT NULL, " +
                    "reading_type VARCHAR(11) NOT NULL, " +
                    "measured_at TIMESTAMP NOT NULL, " +
                    "actual_value NUMERIC(10, 4) NOT NULL, " +
                    "expected_value NUMERIC(10, 4) NOT NULL, " +
                    "deviation_pct NUMERIC(6, 2) NOT NULL, " +
                    "created_at TIMESTAMP DEFAULT now())";

    private final String jdbcUrl;
    private final String user;
    private final String password;

    private transient Connection connection;
    private transient PreparedStatement insertStmt;
    private transient Map<String, Integer> householdMap;

    public AnomalySink(String jdbcUrl, String user, String password) {
        this.jdbcUrl = jdbcUrl;
        this.user = user;
        this.password = password;
    }

    @Override
    public void open(Configuration parameters) throws Exception {
        connection = DriverManager.getConnection(jdbcUrl, user, password);
        try (Statement stmt = connection.createStatement()) {
            stmt.execute(CREATE_TABLE_SQL);
        }
        householdMap = HouseholdLookup.load(connection);
        insertStmt = connection.prepareStatement(
                "INSERT INTO energy_anomalies " +
                        "(household_id, metric_key, reading_type, measured_at, actual_value, expected_value, deviation_pct) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?)");
    }

    @Override
    public void invoke(AnomalyEvent event, Context context) {
        Integer householdId = householdMap.get(event.getHouseholdCode());
        if (householdId == null) {
            LOG.warn("Unknown household '{}', skipping anomaly event", event.getHouseholdCode());
            return;
        }
        try {
            insertStmt.setInt(1, householdId);
            insertStmt.setString(2, event.getMetricKey());
            insertStmt.setString(3, event.getReadingType().name());
            insertStmt.setTimestamp(4, Timestamp.from(event.getMeasuredAt()));
            insertStmt.setDouble(5, event.getActualValue());
            insertStmt.setDouble(6, event.getExpectedValue());
            insertStmt.setDouble(7, event.getDeviationPct());
            insertStmt.executeUpdate();
            LOG.info("Anomaly detected: {}/{} actual={} expected={} deviation={}%",
                    event.getHouseholdCode(), event.getMetricKey(), event.getActualValue(),
                    event.getExpectedValue(), String.format("%.1f", event.getDeviationPct()));
        } catch (Exception e) {
            LOG.error("Failed to insert anomaly for {}/{}: {}", event.getHouseholdCode(), event.getMetricKey(), e.getMessage());
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

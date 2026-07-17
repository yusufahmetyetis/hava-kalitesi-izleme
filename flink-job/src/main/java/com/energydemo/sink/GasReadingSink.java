package com.energydemo.sink;

import com.energydemo.model.EnergyReading;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.util.Map;

public class GasReadingSink extends RichSinkFunction<EnergyReading> {

    private static final Logger LOG = LoggerFactory.getLogger(GasReadingSink.class);

    private final String jdbcUrl;
    private final String user;
    private final String password;

    private transient Connection connection;
    private transient PreparedStatement insertStmt;
    private transient Map<String, Integer> householdMap;

    public GasReadingSink(String jdbcUrl, String user, String password) {
        this.jdbcUrl = jdbcUrl;
        this.user = user;
        this.password = password;
    }

    @Override
    public void open(Configuration parameters) throws Exception {
        connection = DriverManager.getConnection(jdbcUrl, user, password);
        householdMap = HouseholdLookup.load(connection);
        insertStmt = connection.prepareStatement(
                "INSERT INTO gas_readings (household_id, measured_at, usage_type, consumption_m3) " +
                        "VALUES (?, ?, ?, ?)");
    }

    @Override
    public void invoke(EnergyReading reading, Context context) {
        Integer householdId = householdMap.get(reading.getHouseholdCode());
        if (householdId == null) {
            LOG.warn("Unknown household '{}', skipping gas reading", reading.getHouseholdCode());
            return;
        }
        try {
            insertStmt.setInt(1, householdId);
            insertStmt.setTimestamp(2, Timestamp.from(reading.getMeasuredAt()));
            insertStmt.setString(3, reading.getMetricKey());
            insertStmt.setDouble(4, reading.getValue());
            insertStmt.executeUpdate();
        } catch (Exception e) {
            LOG.error("Failed to insert gas reading {}: {}", reading, e.getMessage());
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

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
import java.util.HashMap;
import java.util.Map;

public class ElectricityReadingSink extends RichSinkFunction<EnergyReading> {

    private static final Logger LOG = LoggerFactory.getLogger(ElectricityReadingSink.class);

    private final String jdbcUrl;
    private final String user;
    private final String password;

    private transient Connection connection;
    private transient PreparedStatement insertStmt;
    private transient Map<String, Integer> householdMap;

    public ElectricityReadingSink(String jdbcUrl, String user, String password) {
        this.jdbcUrl = jdbcUrl;
        this.user = user;
        this.password = password;
    }

    @Override
    public void open(Configuration parameters) throws Exception {
        connection = DriverManager.getConnection(jdbcUrl, user, password);
        householdMap = HouseholdLookup.load(connection);
        insertStmt = connection.prepareStatement(
                "INSERT INTO electricity_readings (household_id, measured_at, device, consumption_kwh, temperature_c) " +
                        "VALUES (?, ?, ?, ?, ?)");
    }

    @Override
    public void invoke(EnergyReading reading, Context context) {
        Integer householdId = householdMap.get(reading.getHouseholdCode());
        if (householdId == null) {
            LOG.warn("Unknown household '{}', skipping electricity reading", reading.getHouseholdCode());
            return;
        }
        try {
            insertStmt.setInt(1, householdId);
            insertStmt.setTimestamp(2, Timestamp.from(reading.getMeasuredAt()));
            insertStmt.setString(3, reading.getMetricKey());
            insertStmt.setDouble(4, reading.getValue());
            if (reading.getTemperatureC() != null) {
                insertStmt.setDouble(5, reading.getTemperatureC());
            } else {
                insertStmt.setNull(5, java.sql.Types.NUMERIC);
            }
            insertStmt.executeUpdate();
        } catch (Exception e) {
            LOG.error("Failed to insert electricity reading {}: {}", reading, e.getMessage());
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

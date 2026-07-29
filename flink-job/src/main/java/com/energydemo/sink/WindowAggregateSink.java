package com.energydemo.sink;

import com.energydemo.model.WindowAggregate;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.util.Map;

public class WindowAggregateSink extends RichSinkFunction<WindowAggregate> {

    private static final Logger LOG = LoggerFactory.getLogger(WindowAggregateSink.class);

    private final String jdbcUrl;
    private final String user;
    private final String password;

    private transient Connection connection;
    private transient PreparedStatement insertStmt;
    private transient Map<String, Integer> householdMap;

    public WindowAggregateSink(String jdbcUrl, String user, String password) {
        this.jdbcUrl = jdbcUrl;
        this.user = user;
        this.password = password;
    }

    @Override
    public void open(Configuration parameters) throws Exception {
        Class.forName("org.postgresql.Driver");
        connection = DriverManager.getConnection(jdbcUrl, user, password);
        householdMap = HouseholdLookup.load(connection);
        insertStmt = connection.prepareStatement(
                "INSERT INTO energy_window_aggregates " +
                        "(household_id, metric_key, reading_type, window_start, window_end, sum_consumption, avg_consumption, sample_count) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    }

    @Override
    public void invoke(WindowAggregate agg, Context context) {
        Integer householdId = householdMap.get(agg.getHouseholdCode());
        if (householdId == null) {
            LOG.warn("Unknown household '{}', skipping window aggregate", agg.getHouseholdCode());
            return;
        }
        try {
            insertStmt.setInt(1, householdId);
            insertStmt.setString(2, agg.getMetricKey());
            insertStmt.setString(3, agg.getReadingType().name());
            insertStmt.setTimestamp(4, Timestamp.from(agg.getWindowStart()));
            insertStmt.setTimestamp(5, Timestamp.from(agg.getWindowEnd()));
            insertStmt.setDouble(6, agg.getSumConsumption());
            insertStmt.setDouble(7, agg.getAvgConsumption());
            insertStmt.setLong(8, agg.getSampleCount());
            insertStmt.executeUpdate();
        } catch (Exception e) {
            LOG.error("Failed to insert window aggregate for {}/{}: {}", agg.getHouseholdCode(), agg.getMetricKey(), e.getMessage());
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

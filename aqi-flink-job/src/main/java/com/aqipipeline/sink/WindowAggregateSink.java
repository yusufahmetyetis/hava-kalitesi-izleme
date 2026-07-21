package com.aqipipeline.sink;

import com.aqipipeline.model.WindowAggregate;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;

public class WindowAggregateSink extends RichSinkFunction<WindowAggregate> {

    private static final Logger LOG = LoggerFactory.getLogger(WindowAggregateSink.class);

    private static final String CREATE_TABLE_SQL =
            "CREATE TABLE IF NOT EXISTS aqi_window_aggregates (" +
                    "id SERIAL PRIMARY KEY, " +
                    "station_id INTEGER NOT NULL, " +
                    "station_name TEXT, " +
                    "window_start TIMESTAMPTZ NOT NULL, " +
                    "window_end TIMESTAMPTZ NOT NULL, " +
                    "avg_aqi NUMERIC(6, 2) NOT NULL, " +
                    "avg_pm25 NUMERIC(6, 2), " +
                    "avg_pm10 NUMERIC(6, 2), " +
                    "max_aqi INTEGER NOT NULL, " +
                    "sample_count INTEGER NOT NULL, " +
                    "created_at TIMESTAMPTZ DEFAULT now())";

    private final String jdbcUrl;
    private final String user;
    private final String password;

    private transient Connection connection;
    private transient PreparedStatement insertStmt;

    public WindowAggregateSink(String jdbcUrl, String user, String password) {
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
                "INSERT INTO aqi_window_aggregates " +
                        "(station_id, station_name, window_start, window_end, avg_aqi, avg_pm25, avg_pm10, max_aqi, sample_count) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    }

    @Override
    public void invoke(WindowAggregate agg, Context context) {
        try {
            insertStmt.setInt(1, agg.getStationId());
            insertStmt.setString(2, agg.getStationName());
            insertStmt.setTimestamp(3, Timestamp.from(agg.getWindowStart()));
            insertStmt.setTimestamp(4, Timestamp.from(agg.getWindowEnd()));
            insertStmt.setDouble(5, agg.getAvgAqi());
            if (agg.getAvgPm25() != null) {
                insertStmt.setDouble(6, agg.getAvgPm25());
            } else {
                insertStmt.setNull(6, Types.NUMERIC);
            }
            if (agg.getAvgPm10() != null) {
                insertStmt.setDouble(7, agg.getAvgPm10());
            } else {
                insertStmt.setNull(7, Types.NUMERIC);
            }
            insertStmt.setInt(8, agg.getMaxAqi());
            insertStmt.setLong(9, agg.getSampleCount());
            insertStmt.executeUpdate();
        } catch (Exception e) {
            LOG.error("Failed to insert window aggregate for station {}: {}", agg.getStationId(), e.getMessage());
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

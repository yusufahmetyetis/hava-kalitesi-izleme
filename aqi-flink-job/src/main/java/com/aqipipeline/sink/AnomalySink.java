package com.aqipipeline.sink;

import com.aqipipeline.model.AnomalyEvent;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Timestamp;

public class AnomalySink extends RichSinkFunction<AnomalyEvent> {

    private static final Logger LOG = LoggerFactory.getLogger(AnomalySink.class);

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
        // Idempotent insert: ayni (station_id, measured_at) icin ikinci bir anomali satiri yazma.
        // Normalde tekillestirme MeasuredAtDeduplicator'da yapiliyor; bu WHERE NOT EXISTS, Flink
        // checkpointing kapali oldugundan job RESTART'inda dedup state sifirlanip ayni olcumun bir
        // kez daha gecebilecegi durumu yakalayan DB backstop'u. (aqi_anomalies detected_at ile
        // partitionlanmis bir hypertable oldugu icin (station_id, measured_at) UNIQUE index
        // konulamiyor - TimescaleDB unique index'in partition kolonunu icermesini sart kosar.)
        insertStmt = connection.prepareStatement(
                "INSERT INTO aqi_anomalies " +
                        "(station_id, station_name, measured_at, actual_aqi, expected_aqi, deviation_pct, severity) " +
                        "SELECT ?, ?, ?, ?, ?, ?, ? " +
                        "WHERE NOT EXISTS (SELECT 1 FROM aqi_anomalies WHERE station_id = ? AND measured_at = ?)");
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
            // WHERE NOT EXISTS parametreleri (idempotent insert backstop):
            insertStmt.setInt(8, event.getStationId());
            insertStmt.setTimestamp(9, Timestamp.from(event.getMeasuredAt()));
            insertStmt.executeUpdate();
            LOG.info("aqi_anomalies ⚠ station={} severity={} actual={} expected={} deviation={}%",
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

package com.aqipipeline.sink;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

/**
 * Shared station upsert used by every sink, since aqi-flink-job is now the only
 * writer to the aqi_db "stations" table (aqi-subscriber, which used to own this,
 * was removed).
 */
final class StationUpsert {

    private static final String UPSERT_SQL =
            "INSERT INTO stations (id, name, lat, lng) VALUES (?, ?, ?, ?) " +
                    "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, lat = EXCLUDED.lat, lng = EXCLUDED.lng";

    private StationUpsert() {
    }

    static void upsert(Connection connection, int stationId, String stationName, Double lat, Double lng) throws SQLException {
        try (PreparedStatement stmt = connection.prepareStatement(UPSERT_SQL)) {
            stmt.setInt(1, stationId);
            stmt.setString(2, stationName);
            if (lat != null) {
                stmt.setDouble(3, lat);
            } else {
                stmt.setNull(3, java.sql.Types.DOUBLE);
            }
            if (lng != null) {
                stmt.setDouble(4, lng);
            } else {
                stmt.setNull(4, java.sql.Types.DOUBLE);
            }
            stmt.executeUpdate();
        }
    }
}

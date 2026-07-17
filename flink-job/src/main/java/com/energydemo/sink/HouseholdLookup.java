package com.energydemo.sink;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;

/** Loads the household_code -> id mapping used by every sink to resolve foreign keys. */
final class HouseholdLookup {

    private HouseholdLookup() {
    }

    static Map<String, Integer> load(Connection connection) throws Exception {
        Map<String, Integer> map = new HashMap<>();
        try (Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT id, household_code FROM households")) {
            while (rs.next()) {
                map.put(rs.getString("household_code"), rs.getInt("id"));
            }
        }
        return map;
    }
}

package com.energydemo.parser;

import com.energydemo.model.EnergyReading;
import com.energydemo.model.ReadingType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.functions.FlatMapFunction;
import org.apache.flink.util.Collector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * Parses raw MQTT JSON payloads into EnergyReading. Malformed or unrecognized
 * payloads are logged and dropped rather than emitted - this is the filtering step.
 */
public class EnergyReadingParser implements FlatMapFunction<String, EnergyReading> {

    private static final Logger LOG = LoggerFactory.getLogger(EnergyReadingParser.class);

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public void flatMap(String raw, Collector<EnergyReading> out) {
        try {
            JsonNode node = MAPPER.readTree(raw);

            String householdCode = node.path("household_id").asText(null);
            String measuredAtText = node.path("measured_at").asText(null);
            if (householdCode == null || measuredAtText == null) {
                LOG.warn("Malformed message (missing household_id/measured_at): {}", raw);
                return;
            }

            java.time.Instant measuredAt = LocalDateTime.parse(measuredAtText).toInstant(ZoneOffset.UTC);
            Double temperatureC = node.hasNonNull("temperature_c") ? node.get("temperature_c").asDouble() : null;

            if (node.hasNonNull("consumption_kwh")) {
                String device = node.path("device").asText(null);
                if (device == null) {
                    LOG.warn("Malformed electricity message (missing device): {}", raw);
                    return;
                }
                out.collect(new EnergyReading(householdCode, measuredAt, ReadingType.ELECTRICITY,
                        device, node.get("consumption_kwh").asDouble(), temperatureC));
            } else if (node.hasNonNull("consumption_m3")) {
                String usageType = node.path("usage_type").asText(null);
                if (usageType == null) {
                    LOG.warn("Malformed gas message (missing usage_type): {}", raw);
                    return;
                }
                out.collect(new EnergyReading(householdCode, measuredAt, ReadingType.GAS,
                        usageType, node.get("consumption_m3").asDouble(), temperatureC));
            } else {
                LOG.warn("Unrecognized message (no consumption_kwh/consumption_m3): {}", raw);
            }
        } catch (Exception e) {
            LOG.warn("Failed to parse message '{}': {}", raw, e.getMessage());
        }
    }
}

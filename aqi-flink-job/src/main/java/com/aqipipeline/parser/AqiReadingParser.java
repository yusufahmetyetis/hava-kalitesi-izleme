package com.aqipipeline.parser;

import com.aqipipeline.model.AqiReading;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.functions.FlatMapFunction;
import org.apache.flink.util.Collector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.OffsetDateTime;

/**
 * Parses raw MQTT JSON payloads (WAQI feed, published by mqtt/publisher.py) into
 * AqiReading. Malformed or unrecognized payloads are logged and dropped rather
 * than emitted - this is the filtering step.
 */
public class AqiReadingParser implements FlatMapFunction<String, AqiReading> {

    private static final Logger LOG = LoggerFactory.getLogger(AqiReadingParser.class);

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public void flatMap(String raw, Collector<AqiReading> out) {
        try {
            JsonNode node = MAPPER.readTree(raw);

            if (!node.hasNonNull("station_id") || !node.hasNonNull("measured_at") || !node.hasNonNull("aqi")) {
                LOG.warn("Malformed message (missing station_id/measured_at/aqi): {}", raw);
                return;
            }

            int stationId = node.get("station_id").asInt();
            String stationName = node.path("station_name").asText(null);
            Instant measuredAt = OffsetDateTime.parse(node.get("measured_at").asText()).toInstant();
            int aqi = node.get("aqi").asInt();

            out.collect(new AqiReading(
                    stationId,
                    stationName,
                    node.hasNonNull("lat") ? node.get("lat").asDouble() : null,
                    node.hasNonNull("lng") ? node.get("lng").asDouble() : null,
                    measuredAt,
                    aqi,
                    node.path("dominant").asText(null),
                    node.hasNonNull("pm25") ? node.get("pm25").asDouble() : null,
                    node.hasNonNull("pm10") ? node.get("pm10").asDouble() : null,
                    node.hasNonNull("o3") ? node.get("o3").asDouble() : null,
                    node.hasNonNull("no2") ? node.get("no2").asDouble() : null,
                    node.hasNonNull("so2") ? node.get("so2").asDouble() : null,
                    node.hasNonNull("co") ? node.get("co").asDouble() : null,
                    node.hasNonNull("temperature") ? node.get("temperature").asDouble() : null,
                    node.hasNonNull("humidity") ? node.get("humidity").asDouble() : null,
                    node.hasNonNull("wind") ? node.get("wind").asDouble() : null));
        } catch (Exception e) {
            LOG.warn("Failed to parse message '{}': {}", raw, e.getMessage());
        }
    }
}

package com.energydemo.model;

import java.io.Serializable;
import java.time.Instant;

public class WindowAggregate implements Serializable {

    private final String householdCode;
    private final String metricKey;
    private final ReadingType readingType;
    private final Instant windowStart;
    private final Instant windowEnd;
    private final double sumConsumption;
    private final double avgConsumption;
    private final long sampleCount;

    public WindowAggregate(String householdCode, String metricKey, ReadingType readingType,
                            Instant windowStart, Instant windowEnd,
                            double sumConsumption, double avgConsumption, long sampleCount) {
        this.householdCode = householdCode;
        this.metricKey = metricKey;
        this.readingType = readingType;
        this.windowStart = windowStart;
        this.windowEnd = windowEnd;
        this.sumConsumption = sumConsumption;
        this.avgConsumption = avgConsumption;
        this.sampleCount = sampleCount;
    }

    public String getHouseholdCode() {
        return householdCode;
    }

    public String getMetricKey() {
        return metricKey;
    }

    public ReadingType getReadingType() {
        return readingType;
    }

    public Instant getWindowStart() {
        return windowStart;
    }

    public Instant getWindowEnd() {
        return windowEnd;
    }

    public double getSumConsumption() {
        return sumConsumption;
    }

    public double getAvgConsumption() {
        return avgConsumption;
    }

    public long getSampleCount() {
        return sampleCount;
    }
}

package com.energydemo.model;

import java.io.Serializable;
import java.time.Instant;

public class AnomalyEvent implements Serializable {

    private final String householdCode;
    private final String metricKey;
    private final ReadingType readingType;
    private final Instant measuredAt;
    private final double actualValue;
    private final double expectedValue;
    private final double deviationPct;

    public AnomalyEvent(String householdCode, String metricKey, ReadingType readingType,
                         Instant measuredAt, double actualValue, double expectedValue, double deviationPct) {
        this.householdCode = householdCode;
        this.metricKey = metricKey;
        this.readingType = readingType;
        this.measuredAt = measuredAt;
        this.actualValue = actualValue;
        this.expectedValue = expectedValue;
        this.deviationPct = deviationPct;
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

    public Instant getMeasuredAt() {
        return measuredAt;
    }

    public double getActualValue() {
        return actualValue;
    }

    public double getExpectedValue() {
        return expectedValue;
    }

    public double getDeviationPct() {
        return deviationPct;
    }
}

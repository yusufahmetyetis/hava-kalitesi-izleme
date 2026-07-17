package com.energydemo.model;

import java.io.Serializable;
import java.time.Instant;

public class EnergyReading implements Serializable {

    private String householdCode;
    private Instant measuredAt;
    private ReadingType readingType;
    private String metricKey;
    private double value;
    private Double temperatureC;

    public EnergyReading() {
    }

    public EnergyReading(String householdCode, Instant measuredAt, ReadingType readingType,
                          String metricKey, double value, Double temperatureC) {
        this.householdCode = householdCode;
        this.measuredAt = measuredAt;
        this.readingType = readingType;
        this.metricKey = metricKey;
        this.value = value;
        this.temperatureC = temperatureC;
    }

    public String getHouseholdCode() {
        return householdCode;
    }

    public Instant getMeasuredAt() {
        return measuredAt;
    }

    public ReadingType getReadingType() {
        return readingType;
    }

    public String getMetricKey() {
        return metricKey;
    }

    public double getValue() {
        return value;
    }

    public Double getTemperatureC() {
        return temperatureC;
    }

    public String compositeKey() {
        return householdCode + "|" + metricKey;
    }

    @Override
    public String toString() {
        return "EnergyReading{" +
                "householdCode='" + householdCode + '\'' +
                ", measuredAt=" + measuredAt +
                ", readingType=" + readingType +
                ", metricKey='" + metricKey + '\'' +
                ", value=" + value +
                '}';
    }
}

package com.aqipipeline.model;

import java.io.Serializable;
import java.time.Instant;

public class WindowAggregate implements Serializable {

    private int stationId;
    private String stationName;
    private Instant windowStart;
    private Instant windowEnd;
    private double avgAqi;
    private Double avgPm25;
    private Double avgPm10;
    private int maxAqi;
    private long sampleCount;

    public WindowAggregate() {
    }

    public WindowAggregate(int stationId, String stationName, Instant windowStart, Instant windowEnd,
                            double avgAqi, Double avgPm25, Double avgPm10, int maxAqi, long sampleCount) {
        this.stationId = stationId;
        this.stationName = stationName;
        this.windowStart = windowStart;
        this.windowEnd = windowEnd;
        this.avgAqi = avgAqi;
        this.avgPm25 = avgPm25;
        this.avgPm10 = avgPm10;
        this.maxAqi = maxAqi;
        this.sampleCount = sampleCount;
    }

    public int getStationId() {
        return stationId;
    }

    public String getStationName() {
        return stationName;
    }

    public Instant getWindowStart() {
        return windowStart;
    }

    public Instant getWindowEnd() {
        return windowEnd;
    }

    public double getAvgAqi() {
        return avgAqi;
    }

    public Double getAvgPm25() {
        return avgPm25;
    }

    public Double getAvgPm10() {
        return avgPm10;
    }

    public int getMaxAqi() {
        return maxAqi;
    }

    public long getSampleCount() {
        return sampleCount;
    }
}

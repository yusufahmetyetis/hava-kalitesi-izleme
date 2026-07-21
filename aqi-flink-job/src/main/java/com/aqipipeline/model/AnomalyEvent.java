package com.aqipipeline.model;

import java.io.Serializable;
import java.time.Instant;

public class AnomalyEvent implements Serializable {

    private int stationId;
    private String stationName;
    private Instant measuredAt;
    private int actualAqi;
    private double expectedAqi;
    private double deviationPct;
    private String severity;

    public AnomalyEvent() {
    }

    public AnomalyEvent(int stationId, String stationName, Instant measuredAt, int actualAqi,
                         double expectedAqi, double deviationPct, String severity) {
        this.stationId = stationId;
        this.stationName = stationName;
        this.measuredAt = measuredAt;
        this.actualAqi = actualAqi;
        this.expectedAqi = expectedAqi;
        this.deviationPct = deviationPct;
        this.severity = severity;
    }

    public int getStationId() {
        return stationId;
    }

    public String getStationName() {
        return stationName;
    }

    public Instant getMeasuredAt() {
        return measuredAt;
    }

    public int getActualAqi() {
        return actualAqi;
    }

    public double getExpectedAqi() {
        return expectedAqi;
    }

    public double getDeviationPct() {
        return deviationPct;
    }

    public String getSeverity() {
        return severity;
    }
}

package com.aqipipeline.model;

import java.io.Serializable;
import java.time.Instant;

public class AqiReading implements Serializable {

    private int stationId;
    private String stationName;
    private Double lat;
    private Double lng;
    private Instant measuredAt;
    private int aqi;
    private String dominant;
    private Double pm25;
    private Double pm10;
    private Double o3;
    private Double no2;
    private Double so2;
    private Double co;
    private Double temperature;
    private Double humidity;
    private Double wind;

    public AqiReading() {
    }

    public AqiReading(int stationId, String stationName, Double lat, Double lng, Instant measuredAt,
                       int aqi, String dominant, Double pm25, Double pm10, Double o3, Double no2,
                       Double so2, Double co, Double temperature, Double humidity, Double wind) {
        this.stationId = stationId;
        this.stationName = stationName;
        this.lat = lat;
        this.lng = lng;
        this.measuredAt = measuredAt;
        this.aqi = aqi;
        this.dominant = dominant;
        this.pm25 = pm25;
        this.pm10 = pm10;
        this.o3 = o3;
        this.no2 = no2;
        this.so2 = so2;
        this.co = co;
        this.temperature = temperature;
        this.humidity = humidity;
        this.wind = wind;
    }

    public int getStationId() {
        return stationId;
    }

    public String getStationName() {
        return stationName;
    }

    public Double getLat() {
        return lat;
    }

    public Double getLng() {
        return lng;
    }

    public Instant getMeasuredAt() {
        return measuredAt;
    }

    public int getAqi() {
        return aqi;
    }

    public String getDominant() {
        return dominant;
    }

    public Double getPm25() {
        return pm25;
    }

    public Double getPm10() {
        return pm10;
    }

    public Double getO3() {
        return o3;
    }

    public Double getNo2() {
        return no2;
    }

    public Double getSo2() {
        return so2;
    }

    public Double getCo() {
        return co;
    }

    public Double getTemperature() {
        return temperature;
    }

    public Double getHumidity() {
        return humidity;
    }

    public Double getWind() {
        return wind;
    }

    @Override
    public String toString() {
        return "AqiReading{" +
                "stationId=" + stationId +
                ", stationName='" + stationName + '\'' +
                ", measuredAt=" + measuredAt +
                ", aqi=" + aqi +
                ", dominant='" + dominant + '\'' +
                '}';
    }
}

from datetime import date, datetime

from pydantic import BaseModel


class ProcessedInfo(BaseModel):
    category: str | None
    is_anomaly: bool | None
    algo_version: str | None


class FilteredInfo(BaseModel):
    is_valid: bool | None
    validity_notes: str | None
    baseline_mean: float | None
    baseline_std: float | None
    z_score: float | None
    is_anomaly: bool | None
    algo_version: str | None


class LatestReadingOut(BaseModel):
    station_id: int
    station_name: str | None
    lat: float | None
    lng: float | None
    measured_at: datetime | None
    aqi: int | None
    dominant: str | None
    pm25: float | None
    pm10: float | None
    o3: float | None
    no2: float | None
    so2: float | None
    co: float | None
    temperature: float | None
    humidity: float | None
    wind: float | None
    processed: ProcessedInfo
    filtered: FilteredInfo


class HistoryPointOut(BaseModel):
    measured_at: datetime | None
    aqi: int | None
    category: str | None
    is_anomaly: bool | None
    is_valid: bool | None
    pm25: float | None
    pm10: float | None
    o3: float | None
    no2: float | None
    so2: float | None
    co: float | None
    temperature: float | None
    humidity: float | None
    wind: float | None


class AnomalyOut(BaseModel):
    station_id: int
    station_name: str | None
    measured_at: datetime | None
    aqi: int | None
    z_score: float | None
    baseline_mean: float | None
    baseline_std: float | None
    is_valid: bool | None
    validity_notes: str | None
    algo_version: str | None


class CalendarDayOut(BaseModel):
    day: date
    pm25_q1: float | None
    pm25_q2: float | None
    pm25_q3: float | None
    pm10_q1: float | None
    pm10_q2: float | None
    pm10_q3: float | None
    reading_count: int
    evaluated_count: int
    anomaly_count: int

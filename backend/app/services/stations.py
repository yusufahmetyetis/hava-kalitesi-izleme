from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from shared.models import FilteredReading, ProcessedReading, RawReading, Station

from ..schemas.reading import FilteredInfo, HistoryPointOut, LatestReadingOut, ProcessedInfo
from ..schemas.station import StationOut

RANGE_TO_TIMEDELTA = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
}


def list_stations(db: Session) -> list[StationOut]:
    stations = db.execute(select(Station).order_by(Station.id)).scalars().all()
    return [
        StationOut(id=s.id, name=s.name, lat=s.lat, lng=s.lng) for s in stations
    ]


def build_latest_reading(raw, processed, filtered, station_name, lat, lng) -> LatestReadingOut:
    return LatestReadingOut(
        station_id=raw.station_id,
        station_name=station_name,
        lat=lat,
        lng=lng,
        measured_at=raw.measured_at,
        aqi=raw.aqi,
        dominant=raw.dominant,
        pm25=raw.pm25,
        pm10=raw.pm10,
        o3=raw.o3,
        no2=raw.no2,
        so2=raw.so2,
        co=raw.co,
        temperature=raw.temperature,
        humidity=raw.humidity,
        wind=raw.wind,
        processed=ProcessedInfo(
            category=processed.category,
            is_anomaly=processed.is_anomaly,
            algo_version=processed.algo_version,
        ),
        filtered=FilteredInfo(
            is_valid=filtered.is_valid,
            validity_notes=filtered.validity_notes,
            baseline_mean=filtered.baseline_mean,
            baseline_std=filtered.baseline_std,
            z_score=filtered.z_score,
            is_anomaly=filtered.is_anomaly,
            algo_version=filtered.algo_version,
        ),
    )


def get_latest_for_station(db: Session, station_id: int) -> LatestReadingOut | None:
    row = db.execute(
        select(RawReading, ProcessedReading, FilteredReading, Station.name, Station.lat, Station.lng)
        .join(ProcessedReading, ProcessedReading.raw_id == RawReading.id)
        .join(FilteredReading, FilteredReading.raw_id == RawReading.id)
        .join(Station, Station.id == RawReading.station_id)
        .where(RawReading.station_id == station_id)
        .order_by(RawReading.measured_at.desc())
        .limit(1)
    ).first()
    if row is None:
        return None
    raw, processed, filtered, name, lat, lng = row
    return build_latest_reading(raw, processed, filtered, name, lat, lng)


def get_history(db: Session, station_id: int, range_: str) -> list[HistoryPointOut]:
    window_start = datetime.now(timezone.utc) - RANGE_TO_TIMEDELTA[range_]
    rows = db.execute(
        select(RawReading, ProcessedReading, FilteredReading)
        .join(ProcessedReading, ProcessedReading.raw_id == RawReading.id)
        .join(FilteredReading, FilteredReading.raw_id == RawReading.id)
        .where(
            RawReading.station_id == station_id,
            RawReading.measured_at >= window_start,
        )
        .order_by(RawReading.measured_at.asc())
    ).all()
    return [
        HistoryPointOut(
            measured_at=raw.measured_at,
            aqi=raw.aqi,
            category=processed.category,
            is_anomaly=processed.is_anomaly,
            is_valid=filtered.is_valid,
        )
        for raw, processed, filtered in rows
    ]

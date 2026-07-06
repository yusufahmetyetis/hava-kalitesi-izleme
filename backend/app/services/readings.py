from sqlalchemy import select
from sqlalchemy.orm import Session

from shared.models import FilteredReading, ProcessedReading, RawReading, Station

from ..schemas.reading import AnomalyOut, LatestReadingOut
from .stations import build_latest_reading


def get_all_latest(db: Session) -> list[LatestReadingOut]:
    rows = db.execute(
        select(RawReading, ProcessedReading, FilteredReading, Station.name, Station.lat, Station.lng)
        .distinct(RawReading.station_id)
        .join(ProcessedReading, ProcessedReading.raw_id == RawReading.id)
        .join(FilteredReading, FilteredReading.raw_id == RawReading.id)
        .join(Station, Station.id == RawReading.station_id)
        .order_by(RawReading.station_id, RawReading.measured_at.desc())
    ).all()
    return [
        build_latest_reading(raw, processed, filtered, name, lat, lng)
        for raw, processed, filtered, name, lat, lng in rows
    ]


def get_anomalies(db: Session, limit: int) -> list[AnomalyOut]:
    rows = db.execute(
        select(FilteredReading, RawReading.aqi, Station.name)
        .join(RawReading, RawReading.id == FilteredReading.raw_id)
        .join(Station, Station.id == FilteredReading.station_id)
        .where(FilteredReading.is_anomaly.is_(True))
        .order_by(FilteredReading.measured_at.desc())
        .limit(limit)
    ).all()
    return [
        AnomalyOut(
            station_id=filtered.station_id,
            station_name=name,
            measured_at=filtered.measured_at,
            aqi=aqi,
            z_score=filtered.z_score,
            baseline_mean=filtered.baseline_mean,
            baseline_std=filtered.baseline_std,
            is_valid=filtered.is_valid,
            validity_notes=filtered.validity_notes,
            algo_version=filtered.algo_version,
        )
        for filtered, aqi, name in rows
    ]

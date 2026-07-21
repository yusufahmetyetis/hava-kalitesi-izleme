from sqlalchemy import select
from sqlalchemy.orm import Session

from shared.models import AqiAnomaly, RawReading, Station

from ..schemas.reading import AnomalyOut, LatestReadingOut
from .stations import _anomaly_exists_subquery, build_latest_reading


def get_all_latest(db: Session) -> list[LatestReadingOut]:
    rows = db.execute(
        select(RawReading, _anomaly_exists_subquery(), Station.name, Station.lat, Station.lng)
        .distinct(RawReading.station_id)
        .join(Station, Station.id == RawReading.station_id)
        .order_by(RawReading.station_id, RawReading.measured_at.desc())
    ).all()
    return [
        build_latest_reading(raw, is_anomaly, name, lat, lng)
        for raw, is_anomaly, name, lat, lng in rows
    ]


def get_anomalies(db: Session, limit: int) -> list[AnomalyOut]:
    rows = db.execute(
        select(AqiAnomaly, Station.name)
        .join(Station, Station.id == AqiAnomaly.station_id)
        .order_by(AqiAnomaly.detected_at.desc())
        .limit(limit)
    ).all()
    return [
        AnomalyOut(
            station_id=anomaly.station_id,
            station_name=name,
            measured_at=anomaly.measured_at,
            actual_aqi=anomaly.actual_aqi,
            expected_aqi=anomaly.expected_aqi,
            deviation_pct=anomaly.deviation_pct,
            severity=anomaly.severity,
            detected_at=anomaly.detected_at,
        )
        for anomaly, name in rows
    ]

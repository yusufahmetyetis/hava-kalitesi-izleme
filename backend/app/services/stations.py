from datetime import datetime, timedelta, timezone

from sqlalchemy import Date, cast, exists, func, select
from sqlalchemy.orm import Session

from shared.aqi import category
from shared.models import AqiAnomaly, RawReading, Station

from ..schemas.reading import (
    CalendarDayOut,
    FilteredInfo,
    HistoryPointOut,
    LatestReadingOut,
    ProcessedInfo,
)
from ..schemas.station import StationOut

RANGE_TO_TIMEDELTA = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
}

# Aynı basit eşik processed_readings'te de kullanılıyordu (aqi > 150); artık
# processed_readings'e yazılmıyor ama kural değişmediği için aynen okunuyor.
LEGACY_ANOMALY_AQI_THRESHOLD = 150


def _anomaly_exists_subquery():
    # Fiziksel JOIN yerine EXISTS: aqi_anomalies'te (station_id, measured_at) üzerinde unique
    # constraint yok (raw_readings'ten farklı) — bir JOIN, olası bir mükerrer anomali satırında
    # raw_readings sonuçlarını çoğaltır (get_history'de tekrarlanan noktalar, get_calendar'da
    # şişmiş sayaçlar). EXISTS her zaman tek bir bool döner, çoğalma riski yok.
    return exists(
        select(AqiAnomaly.id).where(
            AqiAnomaly.station_id == RawReading.station_id,
            AqiAnomaly.measured_at == RawReading.measured_at,
        )
    )


def list_stations(db: Session) -> list[StationOut]:
    stations = db.execute(select(Station).order_by(Station.id)).scalars().all()
    return [
        StationOut(id=s.id, name=s.name, lat=s.lat, lng=s.lng) for s in stations
    ]


def build_latest_reading(raw, is_anomaly, station_name, lat, lng) -> LatestReadingOut:
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
            category=category(raw.aqi),
            is_anomaly=raw.aqi is not None and raw.aqi > LEGACY_ANOMALY_AQI_THRESHOLD,
            algo_version="v1",
        ),
        filtered=FilteredInfo(
            is_valid=None,
            validity_notes=None,
            baseline_mean=None,
            baseline_std=None,
            z_score=None,
            is_anomaly=is_anomaly,
            algo_version="ema_v1",
        ),
    )


def get_latest_for_station(db: Session, station_id: int) -> LatestReadingOut | None:
    row = db.execute(
        select(RawReading, _anomaly_exists_subquery(), Station.name, Station.lat, Station.lng)
        .join(Station, Station.id == RawReading.station_id)
        .where(RawReading.station_id == station_id)
        .order_by(RawReading.measured_at.desc())
        .limit(1)
    ).first()
    if row is None:
        return None
    raw, is_anomaly, name, lat, lng = row
    return build_latest_reading(raw, is_anomaly, name, lat, lng)


def get_history(db: Session, station_id: int, range_: str) -> list[HistoryPointOut]:
    window_start = datetime.now(timezone.utc) - RANGE_TO_TIMEDELTA[range_]
    rows = db.execute(
        select(RawReading, _anomaly_exists_subquery())
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
            category=category(raw.aqi),
            is_anomaly=is_anomaly,
            is_valid=None,
            pm25=raw.pm25,
            pm10=raw.pm10,
            o3=raw.o3,
            no2=raw.no2,
            so2=raw.so2,
            co=raw.co,
            temperature=raw.temperature,
            humidity=raw.humidity,
            wind=raw.wind,
        )
        for raw, is_anomaly in rows
    ]


def get_calendar(db: Session, station_id: int) -> list[CalendarDayOut]:
    # Günü İstanbul yerel gününe göre grupla.
    day_col = cast(
        func.timezone("Europe/Istanbul", RawReading.measured_at), Date
    ).label("day")
    is_anomaly_col = _anomaly_exists_subquery().label("is_anomaly")

    rows = db.execute(
        select(
            day_col,
            func.percentile_cont(0.25).within_group(RawReading.pm25.asc()),
            func.percentile_cont(0.5).within_group(RawReading.pm25.asc()),
            func.percentile_cont(0.75).within_group(RawReading.pm25.asc()),
            func.percentile_cont(0.25).within_group(RawReading.pm10.asc()),
            func.percentile_cont(0.5).within_group(RawReading.pm10.asc()),
            func.percentile_cont(0.75).within_group(RawReading.pm10.asc()),
            func.count().label("reading_count"),
            # aqi_anomalies (canlı EMA dedektörü) filtered_readings'teki gibi her okuma için
            # bir satır tutmuyor, sadece gerçek anomalileri - "değerlendirilen" kavramı artık
            # "okunan" ile aynı (her ham okuma Flink'te anomali dedektöründen geçiyor).
            func.count().label("evaluated_count"),
            func.count().filter(is_anomaly_col).label("anomaly_count"),
        )
        .where(RawReading.station_id == station_id)
        .group_by(day_col)
        .order_by(day_col.asc())
    ).all()

    return [
        CalendarDayOut(
            day=row[0],
            pm25_q1=row[1],
            pm25_q2=row[2],
            pm25_q3=row[3],
            pm10_q1=row[4],
            pm10_q2=row[5],
            pm10_q3=row[6],
            reading_count=row[7],
            evaluated_count=row[8],
            anomaly_count=row[9],
        )
        for row in rows
    ]

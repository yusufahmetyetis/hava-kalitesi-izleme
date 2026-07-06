from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from shared.models import FilteredReading, ProcessedReading, RawReading, Station

ALGO_VERSION = "v1"
FILTER_ALGO_VERSION = "zscore_v1"
BASELINE_WINDOW_HOURS = 24
BASELINE_MIN_COUNT = 5
ANOMALY_Z_THRESHOLD = 2.0
POLLUTANT_KEYS = ("pm25", "pm10", "o3", "no2", "so2", "co")


def category(aqi):
    if aqi is None:
        return "Bilinmiyor"
    if aqi <= 50:
        return "İyi"
    if aqi <= 100:
        return "Orta"
    if aqi <= 150:
        return "Hassas Gruplar İçin Sağlıksız"
    if aqi <= 200:
        return "Sağlıksız"
    return "Çok Sağlıksız"


def is_duplicate(session, payload: dict) -> bool:
    last_measured_at = session.execute(
        select(func.max(RawReading.measured_at)).where(
            RawReading.station_id == payload["station_id"]
        )
    ).scalar()
    if last_measured_at is None:
        return False
    new_measured_at = datetime.fromisoformat(payload["measured_at"])
    return new_measured_at == last_measured_at


def validate_reading(payload: dict) -> tuple[bool, str]:
    notes = []

    aqi = payload.get("aqi")
    if aqi is None or not (0 <= aqi <= 500):
        notes.append(f"aqi aralık dışı: {aqi}")

    for key in POLLUTANT_KEYS:
        value = payload.get(key)
        if value is not None and value < 0:
            notes.append(f"{key} negatif: {value}")

    if not payload.get("dominant"):
        notes.append("dominant boş")

    return (len(notes) == 0, "; ".join(notes))


def compute_baseline(session, station_id: int, measured_at: datetime):
    window_start = measured_at - timedelta(hours=BASELINE_WINDOW_HOURS)
    mean, std, count = session.execute(
        select(
            func.avg(RawReading.aqi),
            func.stddev(RawReading.aqi),
            func.count(RawReading.aqi),
        ).where(
            RawReading.station_id == station_id,
            RawReading.measured_at >= window_start,
            RawReading.measured_at < measured_at,
        )
    ).one()
    return mean, std, count


def filter_reading(session, raw: RawReading, payload: dict) -> FilteredReading:
    is_valid, validity_notes = validate_reading(payload)

    baseline_mean, baseline_std, count = compute_baseline(
        session, raw.station_id, raw.measured_at
    )

    is_anomaly = None
    z_score = None
    if count >= BASELINE_MIN_COUNT and baseline_std:
        z_score = (raw.aqi - baseline_mean) / baseline_std
        is_anomaly = abs(z_score) > ANOMALY_Z_THRESHOLD

    filtered = FilteredReading(
        raw_id=raw.id,
        station_id=raw.station_id,
        measured_at=raw.measured_at,
        baseline_mean=baseline_mean,
        baseline_std=baseline_std,
        z_score=z_score,
        is_anomaly=is_anomaly,
        is_valid=is_valid,
        validity_notes=validity_notes,
        algo_version=FILTER_ALGO_VERSION,
    )
    session.add(filtered)
    return filtered


def upsert_station(session, payload: dict) -> None:
    stmt = pg_insert(Station).values(
        id=payload["station_id"],
        name=payload["station_name"],
        lat=payload.get("lat"),
        lng=payload.get("lng"),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[Station.id],
        set_={
            "name": stmt.excluded.name,
            "lat": stmt.excluded.lat,
            "lng": stmt.excluded.lng,
        },
    )
    session.execute(stmt)


def save_raw_reading(session, payload: dict) -> RawReading:
    raw = RawReading(
        station_id=payload["station_id"],
        station_name=payload["station_name"],
        measured_at=datetime.fromisoformat(payload["measured_at"]),
        pm25=payload.get("pm25"),
        pm10=payload.get("pm10"),
        o3=payload.get("o3"),
        no2=payload.get("no2"),
        so2=payload.get("so2"),
        co=payload.get("co"),
        temperature=payload.get("temperature"),
        humidity=payload.get("humidity"),
        wind=payload.get("wind"),
        aqi=payload.get("aqi"),
        dominant=payload.get("dominant"),
        raw_payload=payload,
    )
    session.add(raw)
    session.flush()  # raw.id'yi almak için
    return raw


def process_reading(session, raw: RawReading) -> ProcessedReading:
    aqi = raw.aqi
    is_anomaly = aqi is not None and aqi > 150
    processed = ProcessedReading(
        raw_id=raw.id,
        station_id=raw.station_id,
        measured_at=raw.measured_at,
        computed_aqi=aqi,
        category=category(aqi),
        is_anomaly=is_anomaly,
        algo_version=ALGO_VERSION,
    )
    session.add(processed)
    return processed


def save_reading(session, payload: dict) -> None:
    if is_duplicate(session, payload):
        print(f"  Aynı ölçüm, atlandı: {payload['station_name']:30s}")
        return

    upsert_station(session, payload)
    raw = save_raw_reading(session, payload)
    processed = process_reading(session, raw)
    filter_reading(session, raw, payload)
    session.commit()
    print(
        f"  Kaydedildi: {payload['station_name']:30s} "
        f"AQI={processed.computed_aqi} ({processed.category})"
    )

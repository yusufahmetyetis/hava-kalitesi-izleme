from sqlalchemy.dialects.postgresql import insert as pg_insert

from .models import ProcessedReading, RawReading, Station

ALGO_VERSION = "v1"


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
        measured_at=payload.get("measured_at"),
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
    upsert_station(session, payload)
    raw = save_raw_reading(session, payload)
    processed = process_reading(session, raw)
    session.commit()
    print(
        f"  Kaydedildi: {payload['station_name']:30s} "
        f"AQI={processed.computed_aqi} ({processed.category})"
    )

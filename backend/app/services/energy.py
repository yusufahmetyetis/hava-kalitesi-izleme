from sqlalchemy import text
from sqlalchemy.orm import Session

from ..schemas.energy import (
    AqiCorrelationPointOut,
    ElectricityReadingOut,
    EnergyAnomalyOut,
    HouseholdOut,
)


def list_households(energy_db: Session) -> list[HouseholdOut]:
    rows = energy_db.execute(
        text(
            """
            SELECT id, household_code, description, person_count, home_type,
                   district, neighborhood, has_ac, has_electric_oven, has_gas_boiler
            FROM households
            ORDER BY id
            """
        )
    ).mappings()
    return [HouseholdOut(**row) for row in rows]


def get_recent_readings(energy_db: Session, household_code: str) -> list[ElectricityReadingOut]:
    rows = energy_db.execute(
        text(
            """
            SELECT er.measured_at, er.device, er.consumption_kwh
            FROM electricity_readings er
            JOIN households h ON h.id = er.household_id
            WHERE h.household_code = :code
              AND er.measured_at >= now() - interval '24 hours'
            ORDER BY er.measured_at
            """
        ),
        {"code": household_code},
    ).mappings()
    return [ElectricityReadingOut(**row) for row in rows]


def get_anomalies(energy_db: Session, limit: int) -> list[EnergyAnomalyOut]:
    rows = energy_db.execute(
        text(
            """
            SELECT h.household_code, ea.metric_key, ea.reading_type, ea.measured_at,
                   ea.actual_value, ea.expected_value, ea.deviation_pct
            FROM energy_anomalies ea
            JOIN households h ON h.id = ea.household_id
            ORDER BY ea.measured_at DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    ).mappings()
    return [EnergyAnomalyOut(**row) for row in rows]


def get_aqi_correlation(energy_db: Session, aqi_db: Session) -> list[AqiCorrelationPointOut]:
    # electricity_readings (energy_demo) ve raw_readings (aqi_db) ayrı veritabanlarında
    # yaşıyor; PostgreSQL'de cross-database JOIN mümkün değil. Bu yüzden iki saatlik
    # agregasyon ayrı ayrı DB'de hesaplanır, sonuçlar burada saat anahtarına göre birleştirilir.
    energy_rows = energy_db.execute(
        text(
            """
            SELECT time_bucket('1 hour', measured_at) AS hour,
                   avg(consumption_kwh) AS avg_consumption_kwh
            FROM electricity_readings
            WHERE measured_at >= now() - interval '24 hours'
            GROUP BY 1
            ORDER BY 1
            """
        )
    ).mappings()

    aqi_rows = aqi_db.execute(
        text(
            """
            SELECT time_bucket('1 hour', measured_at) AS hour,
                   avg(aqi) AS avg_aqi
            FROM raw_readings
            WHERE measured_at >= now() - interval '24 hours'
            GROUP BY 1
            ORDER BY 1
            """
        )
    ).mappings()

    # energy_demo.measured_at TIMESTAMP (naive), aqi_db.measured_at TIMESTAMPTZ (aware) —
    # aynı anahtar altında birleştirebilmek için ikisini de naive'e indirgiyoruz.
    def naive(dt):
        return dt.replace(tzinfo=None) if dt.tzinfo is not None else dt

    by_hour: dict = {}
    for row in energy_rows:
        by_hour.setdefault(naive(row["hour"]), {})["avg_consumption_kwh"] = row[
            "avg_consumption_kwh"
        ]
    for row in aqi_rows:
        by_hour.setdefault(naive(row["hour"]), {})["avg_aqi"] = row["avg_aqi"]

    return [
        AqiCorrelationPointOut(
            hour=hour,
            avg_consumption_kwh=values.get("avg_consumption_kwh"),
            avg_aqi=values.get("avg_aqi"),
        )
        for hour, values in sorted(by_hour.items())
    ]

import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "dbname": os.getenv("DB_NAME", "airquality"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
}

con = psycopg2.connect(**DB_CONFIG)
cur = con.cursor()

cur.execute("""
    CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY,
        name TEXT,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION
    );

    CREATE TABLE IF NOT EXISTS raw_readings (
        id BIGSERIAL PRIMARY KEY,
        station_id INTEGER REFERENCES stations(id),
        station_name TEXT,
        measured_at TIMESTAMPTZ,
        ingested_at TIMESTAMPTZ DEFAULT now(),
        pm25 DOUBLE PRECISION,
        pm10 DOUBLE PRECISION,
        o3   DOUBLE PRECISION,
        no2  DOUBLE PRECISION,
        so2  DOUBLE PRECISION,
        co   DOUBLE PRECISION,
        temperature DOUBLE PRECISION,
        humidity    DOUBLE PRECISION,
        wind        DOUBLE PRECISION,
        aqi INTEGER,
        dominant TEXT,
        raw_payload JSONB
    );

    CREATE TABLE IF NOT EXISTS processed_readings (
        id BIGSERIAL PRIMARY KEY,
        raw_id BIGINT REFERENCES raw_readings(id),
        station_id INTEGER,
        measured_at TIMESTAMPTZ,
        computed_aqi INTEGER,
        category TEXT,
        is_anomaly BOOLEAN,
        algo_version TEXT,
        processed_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_raw_station_time
        ON raw_readings (station_id, measured_at);
""")

con.commit()
cur.close()
con.close()
print("PostgreSQL tabloları oluşturuldu.")
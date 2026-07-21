-- aqi_db schema, generated from shared/models.py (SQLAlchemy ORM)
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS stations (
    id INTEGER PRIMARY KEY,
    name TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS raw_readings (
    id BIGSERIAL,
    station_id INTEGER REFERENCES stations(id),
    station_name TEXT,
    measured_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ DEFAULT now(),
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    o3 DOUBLE PRECISION,
    no2 DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    co DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    wind DOUBLE PRECISION,
    aqi INTEGER,
    dominant TEXT,
    raw_payload JSONB,
    PRIMARY KEY (id, measured_at)
);

CREATE TABLE IF NOT EXISTS processed_readings (
    id BIGSERIAL,
    raw_id BIGINT,
    station_id INTEGER,
    measured_at TIMESTAMPTZ NOT NULL,
    computed_aqi INTEGER,
    category TEXT,
    is_anomaly BOOLEAN,
    algo_version TEXT,
    processed_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (id, measured_at)
);

CREATE TABLE IF NOT EXISTS filtered_readings (
    id BIGSERIAL PRIMARY KEY,
    raw_id BIGINT,
    station_id INTEGER,
    measured_at TIMESTAMPTZ,
    baseline_mean DOUBLE PRECISION,
    baseline_std DOUBLE PRECISION,
    z_score DOUBLE PRECISION,
    is_anomaly BOOLEAN,
    is_valid BOOLEAN,
    validity_notes TEXT,
    algo_version TEXT,
    filtered_at TIMESTAMPTZ DEFAULT now()
);

SELECT create_hypertable('raw_readings', 'measured_at', if_not_exists => TRUE);
SELECT create_hypertable('processed_readings', 'measured_at', if_not_exists => TRUE);

-- kept identical to the CREATE_TABLE_SQL in aqi-flink-job's WindowAggregateSink.java
CREATE TABLE IF NOT EXISTS aqi_window_aggregates (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL,
    station_name TEXT,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    avg_aqi NUMERIC(6, 2) NOT NULL,
    avg_pm25 NUMERIC(6, 2),
    avg_pm10 NUMERIC(6, 2),
    max_aqi INTEGER NOT NULL,
    sample_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- kept identical to the CREATE_TABLE_SQL in aqi-flink-job's AnomalySink.java
CREATE TABLE IF NOT EXISTS aqi_anomalies (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL,
    station_name TEXT,
    measured_at TIMESTAMPTZ NOT NULL,
    actual_aqi INTEGER NOT NULL,
    expected_aqi NUMERIC(6, 2) NOT NULL,
    deviation_pct NUMERIC(6, 2) NOT NULL,
    severity VARCHAR(8) NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

SELECT create_hypertable('aqi_window_aggregates', 'window_start', if_not_exists => TRUE);
SELECT create_hypertable('aqi_anomalies', 'detected_at', if_not_exists => TRUE);

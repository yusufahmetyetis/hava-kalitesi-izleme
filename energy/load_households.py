import csv
import os

import psycopg2

DB_HOST = os.getenv("DB_HOST", "timescaledb")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "energy_demo")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

CSV_PATH = os.getenv("CSV_PATH", "/app/energy-demo/db_households.csv")

BOOL_COLUMNS = {"has_ac", "has_electric_oven", "has_gas_boiler"}
INT_COLUMNS = {
    "person_count",
    "washing_machine_freq_days",
    "dishwasher_freq_days",
    "daily_shower_count",
    "daily_cooking_sessions",
}
FLOAT_COLUMNS = {"latitude", "longitude", "daytime_occupancy_rate", "evening_occupancy_rate"}

COLUMNS = [
    "household_code",
    "description",
    "person_count",
    "home_type",
    "district",
    "neighborhood",
    "latitude",
    "longitude",
    "has_ac",
    "has_electric_oven",
    "has_gas_boiler",
    "washing_machine_freq_days",
    "dishwasher_freq_days",
    "daytime_occupancy_rate",
    "evening_occupancy_rate",
    "daily_shower_count",
    "daily_cooking_sessions",
]


def parse_value(column, raw):
    if raw == "":
        return None
    if column in BOOL_COLUMNS:
        return raw.strip().lower() == "true"
    if column in INT_COLUMNS:
        return int(raw)
    if column in FLOAT_COLUMNS:
        return float(raw)
    return raw


def main():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
    )
    cur = conn.cursor()

    # 02_energy_schema.sql artık 5 demo hanesini seed'liyor (yoksa sink'ler "Unknown
    # household" deyip her okumayı atıyordu). DO NOTHING kalsaydı gerçek CSV o seed
    # satırlarını hiçbir zaman geçemez, sessizce yok sayılırdı — bu yüzden upsert:
    # CSV eldeyse seed'in boş bıraktığı zengin alanları doldurur.
    updatable = [c for c in COLUMNS if c != "household_code"]
    insert_sql = f"""
        INSERT INTO households ({', '.join(COLUMNS)})
        VALUES ({', '.join(['%s'] * len(COLUMNS))})
        ON CONFLICT (household_code) DO UPDATE SET
        {', '.join(f'{c} = EXCLUDED.{c}' for c in updatable)}
    """

    # upsert olduğu için rowcount hem yeni satırı hem güncellenen satırı sayar
    affected = 0
    for row in rows:
        values = [parse_value(col, row[col]) for col in COLUMNS]
        cur.execute(insert_sql, values)
        affected += cur.rowcount

    conn.commit()
    cur.close()
    conn.close()
    print(f"{len(rows)} satır okundu, {affected} satır eklendi/güncellendi.")


if __name__ == "__main__":
    main()

import json
import psycopg2
import paho.mqtt.client as mqtt

DB_CONFIG = {
    "host": "localhost", "port": 5432, "dbname": "airquality",
    "user": "postgres", "password": "yusuf123",
}

def category(aqi):
    if aqi is None:  return "Bilinmiyor"
    if aqi <= 50:    return "İyi"
    if aqi <= 100:   return "Orta"
    if aqi <= 150:   return "Hassas Gruplar İçin Sağlıksız"
    if aqi <= 200:   return "Sağlıksız"
    return "Çok Sağlıksız"

def on_connect(client, userdata, flags, rc):
    print("Broker'a bağlandı, dinleniyor: air_quality/#")
    client.subscribe("air_quality/#")

def on_message(client, userdata, msg):
    try:
        d = json.loads(msg.payload.decode())
        con = psycopg2.connect(**DB_CONFIG)
        cur = con.cursor()

        cur.execute("""
            INSERT INTO stations (id, name, lat, lng) VALUES (%s,%s,%s,%s)
            ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                lat=EXCLUDED.lat, lng=EXCLUDED.lng
        """, (d["station_id"], d["station_name"], d.get("lat"), d.get("lng")))

        cur.execute("""
            INSERT INTO raw_readings
            (station_id, station_name, measured_at, pm25, pm10, o3, no2, so2, co,
             temperature, humidity, wind, aqi, dominant, raw_payload)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
        """, (d["station_id"], d["station_name"], d.get("measured_at"),
              d.get("pm25"), d.get("pm10"), d.get("o3"), d.get("no2"),
              d.get("so2"), d.get("co"), d.get("temperature"),
              d.get("humidity"), d.get("wind"), d.get("aqi"), d.get("dominant"),
              json.dumps(d, ensure_ascii=False)))
        raw_id = cur.fetchone()[0]

        aqi = d.get("aqi")
        is_anomaly = aqi is not None and aqi > 150
        cur.execute("""
            INSERT INTO processed_readings
            (raw_id, station_id, measured_at, computed_aqi, category,
             is_anomaly, algo_version)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (raw_id, d["station_id"], d.get("measured_at"), aqi,
              category(aqi), is_anomaly, "v1"))

        con.commit()
        cur.close()
        con.close()
        print(f"  Kaydedildi: {d['station_name']:30s} AQI={aqi} ({category(aqi)})")
    except Exception as e:
        print(f"  !!! HATA (mesaj atlandı): {e}")

def main():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect("localhost", 1883, 60)
    client.loop_forever()

if __name__ == "__main__":
    main()
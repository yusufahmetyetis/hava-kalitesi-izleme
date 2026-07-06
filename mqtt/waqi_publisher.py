import requests
import json
import time
import paho.mqtt.client as mqtt

TOKEN = "ccb69fcb6ef495793cfbc9e5aa342cf5d53e5d3e"
BROKER, PORT = "localhost", 1883
POLL_SECONDS = 300   # 5 dakika
SEARCH_URL = f"https://api.waqi.info/search/?token={TOKEN}&keyword=istanbul"
FEED_URL   = "https://api.waqi.info/feed/@{uid}/?token=" + TOKEN

def get_istanbul_stations():
    """İstanbul istasyonlarinin uid listesini al."""
    data = requests.get(SEARCH_URL, timeout=15).json()
    if data.get("status") != "ok":
        raise RuntimeError(f"Arama hatası: {data}")
    return [st["uid"] for st in data["data"]]

def get_station_feed(uid):
    """Bir istasyonun anlik verisini al."""
    return requests.get(FEED_URL.format(uid=uid), timeout=15).json()

def build_message(feed):
    """WAQI feed -> temiz düz mesaj."""
    d = feed["data"]
    iaqi = d.get("iaqi", {})
    def val(key):
        return iaqi.get(key, {}).get("v")   # {"v": x} -> x
    geo = d.get("city", {}).get("geo", [None, None])
    return {
        "station_id": d.get("idx"),
        "station_name": d.get("city", {}).get("name", "").replace(", Turkey", ""),
        "lat": geo[0],   # WAQI'de [lat, lng]
        "lng": geo[1],
        "measured_at": d.get("time", {}).get("iso"),
        "aqi": d.get("aqi"),
        "dominant": d.get("dominentpol"),
        "pm25": val("pm25"), "pm10": val("pm10"),
        "o3": val("o3"), "no2": val("no2"),
        "so2": val("so2"), "co": val("co"),
        "temperature": val("t"), "humidity": val("h"), "wind": val("w"),
    }

def main():
    client = mqtt.Client()
    client.connect(BROKER, PORT, 60)
    client.loop_start()
    print(f"Broker'a bağlandı: {BROKER}:{PORT}")

    while True:
        try:
            uids = get_istanbul_stations()
            print(f"\n{len(uids)} İstanbul istasyonu çekiliyor...")
            for uid in uids:
                try:
                    feed = get_station_feed(uid)
                    if feed.get("status") != "ok":
                        continue
                    msg = build_message(feed)
                    if msg["aqi"] in (None, "-"):   # bazen "-" gelir
                        continue
                    client.publish(f"air_quality/{msg['station_id']}",
                                   json.dumps(msg, ensure_ascii=False))
                    print(f"  -> {msg['station_name']:30s} AQI={msg['aqi']} "
                          f"T={msg['temperature']}°C")
                except Exception as e:
                    print(f"  !!! uid={uid} hata: {e}")
            print(f"\nTur bitti. {POLL_SECONDS} sn bekleniyor...")
            time.sleep(POLL_SECONDS)
        except KeyboardInterrupt:
            print("\nDurduruldu.")
            break
        except Exception as e:
            print(f"Tur hatasi: {e}. 30 sn sonra tekrar.")
            time.sleep(30)

    client.loop_stop()
    client.disconnect()

if __name__ == "__main__":
    main()
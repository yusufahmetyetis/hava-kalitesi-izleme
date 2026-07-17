import os
os.environ["PYTHONUNBUFFERED"] = "1"
import json
import time
import random
import math
from datetime import datetime
import paho.mqtt.client as mqtt

BROKER = "mosquitto"
PORT = 1883

HOUSEHOLDS = [
    {"id": "HANE_001", "person_count": 2, "has_ac": False},
    {"id": "HANE_002", "person_count": 4, "has_ac": True},
    {"id": "HANE_003", "person_count": 1, "has_ac": False},
    {"id": "HANE_004", "person_count": 5, "has_ac": True},
    {"id": "HANE_005", "person_count": 3, "has_ac": False},
]

DEVICES = ["buzdolabi", "modem_router", "aydinlatma", "televizyon", "bilgisayar_pc", "vantilator", "klima", "camasir_makinesi"]

def get_temperature(hour):
    return 28 + 5.5 * math.sin((hour - 9) / 24 * 2 * math.pi) + random.uniform(-1, 1)

def simulate_electricity(hh, hour, temp):
    readings = []
    # Surekli cihazlar
    readings.append({"device": "buzdolabi", "consumption_kwh": round(random.uniform(0.045, 0.09) + max(0, (temp - 28)) * 0.004, 4)})
    readings.append({"device": "modem_router", "consumption_kwh": round(random.uniform(0.006, 0.010), 4)})

    # Evde olma durumuna gore
    if (6 <= hour <= 23):
        if random.random() < 0.7:
            readings.append({"device": "televizyon", "consumption_kwh": round(random.uniform(0.08, 0.15), 4)})
        if random.random() < 0.4:
            readings.append({"device": "bilgisayar_pc", "consumption_kwh": round(random.uniform(0.12, 0.28), 4)})
        if 19 <= hour <= 23:
            readings.append({"device": "aydinlatma", "consumption_kwh": round(random.uniform(0.10, 0.55) * hh["person_count"] / 3, 4)})

    # Klima / vantilator
    heat_factor = max(0, (temp - 27) / 8)
    if 11 <= hour <= 23 and heat_factor > 0:
        if hh["has_ac"] and random.random() < min(0.85, 0.25 + heat_factor):
            readings.append({"device": "klima", "consumption_kwh": round(random.uniform(0.9, 1.5), 4)})
        elif not hh["has_ac"] and random.random() < min(0.9, 0.35 + heat_factor):
            readings.append({"device": "vantilator", "consumption_kwh": round(random.uniform(0.045, 0.075), 4)})

    return readings

def simulate_gas(hh, hour):
    readings = []
    # Dus: sabah 07-09, aksam 19-22
    if hour in (7, 8, 20, 21) and random.random() < 0.4 * hh["person_count"] / 3:
        readings.append({"usage_type": "banyo_dus", "consumption_m3": round(random.uniform(0.25, 0.55), 3)})
    # Pisirme: 08, 13, 19
    if hour in (8, 13, 19) and random.random() < 0.6:
        base = 0.35 if hour == 19 else (0.22 if hour == 13 else 0.12)
        readings.append({"usage_type": "mutfak_pisirme", "consumption_m3": round(random.uniform(base * 0.7, base * 1.3), 3)})
    return readings

def main():
    client = mqtt.Client()
    # Broker hazir olana kadar bekle
    connected = False
    while not connected:
        try:
            client.connect(BROKER, PORT, 60)
            connected = True
        except Exception:
            print("Broker beklenıyor...")
            time.sleep(3)

    print("MQTT baglantisi kuruldu, veri gonderiliyor...")
    client.loop_start()

    while True:
        now = datetime.utcnow()
        hour = now.hour
        temp = get_temperature(hour)

        for hh in HOUSEHOLDS:
            # Elektrik
            for reading in simulate_electricity(hh, hour, temp):
                payload = {
                    "household_id": hh["id"],
                    "measured_at": now.isoformat(),
                    "temperature_c": round(temp, 1),
                    **reading
                }
                topic = f"energy/{hh['id']}/electricity"
                client.publish(topic, json.dumps(payload))

            # Dogalgaz
            for reading in simulate_gas(hh, hour):
                payload = {
                    "household_id": hh["id"],
                    "measured_at": now.isoformat(),
                    **reading
                }
                topic = f"energy/{hh['id']}/gas"
                client.publish(topic, json.dumps(payload))

        print(f"[{now.strftime('%H:%M:%S')}] 5 hane icin veri gonderildi | Sicaklik: {temp:.1f}C")
        time.sleep(10)  # Her 10 saniyede bir gonder (demo icin)

if __name__ == "__main__":
    main()

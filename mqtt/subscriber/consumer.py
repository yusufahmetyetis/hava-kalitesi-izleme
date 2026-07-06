import json
import os

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

from .db import get_session
from .handlers import save_reading

load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))


def on_connect(client, userdata, flags, rc):
    print("Broker'a bağlandı, dinleniyor: air_quality/#")
    client.subscribe("air_quality/#")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        with get_session() as session:
            save_reading(session, payload)
    except Exception as e:
        print(f"  !!! HATA (mesaj atlandı): {e}")


def main():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()


if __name__ == "__main__":
    main()

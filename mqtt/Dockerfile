# TODO: placeholder image for aqi-publisher / aqi-subscriber, refine later
# build context is repo root (needs ../shared + ../requirements.txt)
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY shared ./shared
COPY mqtt ./mqtt
CMD ["python", "mqtt/publisher.py"]

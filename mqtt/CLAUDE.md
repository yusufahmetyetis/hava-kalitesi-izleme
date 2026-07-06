# mqtt/ — Stage 1: Veri Toplama

Bu klasörde çalışırken kök CLAUDE.md kuralları da geçerli (özellikle: onaysız commit yok).

## Kapsam
- `publisher.py`: WAQI'den İstanbul istasyon verisini çekip MQTT'ye yayınlar (mevcut mantık korunur,
  sadece token `.env`'den okunacak şekilde değişir).
- `subscriber/`: MQTT'den gelen mesajı SQLAlchemy ile DB'ye yazar. Tek dosya değil, modüler:
  - `handlers.py` → mesaj payload'ını alıp DB'ye yazan fonksiyon(lar); ileride "algoritma" buraya
    kolayca eklenebilecek şekilde ayrılmalı (ham kayıt yazma ile işlenmiş kayıt yazma net ayrı adımlar
    olsun, aralarına sonradan bir "process()" adımı sokulabilsin)
  - `consumer.py` → mqtt client kurulumu, on_connect/on_message, ana döngü
- engine/session (`db.py`) ve ORM modelleri (`models.py`) artık burada değil, kök seviyede
  `shared/` paketinde (backend ile paylaşılıyor, bkz. kök `CLAUDE.md`). `handlers.py` ve
  `consumer.py` bunları `from shared.db import ...` / `from shared.models import ...` ile alır.

## Kısıtlar
- Mevcut `category()` fonksiyonu (AQI eşikleri) ve JSON payload yapısı değişmeyecek, sadece taşınacak.
- `raw_payload` JSONB alanı korunacak (ileride ham veriye tekrar bakabilmek için önemli).
- `is_anomaly` mantığı şimdilik aynı kalabilir (aqi > 150); gerçek algoritma geldiğinde
  `processed_readings` tablosu ve `algo_version` alanı zaten buna hazır.

## Dedup
- `save_reading` her mesajdan önce `is_duplicate()` ile kontrol eder: o istasyon için DB'deki en
  son `raw_readings.measured_at` yeni mesajınkiyle eşitse mesaj tamamen atlanır (raw, processed,
  filtered — hiçbir tabloya yazılmaz), sadece loglanır.

## filtered_readings / z-score algoritması (`zscore_v1`)
- `processed_readings`'ten bağımsız, ayrı bir filtreleme katmanı. `process_reading`'e dokunmaz.
- `is_valid`: aqi 0-500 dışıysa, herhangi bir kirletici (pm25/pm10/o3/no2/so2/co) negatifse veya
  `dominant` boşsa `False` + `validity_notes`'a sebep yazılır.
- Baseline (`baseline_mean`, `baseline_std`): o istasyonun son 24 saatteki `raw_readings.aqi`
  değerlerinden `func.avg`/`func.stddev`/`func.count` ile TEK SQL sorgusunda DB'de hesaplanır
  (satırları Python'a çekip elle hesaplama YAPILMAZ). Yeni okumanın kendisi pencereye dahil
  edilmez (`measured_at < raw.measured_at`).
- `is_anomaly`: son 24 saatte 5'ten az kayıt varsa `NULL` (değerlendirilemedi); 5+ ise
  `z_score = (aqi - baseline_mean) / baseline_std`, `|z_score| > 2.0` ise `True`.
- `algo_version` sabit: `"zscore_v1"`.

## Yapma
- ORM modellerini publisher.py'ye sızdırma; publisher sadece MQTT'ye yayınlar, DB'yi bilmez.
- Alembic migration ekleme (bu stage'de kapsam dışı, ileride konuşulacak).

# mqtt/ — Stage 1: Veri Toplama

Bu klasörde çalışırken kök CLAUDE.md kuralları da geçerli (özellikle: onaysız commit yok).

## Kapsam
- `publisher.py`: WAQI'den İstanbul istasyon verisini çekip MQTT'ye yayınlar (mevcut mantık korunur,
  sadece token `.env`'den okunacak şekilde değişir).
- `subscriber/`: MQTT'den gelen mesajı SQLAlchemy ile DB'ye yazar. Tek dosya değil, modüler:
  - `db.py` → engine + session factory (her mesajda yeni connection AÇMA, session'ı yeniden kullan
    veya pool'dan al)
  - `models.py` → `Station`, `RawReading`, `ProcessedReading` ORM sınıfları (mevcut SQL şemasıyla
    birebir uyumlu: pg_setup.py'deki tablolarla aynı alan adları)
  - `handlers.py` → mesaj payload'ını alıp DB'ye yazan fonksiyon(lar); ileride "algoritma" buraya
    kolayca eklenebilecek şekilde ayrılmalı (ham kayıt yazma ile işlenmiş kayıt yazma net ayrı adımlar
    olsun, aralarına sonradan bir "process()" adımı sokulabilsin)
  - `consumer.py` → mqtt client kurulumu, on_connect/on_message, ana döngü

## Kısıtlar
- Mevcut `category()` fonksiyonu (AQI eşikleri) ve JSON payload yapısı değişmeyecek, sadece taşınacak.
- `raw_payload` JSONB alanı korunacak (ileride ham veriye tekrar bakabilmek için önemli).
- `is_anomaly` mantığı şimdilik aynı kalabilir (aqi > 150); gerçek algoritma geldiğinde
  `processed_readings` tablosu ve `algo_version` alanı zaten buna hazır.

## Yapma
- ORM modellerini publisher.py'ye sızdırma; publisher sadece MQTT'ye yayınlar, DB'yi bilmez.
- Alembic migration ekleme (bu stage'de kapsam dışı, ileride konuşulacak).

# Hava Kalitesi İzleme Sistemi

MQTT (WAQI verisi) → PostgreSQL (SQLAlchemy) → FastAPI (BFF) → Web Dashboard

## SERT KURALLAR (asla atlama)
1. **Aşama atlama yok.** Her aşama sonunda: ne yaptığını özetle, kullanıcıdan onay bekle.
   Onay gelmeden bir sonraki aşamaya geçme, onay gelmeden `git commit` / `git push` yapma.
2. Onay alındıysa: `docs/PROGRESS.md`'ye bir satır ekle, sonra commit at.
   Commit mesajı: `stageN: kısa özet` formatında.
3. Secrets (API token, DB şifresi) asla kod içine yazılmaz. `.env` kullan, `.env.example` ile
   şablon ver, `.env` dosyasını `.gitignore`'a ekle.
4. Var olan çalışan mantığı (WAQI parse, AQI kategorileri) korumadan büyük yeniden yazım yapma;
   iyileştirme fikirlerini önce öner, onay çıkmadan uygulama.
5. Yeni bağımlılık eklemeden önce sor (requirements.txt / pyproject.toml güncellemesi onaylı olsun).

## Mimari (hedef klasör yapısı)
```
shared/                # mqtt ve backend arasında paylaşılan, kod tekrarı önlemek için
  db.py                 # SQLAlchemy engine/session (SessionLocal, get_session())
  models.py              # ORM modelleri (stations, raw_readings, processed_readings, filtered_readings)
mqtt/
  publisher.py
  subscriber/          # modüler subscriber (tek dosya değil)
    consumer.py         # mqtt bağlantısı, mesaj döngüsü
    handlers.py          # mesaj -> DB yazma mantığı (shared/db.py, shared/models.py kullanır)
backend/
  app/
    main.py
    routers/
    schemas/          # pydantic
    services/          # DB'den okuma, dashboard'a hazırlama mantığı (shared/models.py kullanır)
frontend/
  (stage 3'te karar verilecek: basit HTML+JS mi, framework mi)
docs/
  PROGRESS.md         # aşama onay geçmişi (append-only log)
.env.example
```

## Teknoloji
- MQTT: Mosquitto broker + paho-mqtt
- DB: PostgreSQL + SQLAlchemy ORM (ileride Alembic migration hedefi var, şimdilik yok)
- Backend: FastAPI, BFF prensibi (dashboard'un ihtiyacına göre endpoint tasarımı, ham DB şemasını
  birebir dışa vurma)
- Frontend: web tabanlı, framework kararı stage 3'te verilecek

## Aşamalar (detaylar alt klasörlerdeki CLAUDE.md'lerde)
1. `mqtt/` — modüler subscriber + SQLAlchemy ile ham veri kaydı
2. `backend/` — FastAPI BFF, ham veriyi dashboard'a uygun şekilde sunma
3. `frontend/` — grafik + heatmap dashboard

## Bilinen teknik borç (stage 1 onayında konuşulacak)
- Şu anki subscriber her mesajda yeni DB bağlantısı açıyor → connection pool / session yönetimi
- WAQI token ve DB şifresi kod içinde hardcoded → `.env`'e taşınacak
- `raw_readings` ve `processed_readings` ayrımı var ama işleme algoritması henüz yok (ileride eklenecek,
  şimdiki kayıt akışı buna uyumlu tasarlanmalı — `algo_version` alanı zaten mevcut)

## Git
- Her aşama onaylanınca commit. Branch stratejisi konuşulmadıysa direkt `main`'e commit (küçük proje).
- Commit'ten önce her zaman `git status` ve `git diff` göster, ne commit edileceğini teyit ettir.

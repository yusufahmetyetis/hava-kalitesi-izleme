# Hava Kalitesi İzleme Sistemi

İstanbul hava kalitesi istasyonlarının verisini toplayıp harita tabanlı bir dashboard'da gösteren
gerçek zamanlı veri hattı.

```
WAQI API ──> aqi-publisher ──> Mosquitto (MQTT) ──> Flink ──> TimescaleDB ──> FastAPI ──> React
```

Yanında ayrıca bir enerji tüketimi demosu çalışır (`energy-publisher` → Flink → `energy_demo` DB →
`/energy` sayfası).

## Gereksinimler

- Docker + Docker Compose
- Ücretsiz bir WAQI API token'ı: https://aqicn.org/data-platform/token/

Başka bir şey kurmana gerek yok — Python, Java ve Node bağımlılıkları image'ların içinde derleniyor.

## Kurulum

```bash
git clone https://github.com/yusufahmetyetis/hava-kalitesi-izleme.git
cd hava-kalitesi-izleme

cp .env.example .env
# .env'i aç: WAQI_TOKEN ve DB_PASSWORD'ü doldur (ikisi de boş bırakılamaz)

docker compose up -d --build
```

İlk build birkaç dakika sürer (Flink job'ları Maven ile derleniyor).

### Doğrulama

```bash
docker compose ps                                  # 10 servis de "Up" olmalı
curl -s localhost:8000/stations | head -c 200      # istasyon listesi
curl -s localhost:3000/api/readings/latest | head -c 200   # dashboard'un okuduğu endpoint
```

Sonra tarayıcıda **http://localhost:3000**.

| Servis | Adres |
|---|---|
| Dashboard | http://localhost:3000 |
| Backend API (Swagger) | http://localhost:8000/docs |
| Flink Web UI | http://localhost:8081 |
| TimescaleDB | `localhost:5432` |
| MQTT broker | `localhost:1883` |

## İlk açılışta harita boşsa

`aqi-publisher` WAQI'yi **5 dakikada bir** yokluyor, yani ilk veriler birkaç dakika sürebilir.
Veri hattını sırayla kontrol et:

```bash
# 1) Publisher WAQI'den çekebiliyor mu? ("Invalid key" -> token yanlış)
docker compose logs aqi-publisher | tail -20

# 2) Flink job'ları ayakta mı? (ikisi de RUNNING olmalı)
curl -s localhost:8081/jobs/overview

# 3) Veri DB'ye düşüyor mu?  (<kullanici> yerine .env'deki DB_USER değerini yaz)
docker compose exec timescaledb psql -U <kullanici> -d aqi_db \
  -c "select count(*) from stations;" -c "select count(*) from raw_readings;"
```

## Geçmiş veri (opsiyonel)

Dashboard **canlı veriyle çalışır**, ekstra bir şeye ihtiyaç yok. Ancak zaman serisi
grafiklerinin ve anomali takviminin dolu görünmesi için 1 yıllık geçmiş veri yüklenebilir.

Kaynak, SİM'in (sim.csb.gov.tr) saatlik Excel dosyaları. Bu dosyalar `.gitignore`'da olduğu için
repoda gelmez — takımdan alıp `data/sim/` altına koyman gerekir. Sonra:

```bash
# Önce eşleşmeyi kontrol et (hiçbir şey yazmaz)
docker run --rm --network hava-kalitesi-izleme_aqi-network \
  -v ./data:/app/data:ro --env-file .env -e DB_HOST=timescaledb \
  hava-kalitesi-izleme-aqi-publisher:latest \
  python -m mqtt.backfill_sim --dir data/sim --dry-run

# Sorun yoksa --dry-run'ı kaldırıp gerçekten çalıştır
```

## Sık karşılaşılan sorunlar

**timescaledb hemen kapanıyor, log'da "superuser password is not specified"**
`.env`'de `DB_PASSWORD` boş. Doldur, sonra `docker compose up -d`.

**Frontend 502 veriyor**
Backend henüz ayağa kalkmamış olabilir; `docker compose logs backend` ile bak.
(Backend'in IP'si değişince oluşan eski 502 sorunu `frontend/nginx.conf`'taki `resolver`
ayarıyla çözüldü, artık kendi kendine toparlanır.)

**Dashboard'da bazı ilçeler iki kez görünüyor**
SİM ve WAQI aynı ilçeyi farklı istasyon ID'leriyle yayınlıyor (örn. Üsküdar, Kâğıthane).
Bilinen durum, henüz eşleştirme yapılmadı.

**Veritabanını sıfırdan kurmak istiyorum**

```bash
docker compose down
docker volume rm hava-kalitesi-izleme_timescale_data
docker compose up -d
```

`timescaledb/init/*.sql` script'leri **yalnızca boş volume'da** çalışır. Şemada değişiklik
yaptıysan ya volume'u sıfırlaman ya da değişikliği çalışan DB'ye elle uygulaman gerekir.

## Proje yapısı

```
mqtt/            WAQI publisher + SİM backfill scripti
aqi-flink-job/   Hava kalitesi stream işleme (Java/Flink)
flink-job/       Enerji demosu stream işleme (Java/Flink)
backend/         FastAPI BFF
frontend/        React + Leaflet/deck.gl dashboard
shared/          SQLAlchemy modelleri ve DB oturumu (mqtt + backend ortak)
timescaledb/init/ Şema kurulum SQL'leri
docs/PROGRESS.md Aşama onay geçmişi
```

Geliştirme kuralları ve aşama geçmişi için `CLAUDE.md` ve `docs/PROGRESS.md`.

# backend/ — Stage 2: FastAPI BFF

## Prensip
- BFF: dashboard'un ihtiyacı neyse endpoint onu döndürür (örn. `/stations`, `/readings/latest`,
  `/readings/{station_id}/history`, `/heatmap` gibi) — ham `raw_readings` tablosunu birebir dışa
  vurma, `processed_readings`/`raw_readings` join'lenip dashboard'un beklediği şekle getirilir.
- SQLAlchemy session'ı FastAPI dependency injection ile yönetilecek (mqtt/db.py'deki engine
  mantığı buradan da paylaşılabilir — kod tekrarı olmasın, ortak bir `shared/` veya paket
  yapısı stage 2 başında konuşulacak).

## CORS
- Şimdilik geliştirme ortamı: `CORSMiddleware` tüm origin'lere açık (`allow_origins=["*"]`).
- İleride iş: proje başkanının/başkalarının erişeceği gerçek bir deploy aşamasına geçilince
  origin listesi somut domain(ler)e kısıtlanacak. Şimdi kısıtlama YOK.

## Auth
- Şimdilik yok. İleride değerlendirilecek (kapsam dışı, stage 2'de auth eklenmeyecek).

## History endpoint
- `range=24h|7d|30d` — sadece bu üç sabit seçenek kodlanacak, varsayılan `24h`.
- İleride iş: "özel tarih aralığı" (`from`/`to` query parametreleri) — stage 3 sonrası bir
  iyileştirme olarak değerlendirilecek, şimdi kapsam dışı.

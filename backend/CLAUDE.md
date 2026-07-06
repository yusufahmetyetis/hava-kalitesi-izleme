# backend/ — Stage 2: FastAPI BFF

Durum: Henüz başlanmadı. Stage 1 onaylanmadan bu klasörde kod üretme.

Stage 1 onaylandığında bu dosya, DB şemasına göre (models.py'deki alanlar üzerinden) somut
endpoint listesi ve pydantic şema tasarımıyla güncellenecek. Şimdiden genel prensip:

## Prensip
- BFF: dashboard'un ihtiyacı neyse endpoint onu döndürür (örn. `/stations`, `/readings/latest`,
  `/readings/{station_id}/history`, `/heatmap` gibi) — ham `raw_readings` tablosunu birebir dışa
  vurma, `processed_readings`/`raw_readings` join'lenip dashboard'un beklediği şekle getirilir.
- SQLAlchemy session'ı FastAPI dependency injection ile yönetilecek (mqtt/db.py'deki engine
  mantığı buradan da paylaşılabilir — kod tekrarı olmasın, ortak bir `shared/` veya paket
  yapısı stage 2 başında konuşulacak).

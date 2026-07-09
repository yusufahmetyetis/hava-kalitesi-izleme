# frontend/ — Stage 3: Dashboard

Bu klasörde çalışırken kök CLAUDE.md kuralları da geçerli (özellikle: onaysız commit yok,
aşama atlama yok).

## Teknoloji kararı
- **React** seçildi. Saf HTML+JS'den vazgeçildi; gerekçe: deck.gl, react-leaflet,
  react-chartjs-2 gibi olgun React entegrasyonları harita/grafik/3D katmanlarını çok daha az
  kırılgan biçimde bir araya getiriyor.
- Backend BFF (stage 2) endpoint'lerini tüketir; ham DB şemasını bilmez.

## Stage 3 alt-aşamaları
Her biri kendi onay noktasıdır. Kök CLAUDE.md'deki "aşama atlama yok" kuralı burada alt-aşama
düzeyinde uygulanır: **sıradakine onaysız geçme.**

- **3a**: React iskeleti + Leaflet harita + renkli marker'lar (`/readings/latest`) +
  marker'a tıklanınca basit detay paneli (sadece AQI/kategori, henüz grafik yok).
- **3b**: Detay paneline zaman serisi grafikleri (Chart.js, `/stations/{id}/history`).
  Bu adımda `HistoryPointOut` şemasına `pm25/pm10/o3/no2/so2/co/temperature/humidity/wind`
  alanları eklenecek. + kirletici radar grafiği.
- **3c**: Leaflet.heat ile enterpolasyon heatmap katmanı (toggle ile açılıp kapanabilir,
  marker'ların üstüne eklenir).
  - Katman kontrolü sağ üstte/kenarda bir panel olarak eklenecek: "İstasyonlar" (marker'lar),
    "Isı haritası" (Leaflet.heat), "Anomaliler" (sadece `is_anomaly=true` olanları vurgulayan
    filtre) arasında açık/kapalı toggle'lar.
  - İleride rüzgar verisi eklenirse (Open-Meteo, bkz. MVP dışı notu) aynı panele "Rüzgar"
    katmanı olarak eklenecek.
- **3d**: Anomali takvimi (GitHub-tarzı, `filtered_readings.is_anomaly` üzerinden, son 30 gün).
- **3e**: deck.gl 3D sütun haritası (AQI=yükseklik, kategori=renk) + zaman kaydırıcı
  animasyonu, ayrı bir "3D Görünüm" sekmesinde.

## Her alt-aşama bitince (kural)
1. Kullanıcıya göster, test ettir, onay al.
2. Onay gelince `docs/PROGRESS.md`'ye satır ekle, sonra commit at (`stage3X: kısa özet`).
3. Onaysız sıradaki alt-aşamaya geçme, onaysız commit yok.

## İleride 100+ sensöre ölçeklenirken dikkat edilecekler
Şu an 21 istasyonla çalışıyoruz; aşağıdakiler henüz KOD olarak uygulanmadı, yalnızca mimari not.

- **Marker render'ı:** 21 DivIcon marker sorunsuz. Yüzlerce marker'da Leaflet'in düz marker
  yaklaşımı performans (DOM/redraw) sorunu yaratabilir → ileride **Leaflet.markercluster**
  (kümeleme) değerlendirilecek. Şimdi eklenmiyor.
- **`/readings/latest`:** şu an tüm istasyonları tek istekte dönüyor; yüzlerce satırda hâlâ
  kabul edilebilir ama ileride **sayfalama / bölgesel (viewport bbox) filtreleme** gerekebilir.
  Backend'e şimdilik dokunulmuyor.
- **Leaflet.heat:** yoğun nokta için tasarlandığından, sensör sayısı arttıkça bu katmanın
  **görsel kalitesi İYİLEŞİR** — seyrek veride ayrı "haleler", yoğun veride sürekli gradyan.
  Yani veri büyümesi bu katmanı olumsuz değil, olumlu etkiler.
- **Anomali katmanı:** yalnızca `filtered.is_anomaly === true` istasyonları vurgular. Erken
  aşamada baseline yetersizken `NULL`, yeterli veri birikince çoğu okumada `false` olur; katman
  ancak z-score eşiğini (|z|>2) aşan uç değerlerde dolu görünür. Mevcut veride 0 anomali olması
  (katmanın boş görünmesi) normaldir — bir hata değil.

## Bilinen kısıt: "Mobil 2" istasyonu (station_id=14843)
- Seyyar (mobil) bir istasyon; `stations` tablosundaki `lat/lng` aracın en son bilinen
  konumu (sabit değil). SİM backfill'i (`mqtt/backfill_sim.py`) ile yazılan 1 yıllık geçmiş
  veri, haritada/heatmap'te bu **tek sabit noktada** gösterilecek — gerçekte araç yıl boyunca
  farklı yerlerde ölçüm yapmış olabilir, bu bilgi kaynak veride yok. Kullanıcı onayıyla kabul
  edildi, çözülmedi (bkz. `mqtt/backfill_sim.py` `SIM_TO_WAQI["Mobil 2"]` yorumu). Takvim/zaman
  serisi grafiklerini etkilemez, yalnızca coğrafi görselleştirmeleri (harita, heatmap) ilgilendirir.

## MVP kapsamı dışı (ileride, proje başkanı onayı sonrası düşünülecek)
- Rüzgar yönü / rüzgar animasyonu: WAQI feed'inde bu veri yok (İstanbul istasyonları yalnızca
  rüzgar hızı `w` ve gust `wg` besliyor, yön alanı `wd` gelmiyor). Eklemek Open-Meteo gibi ayrı
  bir kaynak entegrasyonu gerektirir — MVP dışı.

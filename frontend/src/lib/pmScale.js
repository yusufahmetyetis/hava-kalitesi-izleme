// raw_readings.pm25 / pm10 sütunları WAQI iaqi.*.v değerini tutar; bunlar µg/m³ KONSANTRASYON
// DEĞİL, AQI ALT-ENDEKSİ'dir (0–500 ölçeği). Bu yüzden renklendirme de AQI kategori eşikleriyle
// yapılmalı — tek kaynak lib/aqiUtils.js (haritadaki AQI paletiyle birebir aynı, PM2.5/PM10 aynı
// ölçekte olduğu için ayrı eşik tablosuna gerek yok).
//
// Eskiden burada µg/m³ konsantrasyon bantları (9 / 35.4 / 55.4 …) vardı: AQI ölçekli bir değeri
// konsantrasyon eşiğiyle boyayıp takvimi sistematik olarak fazla kötü (kronik kırmızı) gösteriyordu.
import { getAQIColor } from "./aqiUtils.js";

// metric parametresi çağrı uyumu için korunuyor; PM2.5 ve PM10 aynı AQI ölçeğinde olduğu için
// renk yalnızca değere bağlı.
export function pmColor(_metric, value) {
  if (value === null || value === undefined) return null;
  return getAQIColor(value);
}

// Anomali oranı (anomaly_count / evaluated_count). evaluated_count 0 ise "değerlendirilmedi"
// → null döner (gri). Aksi halde açıktan koyu kırmızıya.
export function anomalyColor(anomalyCount, evaluatedCount) {
  if (!evaluatedCount) return null;
  const ratio = anomalyCount / evaluatedCount;
  if (ratio === 0) return "#eef7e8";
  if (ratio <= 0.1) return "#fed976";
  if (ratio <= 0.25) return "#fd8d3c";
  if (ratio <= 0.5) return "#e31a1c";
  return "#800026";
}

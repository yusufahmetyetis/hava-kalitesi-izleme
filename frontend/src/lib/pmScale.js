// EPA 24-saatlik AQI kategori konsantrasyon sınırları (µg/m³), yalnızca renk-bandı skalası
// olarak kullanılır (AQI alt-endeksi hesaplanmaz). Renkler harita paletiyle uyumlu.
const PM25_BREAKS = [
  [9, "#009966"],
  [35.4, "#ffde33"],
  [55.4, "#ff9933"],
  [125.4, "#cc0033"],
];
const PM10_BREAKS = [
  [54, "#009966"],
  [154, "#ffde33"],
  [254, "#ff9933"],
  [354, "#cc0033"],
];
const OVER = "#660099"; // en üst band (Çok Sağlıksız)

function bandColor(value, breaks) {
  if (value === null || value === undefined) return null;
  for (const [threshold, color] of breaks) {
    if (value <= threshold) return color;
  }
  return OVER;
}

export function pmColor(metric, value) {
  return bandColor(value, metric === "pm10" ? PM10_BREAKS : PM25_BREAKS);
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

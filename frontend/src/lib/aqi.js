// AQI kategori eşikleri ve renkleri — backend category() (shared üzerinden) ile birebir uyumlu.
// 0-50 İyi, 51-100 Orta, 101-150 Hassas Gruplar İçin Sağlıksız,
// 151-200 Sağlıksız, 201+ Çok Sağlıksız.

export function aqiCategory(aqi) {
  if (aqi === null || aqi === undefined) return "Bilinmiyor";
  if (aqi <= 50) return "İyi";
  if (aqi <= 100) return "Orta";
  if (aqi <= 150) return "Hassas Gruplar İçin Sağlıksız";
  if (aqi <= 200) return "Sağlıksız";
  return "Çok Sağlıksız";
}

export function aqiColor(aqi) {
  if (aqi === null || aqi === undefined) return "#9e9e9e"; // gri: bilinmiyor
  if (aqi <= 50) return "#009966"; // yeşil
  if (aqi <= 100) return "#ffde33"; // sarı
  if (aqi <= 150) return "#ff9933"; // turuncu
  if (aqi <= 200) return "#cc0033"; // kırmızı
  return "#660099"; // mor
}

// Sarı zeminde beyaz yazı okunmaz; kategoriye göre okunaklı metin rengi seç.
export function aqiTextColor(aqi) {
  if (aqi !== null && aqi !== undefined && aqi > 50 && aqi <= 100) {
    return "#333"; // sarı zemin -> koyu yazı
  }
  return "#fff";
}

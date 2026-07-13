import { getAQICategory } from "./aqiUtils.js";

// /readings/latest zaten backend'de normalize edilmiş geliyor (BFF); bu fonksiyon 2D ve 3D
// katmanlarının aynı şekle (id/name/lat/lng/aqi/category) güvenle erişmesi için ek bir
// tutarlılık/zenginleştirme katmanı.
export function normalizeStation(raw) {
  return {
    id: raw.station_id ?? raw.id,
    name: raw.station_name ?? raw.name ?? null,
    lat: raw.lat ?? null,
    lng: raw.lng ?? null,
    aqi: raw.aqi ?? null,
    category: getAQICategory(raw.aqi).label,
    isAnomaly: raw.filtered?.is_anomaly === true,
    measuredAt: raw.measured_at ?? null,
  };
}

// districtMap: { [station_id]: districtName }. Aynı ilçeye düşen istasyonların ortalama AQI'si.
export function groupStationsByDistrict(stations, districtMap) {
  const buckets = {};
  for (const station of stations) {
    const id = station.station_id ?? station.id;
    const district = districtMap[id];
    if (!district || station.aqi == null) continue;
    if (!buckets[district]) buckets[district] = [];
    buckets[district].push(station.aqi);
  }
  const result = {};
  for (const [district, values] of Object.entries(buckets)) {
    result[district] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }
  return result;
}

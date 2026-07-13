// Eski API — mevcut bileşenler (StationMarker, HeatLayer, DistrictLayer, vb.) bu isimlerle
// import ediyor. Eşik/renk mantığının tek kaynağı artık lib/aqiUtils.js (2D/3D ortak).
import { getAQIColor, getAQICategory } from "./aqiUtils.js";

export function aqiCategory(aqi) {
  return getAQICategory(aqi).label;
}

export function aqiColor(aqi) {
  return getAQIColor(aqi);
}

// Sarı zeminde beyaz yazı okunmaz; kategoriye göre okunaklı metin rengi seç.
export function aqiTextColor(aqi) {
  if (aqi !== null && aqi !== undefined && aqi > 50 && aqi <= 100) {
    return "#333"; // sarı zemin -> koyu yazı
  }
  return "#fff";
}

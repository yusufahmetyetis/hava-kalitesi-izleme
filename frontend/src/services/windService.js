import { WIND_GRID, parseWindData } from "../utils/windUtils.js";

const WIND_URL = "https://api.open-meteo.com/v1/forecast";

// Marmara bbox'unun grid noktaları için tek istekte rüzgar hızı/yönü çeker (Open-Meteo'nun
// virgülle ayrılmış çoklu konum desteği), leaflet-velocity U/V grid formatına dönüştürür.
export async function fetchWindData() {
  const latitude = WIND_GRID.points.map((p) => p.lat).join(",");
  const longitude = WIND_GRID.points.map((p) => p.lon).join(",");

  const params = new URLSearchParams({
    latitude,
    longitude,
    hourly: "wind_speed_10m,wind_direction_10m",
    wind_speed_unit: "ms",
    forecast_days: "1",
    timezone: "Europe/Istanbul",
  });

  try {
    const res = await fetch(`${WIND_URL}?${params}`);
    if (!res.ok) {
      throw new Error(`Open-Meteo wind API hatası: ${res.status}`);
    }
    const json = await res.json();
    const parsed = parseWindData(json);
    if (!parsed) throw new Error("Rüzgar verisi parse edilemedi");
    return parsed;
  } catch (err) {
    console.error("Rüzgar verisi alınamadı:", err);
    return null;
  }
}

import { getCurrentHourIndex } from "../utils/windUtils.js";
import { MARMARA_BOUNDS } from "../lib/geoUtils.js";

const CAMS_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

// Türkiye geneline yayılmış bir ızgara CAMS'ın kendi çözünürlük tavanı yüzünden neredeyse
// düz tek renk veriyordu (kullanıcı geri bildirimi: "bu bir şey ifade etmiyor") — model bu
// ölçekte İstanbul'un yerel kirlilik farklarını zaten göremiyor. Bunun yerine ızgara
// Marmara'ya daraltıldı (rüzgar katmanıyla aynı MARMARA_BOUNDS) ve CamsHeatmapLayer.jsx'te
// gerçek istasyon okumalarıyla IDW (ağırlıklı ters mesafe) füzyonuna sokuluyor — istasyona
// yakınken gerçek ölçüm baskın çıkıyor, istasyonsuz bölgelerde CAMS boşluğu dolduruyor.
export const NX = 8;
export const NY = 6;

function buildGridPoints() {
  const { minLat, maxLat, minLng, maxLng } = MARMARA_BOUNDS;
  const points = [];
  for (let row = 0; row < NY; row++) {
    const lat = maxLat - (row * (maxLat - minLat)) / (NY - 1);
    for (let col = 0; col < NX; col++) {
      const lon = minLng + (col * (maxLng - minLng)) / (NX - 1);
      points.push({ lat, lon });
    }
  }
  return points;
}

const GRID_POINTS = buildGridPoints();

// Tek istekte Marmara ızgarası için CAMS model AQI'sini çeker.
export async function fetchCamsGrid() {
  const latitude = GRID_POINTS.map((p) => p.lat).join(",");
  const longitude = GRID_POINTS.map((p) => p.lon).join(",");

  const params = new URLSearchParams({
    latitude,
    longitude,
    hourly: "european_aqi",
    forecast_days: "1",
    timezone: "Europe/Istanbul",
  });

  try {
    const res = await fetch(`${CAMS_URL}?${params}`);
    if (!res.ok) {
      throw new Error(`CAMS grid API hatası: ${res.status}`);
    }
    const json = await res.json();
    if (!Array.isArray(json) || json.length !== GRID_POINTS.length) {
      throw new Error("CAMS grid yanıtı beklenmeyen formatta");
    }

    const times = json[0]?.hourly?.time;
    if (!times?.length) throw new Error("CAMS grid: saat verisi yok");
    const index = getCurrentHourIndex(times);

    return GRID_POINTS.map((point, i) => ({
      lat: point.lat,
      lng: point.lon,
      aqi: json[i]?.hourly?.european_aqi?.[index] ?? null,
    }));
  } catch (err) {
    console.error("CAMS grid verisi alınamadı:", err);
    return null;
  }
}

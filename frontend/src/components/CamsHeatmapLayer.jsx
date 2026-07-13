import { useMemo } from "react";
import { ImageOverlay } from "react-leaflet";
import { useCamsGrid } from "../hooks/useCamsGrid.js";
import { idwInterpolate } from "../lib/idwInterpolation.js";
import { getAQIColorSmoothRGB } from "../lib/aqiUtils.js";
import { normalizeStation } from "../lib/stationUtils.js";
import { MARMARA_BOUNDS } from "../lib/geoUtils.js";

// Türkiye geneline yayılmış saf CAMS ızgarası neredeyse düz tek renk veriyordu (kullanıcı
// geri bildirimi: model bu ölçekte İstanbul'un yerel farklarını göremiyor). Bunun yerine
// gerçek istasyon okumaları (yüksek güvenilirlik) + Marmara CAMS ızgarası (düşük güvenilirlik,
// istasyonsuz bölgeleri dolduran arka plan) IDW ile TEK bir yüzeyde birleştiriliyor —
// istasyona yakınken gerçek ölçüm baskın çıkar, uzakta CAMS devreye girer.
const STATION_WEIGHT = 25;
const CAMS_WEIGHT = 1;

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 160;
// "Isı haritası (tahmini)" (istasyon HeatLayer) ile aynı anda açık kalabileceğinden düşük
// tutuldu — ikisi üst üste binince taban harita neredeyse hiç görünmüyordu (kullanıcı
// geri bildirimi).
const OPACITY = 0.4;

const LEAFLET_BOUNDS = [
  [MARMARA_BOUNDS.minLat, MARMARA_BOUNDS.minLng],
  [MARMARA_BOUNDS.maxLat, MARMARA_BOUNDS.maxLng],
];

// Boylam farkını enlem farkıyla kıyaslanabilir gerçek mesafeye yakınsatan çarpan.
const MEAN_LAT_RAD = ((MARMARA_BOUNDS.minLat + MARMARA_BOUNDS.maxLat) / 2 / 180) * Math.PI;
const LAT_LNG_RATIO = Math.cos(MEAN_LAT_RAD);

function renderCanvas(points) {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
  const { minLat, maxLat, minLng, maxLng } = MARMARA_BOUNDS;

  for (let py = 0; py < CANVAS_HEIGHT; py++) {
    // Üst satır = kuzey; ImageOverlay bounds'u [[south,west],[north,east]] olduğundan tutarlı.
    const lat = maxLat - (py / (CANVAS_HEIGHT - 1)) * (maxLat - minLat);
    for (let px = 0; px < CANVAS_WIDTH; px++) {
      const lng = minLng + (px / (CANVAS_WIDTH - 1)) * (maxLng - minLng);
      const aqi = idwInterpolate(points, lat, lng, LAT_LNG_RATIO);
      const idx = (py * CANVAS_WIDTH + px) * 4;
      if (aqi == null) {
        imageData.data[idx + 3] = 0;
        continue;
      }
      const [r, g, b] = getAQIColorSmoothRGB(aqi);
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export default function CamsHeatmapLayer({ readings }) {
  const { points: camsPoints } = useCamsGrid();

  const imageUrl = useMemo(() => {
    if (!camsPoints) return null;

    const stationPoints = readings
      .map(normalizeStation)
      .filter((s) => s.lat != null && s.lng != null && s.aqi != null)
      .map((s) => ({ lat: s.lat, lng: s.lng, value: s.aqi, weight: STATION_WEIGHT }));

    const modelPoints = camsPoints
      .filter((p) => p.aqi != null)
      .map((p) => ({ lat: p.lat, lng: p.lng, value: p.aqi, weight: CAMS_WEIGHT }));

    const combined = [...stationPoints, ...modelPoints];
    if (combined.length === 0) return null;

    return renderCanvas(combined);
  }, [camsPoints, readings]);

  if (!imageUrl) return null;

  return <ImageOverlay url={imageUrl} bounds={LEAFLET_BOUNDS} opacity={OPACITY} />;
}

import { hexbin as d3hexbin } from "d3-hexbin";

// stations: normalizeStation() çıktısı ({lat, lng, aqi, ...}). map: Leaflet map instance
// (latLngToLayerPoint arayüzü bekleniyor) — React/Leaflet import edilmiyor, saf fonksiyon.
// Piksel uzayında altıgen hücrelere gruplar; interpolasyon yok, sadece kapsanan istasyonların
// ortalama AQI'si. radius piksel cinsinden hex yarıçapı.
export function computeHexbins(stations, map, radius = 40) {
  const points = stations.map((s) => {
    const { x, y } = map.latLngToLayerPoint([s.lat, s.lng]);
    return { x, y, aqi: s.aqi };
  });

  const hexbinGenerator = d3hexbin()
    .radius(radius)
    .x((d) => d.x)
    .y((d) => d.y);

  const rawBins = hexbinGenerator(points);

  const bins = rawBins.map((bin) => {
    const aqiValues = bin.map((p) => p.aqi).filter((v) => v != null);
    const avgAqi = aqiValues.length
      ? Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length)
      : null;
    return { x: bin.x, y: bin.y, avgAqi, count: bin.length };
  });

  return { bins, hexagonPath: hexbinGenerator.hexagon() };
}

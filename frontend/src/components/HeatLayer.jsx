import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

// AQI'yi 0..1 yoğunluğa ölçekle (max ~250: mor uç). Gradient kategori renkleriyle uyumlu.
const HEAT_MAX_AQI = 250;
const GRADIENT = {
  0.0: "#009966", // İyi
  0.2: "#ffde33", // Orta
  0.4: "#ff9933", // Hassas
  0.6: "#cc0033", // Sağlıksız
  0.8: "#660099", // Çok Sağlıksız
};

export default function HeatLayer({ readings }) {
  const map = useMap();

  useEffect(() => {
    const points = readings
      .filter((r) => r.lat != null && r.lng != null && r.aqi != null)
      .map((r) => [r.lat, r.lng, Math.min(r.aqi / HEAT_MAX_AQI, 1)]);

    const heat = L.heatLayer(points, {
      radius: 35,
      blur: 25,
      maxZoom: 13,
      minOpacity: 0.3,
      gradient: GRADIENT,
    });
    heat.addTo(map);

    return () => {
      heat.remove();
    };
  }, [map, readings]);

  return null;
}

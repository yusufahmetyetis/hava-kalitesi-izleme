import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-velocity/dist/leaflet-velocity.css";
import "leaflet-velocity";
import { useWindData } from "../hooks/useWindData.js";
import { useMapStore } from "../store/mapStore.js";

// 10m rüzgar yönü/hızı — Open-Meteo, Marmara bbox'unun 3x3 gerçek grid'i (bkz. windUtils.js).
// İstasyon marker'larının üstünde görünür; özet hız/yön değeri sol-alt widget grubunda
// gösterildiğinden (bkz. MapControlWidget.jsx) kütüphanenin kendi displayValues kontrolü kapalı.
export default function WindLayer() {
  const map = useMap();
  const { uLayer, vLayer, windDirection, windSpeed } = useWindData();
  const setWind = useMapStore((s) => s.setWind);

  useEffect(() => {
    if (!uLayer || !vLayer) return;

    const velocityLayer = L.velocityLayer({
      displayValues: false,
      data: [uLayer, vLayer],
      // İstanbul'da tipik rüzgar 0.5-4 m/s civarı; maxVelocity gerçekçi tutulmazsa
      // tüm değerler renk skalasının en soluk ucuna düşüp görünmez hale geliyor.
      maxVelocity: 8,
      velocityScale: 0.01,
      particleAge: 60,
      lineWidth: 1,
      particleMultiplier: 1 / 300,
      opacity: 0.85,
      frameRate: 20,
      colorScale: ["#41b6c4", "#2c7fb8", "#253494"],
    });

    velocityLayer.addTo(map);
    return () => map.removeLayer(velocityLayer);
  }, [map, uLayer, vLayer]);

  useEffect(() => {
    setWind(windDirection, windSpeed);
  }, [windDirection, windSpeed, setWind]);

  useEffect(() => {
    return () => setWind(null, null);
  }, [setWind]);

  return null;
}

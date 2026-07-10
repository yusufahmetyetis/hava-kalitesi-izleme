import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import StationMarker from "./StationMarker.jsx";
import HeatLayer from "./HeatLayer.jsx";
import AnomalyLayer from "./AnomalyLayer.jsx";
import DistrictLayer from "./DistrictLayer.jsx";
import LayerControl from "./LayerControl.jsx";

// İstanbul merkezli başlangıç görünümü (veriler burada yoğun).
const ISTANBUL_CENTER = [41.05, 28.95];
const INITIAL_ZOOM = 11;
const FLYTO_ZOOM = 13;

// Türkiye geneli pan sınırı (güneyde Akdeniz — kuzeyde Karadeniz kıyısı,
// batıda Ege — doğu sınırı). Kıyıları biraz taşan makul bir dikdörtgen.
const TURKEY_BOUNDS = [
  [35.8, 25.5],
  [42.3, 44.8],
];

// Seçili istasyon değişince haritayı animasyonlu olarak o konuma kaydır.
function MapFlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target && target.lat != null && target.lng != null) {
      map.flyTo([target.lat, target.lng], FLYTO_ZOOM, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

export default function MapView({
  readings,
  onSelect,
  selected,
  layers,
  onToggleLayer,
}) {
  return (
    <div className="map-container">
      <MapContainer
        center={ISTANBUL_CENTER}
        zoom={INITIAL_ZOOM}
        minZoom={6}
        maxBounds={TURKEY_BOUNDS}
        maxBoundsViscosity={0.7}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        {layers.districts && <DistrictLayer readings={readings} />}
        {layers.heatmap && <HeatLayer readings={readings} />}
        {layers.anomalies && <AnomalyLayer readings={readings} />}
        {layers.stations &&
          readings.map((r) => (
            <StationMarker key={r.station_id} reading={r} onSelect={onSelect} />
          ))}

        <MapFlyTo target={selected} />
      </MapContainer>

      {layers.heatmap && (
        <div className="heatmap-notice">
          ⚠ Bu katman interpolasyon tahminidir, ölçüm verisi değildir.
        </div>
      )}

      <LayerControl layers={layers} onToggle={onToggleLayer} />
    </div>
  );
}

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import StationMarker from "./StationMarker.jsx";

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

export default function MapView({ readings, onSelect, selected }) {
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {readings.map((r) => (
          <StationMarker key={r.station_id} reading={r} onSelect={onSelect} />
        ))}
        <MapFlyTo target={selected} />
      </MapContainer>
    </div>
  );
}

import { MapContainer, TileLayer } from "react-leaflet";
import StationMarker from "./StationMarker.jsx";

// İstanbul merkezli başlangıç görünümü (veriler burada yoğun).
const ISTANBUL_CENTER = [41.05, 28.95];
const INITIAL_ZOOM = 11;

// Türkiye geneli pan sınırı (güneyde Akdeniz — kuzeyde Karadeniz kıyısı,
// batıda Ege — doğu sınırı). Kıyıları biraz taşan makul bir dikdörtgen.
const TURKEY_BOUNDS = [
  [35.8, 25.5],
  [42.3, 44.8],
];

export default function MapView({ readings, onSelect }) {
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
      </MapContainer>
    </div>
  );
}

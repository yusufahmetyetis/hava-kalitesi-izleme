import { MapContainer, TileLayer } from "react-leaflet";
import StationMarker from "./StationMarker.jsx";

// İstanbul merkezli başlangıç görünümü.
const ISTANBUL_CENTER = [41.05, 28.95];
const INITIAL_ZOOM = 11;

export default function MapView({ readings, onSelect }) {
  return (
    <div className="map-container">
      <MapContainer center={ISTANBUL_CENTER} zoom={INITIAL_ZOOM} scrollWheelZoom>
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

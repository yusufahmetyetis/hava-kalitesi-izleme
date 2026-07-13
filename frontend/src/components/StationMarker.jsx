import { Marker } from "react-leaflet";
import L from "leaflet";
import { aqiColor, aqiTextColor } from "../lib/aqi.js";
import { normalizeStation } from "../lib/stationUtils.js";

// Ortasında AQI sayısı olan rozet (DivIcon) — aqicn.org/IQAir tarzı.
function buildBadgeIcon(aqi) {
  const bg = aqiColor(aqi);
  const fg = aqiTextColor(aqi);
  const label = aqi === null || aqi === undefined ? "?" : aqi;
  const size = 32;
  const html = `<div class="aqi-badge" style="width:${size}px;height:${size}px;background:${bg};color:${fg};">${label}</div>`;
  return L.divIcon({
    html,
    className: "aqi-badge-wrapper",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Konum/AQI okuması normalizeStation üzerinden alınır — 2D (bu bileşen) ve 3D (DeckGLMap)
// aynı şekilden okur; tıklamada DetailPanel'in ihtiyaç duyduğu ham `reading` yine de geçilir.
export default function StationMarker({ reading, onSelect }) {
  const station = normalizeStation(reading);
  if (station.lat === null || station.lng === null) return null;
  return (
    <Marker
      position={[station.lat, station.lng]}
      icon={buildBadgeIcon(station.aqi)}
      eventHandlers={{ click: () => onSelect(reading) }}
    />
  );
}

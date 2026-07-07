import { Marker } from "react-leaflet";
import L from "leaflet";
import { aqiColor, aqiTextColor } from "../lib/aqi.js";

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

export default function StationMarker({ reading, onSelect }) {
  if (reading.lat === null || reading.lng === null) return null;
  return (
    <Marker
      position={[reading.lat, reading.lng]}
      icon={buildBadgeIcon(reading.aqi)}
      eventHandlers={{ click: () => onSelect(reading) }}
    />
  );
}

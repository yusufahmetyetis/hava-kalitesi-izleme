import { aqiColor } from "../lib/aqi.js";
import CategoryDot from "./CategoryDot.jsx";

function formatTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR");
}

export default function StationSummary({ reading }) {
  const category = reading.processed?.category ?? "Bilinmiyor";
  return (
    <div className="station-summary">
      <h2>{reading.station_name ?? `İstasyon ${reading.station_id}`}</h2>
      <div className="aqi-big" style={{ color: aqiColor(reading.aqi) }}>
        {reading.aqi ?? "?"}
        <span className="aqi-unit">AQI</span>
      </div>
      <div className="detail-category">
        <CategoryDot aqi={reading.aqi} />
        <span>{category}</span>
      </div>
      <dl className="detail-meta">
        <dt>Baskın kirletici</dt>
        <dd>{reading.dominant ?? "-"}</dd>
        <dt>Ölçüm zamanı</dt>
        <dd>{formatTime(reading.measured_at)}</dd>
      </dl>
    </div>
  );
}

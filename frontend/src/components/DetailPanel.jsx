import { aqiColor } from "../lib/aqi.js";

function formatTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR");
}

export default function DetailPanel({ reading }) {
  if (!reading) {
    return (
      <aside className="detail-panel detail-panel--empty">
        <p>Detay için haritadan bir istasyon seçin.</p>
      </aside>
    );
  }

  const category = reading.processed?.category ?? "Bilinmiyor";

  return (
    <aside className="detail-panel">
      <h2>{reading.station_name ?? `İstasyon ${reading.station_id}`}</h2>
      <div className="aqi-big" style={{ color: aqiColor(reading.aqi) }}>
        {reading.aqi ?? "?"}
        <span className="aqi-unit">AQI</span>
      </div>
      <div className="detail-category">{category}</div>
      <dl className="detail-meta">
        <dt>Baskın kirletici</dt>
        <dd>{reading.dominant ?? "-"}</dd>
        <dt>Ölçüm zamanı</dt>
        <dd>{formatTime(reading.measured_at)}</dd>
      </dl>
    </aside>
  );
}

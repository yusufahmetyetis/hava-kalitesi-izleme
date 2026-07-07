import { aqiColor, aqiTextColor } from "../lib/aqi.js";

// Varsayılan (hiçbir istasyon seçili değil) panel içeriği: AQI'ye göre azalan sıralama.
export default function StationRanking({ readings, onSelect }) {
  const sorted = [...readings].sort(
    (a, b) => (b.aqi ?? -Infinity) - (a.aqi ?? -Infinity)
  );

  return (
    <div className="ranking">
      <h2>Canlı AQI Sıralaması</h2>
      {sorted.length === 0 ? (
        <p className="ranking-empty">Veri yükleniyor…</p>
      ) : (
        <ol className="ranking-list">
          {sorted.map((r, i) => (
            <li key={r.station_id}>
              <button className="ranking-row" onClick={() => onSelect(r)}>
                <span className="ranking-rank">{i + 1}</span>
                <span className="ranking-name">
                  {r.station_name ?? `İstasyon ${r.station_id}`}
                </span>
                <span
                  className="ranking-badge"
                  style={{
                    background: aqiColor(r.aqi),
                    color: aqiTextColor(r.aqi),
                  }}
                >
                  {r.aqi ?? "?"}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

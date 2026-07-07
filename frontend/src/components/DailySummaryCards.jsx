import { aqiColor } from "../lib/aqi.js";
import { dailyAqiSummary } from "../lib/history.js";

function formatDay(day) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function DailySummaryCards({ points }) {
  const days = dailyAqiSummary(points);
  if (!days.length) {
    return <p className="chart-empty">Özet için veri yok.</p>;
  }

  return (
    <div className="daily-cards">
      {days.map((d) => (
        <div className="daily-card" key={d.day}>
          <div className="daily-date">{formatDay(d.day)}</div>
          <div className="daily-avg" style={{ color: aqiColor(d.avg) }}>
            {d.avg}
          </div>
          <div className="daily-minmax">
            min {d.min} · maks {d.max}
          </div>
        </div>
      ))}
    </div>
  );
}

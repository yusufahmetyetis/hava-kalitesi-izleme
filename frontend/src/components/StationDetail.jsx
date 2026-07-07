import { useEffect, useState } from "react";
import { fetchHistory } from "../api/client.js";
import AqiTimeSeriesChart from "./AqiTimeSeriesChart.jsx";
import PollutantRadarChart from "./PollutantRadarChart.jsx";
import DailySummaryCards from "./DailySummaryCards.jsx";

const RANGES = [
  { key: "24h", label: "24 Saat" },
  { key: "7d", label: "7 Gün" },
  { key: "30d", label: "30 Gün" },
];

export default function StationDetail({ reading }) {
  const [range, setRange] = useState("24h");
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchHistory(reading.station_id, range)
      .then((data) => {
        if (!cancelled) setPoints(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reading.station_id, range]);

  return (
    <div className="station-detail">
      <div className="range-selector">
        {RANGES.map((r) => (
          <button
            key={r.key}
            className={r.key === range ? "range-btn active" : "range-btn"}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <div className="detail-error">{error}</div>}
      {loading && <div className="detail-loading">Yükleniyor…</div>}

      {!loading && !error && (
        <>
          <section className="chart-block">
            <h3>AQI Zaman Serisi</h3>
            <AqiTimeSeriesChart points={points} />
          </section>

          <section className="chart-block">
            <h3>Kirleticiler</h3>
            <PollutantRadarChart reading={reading} />
          </section>

          {range === "7d" && (
            <section className="chart-block">
              <h3>Günlük Özet</h3>
              <DailySummaryCards points={points} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

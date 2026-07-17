import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  fetchHouseholds,
  fetchHouseholdReadings,
  fetchEnergyAnomalies,
  fetchAqiCorrelation,
} from "../api/client.js";

function timeLabel(iso) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HouseholdChart({ readings }) {
  if (!readings.length) {
    return <p className="chart-empty">Bu hane için son 24 saatte veri yok.</p>;
  }
  const data = {
    labels: readings.map((r) => timeLabel(r.measured_at)),
    datasets: [
      {
        label: "Tüketim (kWh)",
        data: readings.map((r) => r.consumption_kwh),
        borderColor: "#2f7d4f",
        backgroundColor: "#2f7d4f",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.25,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "kWh" } },
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
    },
  };
  return (
    <div className="chart-canvas">
      <Line data={data} options={options} />
    </div>
  );
}

function CorrelationChart({ points }) {
  if (!points.length) {
    return <p className="chart-empty">Son 24 saatte korelasyon verisi yok.</p>;
  }
  const data = {
    labels: points.map((p) => timeLabel(p.hour)),
    datasets: [
      {
        label: "Ort. Tüketim (kWh)",
        data: points.map((p) => p.avg_consumption_kwh),
        borderColor: "#2f7d4f",
        backgroundColor: "#2f7d4f",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.25,
        yAxisID: "y",
      },
      {
        label: "Ort. AQI",
        data: points.map((p) => p.avg_aqi),
        borderColor: "#c9463d",
        backgroundColor: "#c9463d",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.25,
        yAxisID: "y1",
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: "linear",
        position: "left",
        beginAtZero: true,
        title: { display: true, text: "kWh" },
      },
      y1: {
        type: "linear",
        position: "right",
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        title: { display: true, text: "AQI" },
      },
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
    },
  };
  return (
    <div className="chart-canvas">
      <Line data={data} options={options} />
    </div>
  );
}

function AnomalyCards({ anomalies }) {
  if (!anomalies.length) {
    return <p className="chart-empty">Anomali kaydı yok.</p>;
  }
  return (
    <div className="energy-anomaly-list">
      {anomalies.map((a, i) => (
        <div className="energy-anomaly-card" key={i}>
          <div className="energy-anomaly-head">
            <strong>{a.household_code}</strong>
            <span>{timeLabel(a.measured_at)}</span>
          </div>
          <div>
            {a.reading_type === "ELECTRICITY" ? "Elektrik" : "Doğalgaz"} · {a.metric_key}
          </div>
          <div>
            Gerçek: {a.actual_value.toFixed(2)} · Beklenen: {a.expected_value.toFixed(2)} ·
            Sapma: %{a.deviation_pct.toFixed(1)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EnergyDashboard() {
  const [households, setHouseholds] = useState([]);
  const [selectedCode, setSelectedCode] = useState(null);
  const [readings, setReadings] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [correlation, setCorrelation] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHouseholds()
      .then((data) => {
        setHouseholds(data);
        if (data.length) setSelectedCode(data[0].household_code);
      })
      .catch((e) => setError(e.message));

    fetchEnergyAnomalies().then(setAnomalies).catch((e) => setError(e.message));
    fetchAqiCorrelation().then(setCorrelation).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedCode) return;
    fetchHouseholdReadings(selectedCode)
      .then(setReadings)
      .catch(() => setReadings([]));
  }, [selectedCode]);

  return (
    <div className="detail-page">
      <div className="detail-page-inner">
        <Link className="btn-back" to="/">
          ◀ Haritaya Dön
        </Link>

        <section className="chart-block">
          <h3>Hane Elektrik Tüketimi (son 24 saat)</h3>
          <select
            value={selectedCode ?? ""}
            onChange={(e) => setSelectedCode(e.target.value)}
          >
            {households.map((h) => (
              <option key={h.household_code} value={h.household_code}>
                {h.household_code} — {h.district ?? h.description}
              </option>
            ))}
          </select>
          <HouseholdChart readings={readings} />
        </section>

        <section className="chart-block">
          <h3>Enerji Anomalileri (son 50)</h3>
          <AnomalyCards anomalies={anomalies} />
        </section>

        <section className="chart-block">
          <h3>AQI vs Elektrik Tüketimi (son 24 saat)</h3>
          <CorrelationChart points={correlation} />
        </section>

        {error && <div className="error-banner">{error}</div>}
      </div>
    </div>
  );
}

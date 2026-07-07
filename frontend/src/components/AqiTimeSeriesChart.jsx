import { Line } from "react-chartjs-2";
import { aqiColor } from "../lib/aqi.js";

function label(iso) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AqiTimeSeriesChart({ points }) {
  if (!points.length) {
    return <p className="chart-empty">Bu aralıkta veri yok.</p>;
  }

  const data = {
    labels: points.map((p) => label(p.measured_at)),
    datasets: [
      {
        label: "AQI",
        data: points.map((p) => p.aqi),
        borderColor: "#555",
        borderWidth: 2,
        pointBackgroundColor: points.map((p) => aqiColor(p.aqi)),
        pointRadius: 3,
        tension: 0.25,
        spanGaps: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true },
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
    },
  };

  return (
    <div className="chart-canvas">
      <Line data={data} options={options} />
    </div>
  );
}

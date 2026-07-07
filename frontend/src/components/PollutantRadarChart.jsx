import { Radar } from "react-chartjs-2";

// Baskın kirleticiler — son ölçümün (seçili istasyon) değerleri, aralıktan bağımsız.
const FIELDS = [
  ["PM2.5", "pm25"],
  ["PM10", "pm10"],
  ["O₃", "o3"],
  ["NO₂", "no2"],
  ["SO₂", "so2"],
  ["CO", "co"],
];

export default function PollutantRadarChart({ reading }) {
  const values = FIELDS.map(([, key]) => reading[key] ?? 0);
  const allZero = values.every((v) => !v);

  if (allZero) {
    return <p className="chart-empty">Kirletici verisi yok.</p>;
  }

  const data = {
    labels: FIELDS.map(([labelText]) => labelText),
    datasets: [
      {
        label: "Değer",
        data: values,
        backgroundColor: "rgba(51,102,204,0.2)",
        borderColor: "rgba(51,102,204,0.9)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(51,102,204,0.9)",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { r: { beginAtZero: true } },
  };

  return (
    <div className="chart-canvas">
      <Radar data={data} options={options} />
    </div>
  );
}

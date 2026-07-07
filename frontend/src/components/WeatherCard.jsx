// IQAir "Weather" kutusu tarzı bilgi kartı. Veriler /readings/latest'ten (reading) gelir.
// Rüzgar birimi m/s — WAQI feed'inin ham birimiyle tutarlı.
function fmt(value, unit) {
  if (value === null || value === undefined) return "-";
  return `${value} ${unit}`;
}

export default function WeatherCard({ reading }) {
  return (
    <div className="weather-card">
      <h3 className="weather-title">Hava Durumu</h3>
      <div className="weather-stats">
        <div className="weather-stat">
          <span className="weather-label">Sıcaklık</span>
          <span className="weather-value">{fmt(reading.temperature, "°C")}</span>
        </div>
        <div className="weather-stat">
          <span className="weather-label">Nem</span>
          <span className="weather-value">{fmt(reading.humidity, "%")}</span>
        </div>
        <div className="weather-stat">
          <span className="weather-label">Rüzgar</span>
          <span className="weather-value">{fmt(reading.wind, "m/s")}</span>
        </div>
      </div>
      <div className="weather-source">
        Veri kaynağı: WAQI (İstanbul istasyonları)
      </div>
    </div>
  );
}

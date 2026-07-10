import { aqiColor, aqiTextColor } from "../lib/aqi.js";
import { useOpenMeteoData } from "../hooks/useOpenMeteoData.js";

function fmt(value, unit) {
  if (value === null || value === undefined) return "-";
  return `${value} ${unit}`;
}

// Sağ paneldeki AQI sıralamasının üstünde gösterilen şehir geneli model tahmini kartı.
// Open-Meteo/CAMS ~11 km çözünürlük — istasyon ölçümü değil, katman kapalıyken hiç render edilmez.
export default function CityAqiWidget() {
  const { data, loading, error } = useOpenMeteoData();

  if (error || (!loading && !data)) return null;

  return (
    <div className="city-aqi-widget">
      <h3 className="city-aqi-title">Şehir AQI (Open-Meteo)</h3>
      {loading && !data ? (
        <p className="ranking-empty">Yükleniyor…</p>
      ) : (
        <>
          <div className="city-aqi-main">
            <span
              className="city-aqi-badge"
              style={{
                background: aqiColor(data.european_aqi),
                color: aqiTextColor(data.european_aqi),
              }}
            >
              {data.european_aqi ?? "?"}
            </span>
            <span className="city-aqi-note">
              CAMS modeli tahmini — ölçüm değildir
            </span>
          </div>
          <div className="city-aqi-stats">
            <div className="weather-stat">
              <span className="weather-label">PM2.5</span>
              <span className="weather-value">{fmt(data.pm2_5, "µg/m³")}</span>
            </div>
            <div className="weather-stat">
              <span className="weather-label">PM10</span>
              <span className="weather-value">{fmt(data.pm10, "µg/m³")}</span>
            </div>
            <div className="weather-stat">
              <span className="weather-label">NO2</span>
              <span className="weather-value">
                {fmt(data.nitrogen_dioxide, "µg/m³")}
              </span>
            </div>
            <div className="weather-stat">
              <span className="weather-label">O3</span>
              <span className="weather-value">{fmt(data.ozone, "µg/m³")}</span>
            </div>
          </div>
        </>
      )}
      <div className="weather-source">
        Open-Meteo.com (CAMS / Copernicus Atmosphere Monitoring Service)
      </div>
    </div>
  );
}

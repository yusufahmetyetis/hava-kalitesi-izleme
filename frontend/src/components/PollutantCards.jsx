import CategoryDot from "./CategoryDot.jsx";
import { POLLUTANTS } from "../lib/pollutants.js";

// Renkli nokta genel istasyon kategorisiyle aynı (kirletici alt-endeksi hesaplanmaz).
export default function PollutantCards({ reading }) {
  return (
    <div className="pollutant-cards">
      {POLLUTANTS.map((p) => {
        const value = reading[p.key];
        return (
          <div className="pollutant-card" key={p.key}>
            <div className="pollutant-head">
              <span className="pollutant-abbr">{p.abbr}</span>
              <CategoryDot aqi={reading.aqi} />
            </div>
            <div className="pollutant-name">{p.name}</div>
            <div className="pollutant-value">
              {value == null ? "-" : value}
              {/* WAQI iaqi.*.v = AQI alt-endeksi (0–500), µg/m³ konsantrasyon değil */}
              <span className="pollutant-unit"> AQI</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

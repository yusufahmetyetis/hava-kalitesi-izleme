import { aqiColor } from "../lib/aqi.js";
import { findPollutant } from "../lib/pollutants.js";

// Baskın kirletici kutusu — kategori rengiyle uyumlu açık arka plan.
// Değer, kartlarla aynı raw veriden (dominant'a karşılık gelen kirletici) okunur.
export default function DominantPollutantBox({ reading }) {
  const meta = reading.dominant ? findPollutant(reading.dominant) : null;
  const label = meta
    ? `${meta.abbr} — ${meta.name}`
    : (reading.dominant ?? "-");
  const value = meta ? reading[meta.key] : null;
  const color = aqiColor(reading.aqi);

  return (
    <div
      className="dominant-box"
      style={{ background: `${color}20`, borderColor: color }}
    >
      <span className="dominant-label">Baskın kirletici: {label}</span>
      <span className="dominant-value">
        {value == null ? "-" : `${value} µg/m³`}
      </span>
    </div>
  );
}

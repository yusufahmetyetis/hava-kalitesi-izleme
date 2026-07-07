import { aqiColor } from "../lib/aqi.js";

// Kategoriye göre renkli küçük SVG daire — emoji/illüstrasyon yok.
export default function CategoryDot({ aqi, size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <circle
        cx="6"
        cy="6"
        r="5"
        fill={aqiColor(aqi)}
        stroke="#fff"
        strokeWidth="1"
      />
    </svg>
  );
}

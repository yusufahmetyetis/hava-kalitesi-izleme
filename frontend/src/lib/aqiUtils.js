// Motor-bağımsız AQI eşik/renk mantığı — tek kaynak. lib/aqi.js (2D bileşenlerin kullandığı
// eski API) ve 3D (deck.gl) katmanları buradan besleniyor; eşikler tek yerde değişir.
const AQI_BREAKPOINTS = [
  { label: "İyi", max: 50, color: "#009966" },
  { label: "Orta", max: 100, color: "#ffde33" },
  { label: "Hassas Gruplar İçin Sağlıksız", max: 150, color: "#ff9933" },
  { label: "Sağlıksız", max: 200, color: "#cc0033" },
  { label: "Çok Sağlıksız", max: Infinity, color: "#660099" },
];

const UNKNOWN = { label: "Bilinmiyor", color: "#9e9e9e", range: [null, null] };

export function getAQIBreakpoints() {
  return AQI_BREAKPOINTS;
}

export function getAQICategory(value) {
  if (value === null || value === undefined) return UNKNOWN;
  let min = 0;
  for (const bp of AQI_BREAKPOINTS) {
    if (value <= bp.max) return { label: bp.label, color: bp.color, range: [min, bp.max] };
    min = bp.max + 1;
  }
  return UNKNOWN;
}

export function getAQIColor(value) {
  return getAQICategory(value).color;
}

// deck.gl getFillColor için [r, g, b]
export function getAQIColorRGB(value) {
  const hex = getAQIColor(value).replace("#", "");
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
  ];
}

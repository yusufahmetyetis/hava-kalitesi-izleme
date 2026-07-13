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

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// deck.gl getFillColor için [r, g, b]
export function getAQIColorRGB(value) {
  return hexToRgb(getAQIColor(value));
}

// HeatLayer.jsx'in leaflet.heat'e verdiği GRADIENT ile aynı durak noktaları/renkler (0, 50,
// 100, 150, 200 AQI'de kategori renkleri) — AQI_BREAKPOINTS'ten türetiliyor ki iki katman
// (istasyon ısı haritası + CAMS füzyon katmanı) aynı kaynaktan beslenip görsel olarak
// tutarlı kalsın. leaflet.heat kendi iç gradyanını canvas ile ürettiğinden burada elle
// kopyalamak yerine aynı durakları üretip lineer interpolasyonla [r,g,b] döndürüyoruz.
const GRADIENT_STOPS = AQI_BREAKPOINTS.map((bp, i) => ({
  at: i === 0 ? 0 : AQI_BREAKPOINTS[i - 1].max,
  rgb: hexToRgb(bp.color),
}));

export function getAQIColorSmoothRGB(value) {
  if (value == null) return hexToRgb(UNKNOWN.color);
  if (value <= GRADIENT_STOPS[0].at) return GRADIENT_STOPS[0].rgb;

  for (let i = 1; i < GRADIENT_STOPS.length; i++) {
    if (value <= GRADIENT_STOPS[i].at) {
      const prev = GRADIENT_STOPS[i - 1];
      const curr = GRADIENT_STOPS[i];
      const t = (value - prev.at) / (curr.at - prev.at);
      return [0, 1, 2].map((c) => Math.round(prev.rgb[c] + (curr.rgb[c] - prev.rgb[c]) * t));
    }
  }
  return GRADIENT_STOPS[GRADIENT_STOPS.length - 1].rgb;
}

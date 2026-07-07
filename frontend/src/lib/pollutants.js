// Kirletici meta verisi — kart düzeni ve baskın kirletici kutusu paylaşır.
export const POLLUTANTS = [
  { key: "pm25", abbr: "PM2.5", name: "İnce parçacıklar" },
  { key: "pm10", abbr: "PM10", name: "Kaba parçacıklar" },
  { key: "o3", abbr: "O₃", name: "Ozon" },
  { key: "no2", abbr: "NO₂", name: "Azot Dioksit" },
  { key: "so2", abbr: "SO₂", name: "Kükürt Dioksit" },
  { key: "co", abbr: "CO", name: "Karbon Monoksit" },
];

export function findPollutant(key) {
  return POLLUTANTS.find((p) => p.key === key) || null;
}

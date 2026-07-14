import { useMapStore } from "../store/mapStore.js";

// Haritanın sağ üstünde katman aç/kapa paneli. Katmanlar bağımsız, state useMapStore'da
// (2D ve 3D görünümler aynı katman görünürlüğünü paylaşır).
const LAYERS = [
  { key: "stations", label: "İstasyonlar" },
  { key: "heatmap", label: "Isı haritası (tahmini)" },
  { key: "anomalies", label: "Anomaliler" },
  { key: "districts", label: "İlçe özeti (choropleth)" },
  {
    key: "wind",
    label: "Rüzgar Akışı",
    info: "10 metre yükseklikte rüzgar yönü ve hızı (Open-Meteo.com)",
  },
  {
    key: "hexbin",
    label: "Hexbin (İstasyon Yoğunluğu)",
    info: "İstasyonları altıgen hücrelerle gruplar. Ortalama AQI gösterilir. Kesikli gösterim — interpolasyon yapılmaz. İlçe özeti ile aynı anda açıksa görsel çakışabilir.",
  },
  {
    key: "terrain",
    label: "Topoğrafya (3D)",
    info: "İstanbul topoğrafyası — Copernicus DEM GLO-30 © DLR e.V. / Airbus DS, Copernicus/ESA. Terrain tile: AWS Open Data (Mapzen elevation-tiles-prod). Yüzey dokusu: Esri World Topo Map. Yalnızca 3D görünümde etkili.",
  },
  {
    key: "camsHeatmap",
    label: "İstasyon + Model Isı Haritası (Füzyon)",
    info: "21 istasyonun gerçek ölçümü (yüksek ağırlık) ile Marmara'daki CAMS model ızgarasının (düşük ağırlık, ~11 km) IDW ile birleştirilmiş yüzeyi. İstasyona yakınken ölçüm baskın, istasyonsuz bölgelerde model boşluğu doldurur. Sadece Marmara Bölgesi'nde gösterilir.",
  },
];

export default function LayerControl() {
  const layers = useMapStore((s) => s.layers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);

  return (
    <div className="layer-control">
      <div className="layer-control-title">Katmanlar</div>
      {LAYERS.map((l) => (
        <label key={l.key} className="layer-control-row">
          <input
            type="checkbox"
            checked={layers[l.key]}
            onChange={() => toggleLayer(l.key)}
          />
          <span>{l.label}</span>
          {l.info && (
            <span className="layer-info-icon" title={l.info}>
              ℹ
            </span>
          )}
        </label>
      ))}
    </div>
  );
}

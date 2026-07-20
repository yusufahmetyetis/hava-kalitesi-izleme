import { useState } from "react";
import { Link } from "react-router-dom";
import { useMapStore } from "../store/mapStore.js";

// Haritanın sol altında, rüzgar hız göstergesinin üzerinde duran kompakt widget:
// Energy dashboard linki + katlanır "Katmanlar" akordiyonu (eski LayerControl'ün yerini alır).
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

export default function MapControlWidget() {
  const [layersOpen, setLayersOpen] = useState(false);
  const layers = useMapStore((s) => s.layers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);
  const activeView = useMapStore((s) => s.activeView);

  // 3D görünümde terrain katmanı açıkken deck.gl'in "yükseklik abartması" slider'ı
  // (bkz. DeckGLMap.jsx .terrain-scale-control) aynı köşede duruyor — çakışmayı önlemek için
  // widget o durumda yukarı kaydırılır, aksi halde (2D veya terrain kapalı) tabana oturur.
  const elevated = activeView === "3d" && layers.terrain;

  return (
    <div className={`map-control-widget${elevated ? " map-control-widget--elevated" : ""}`}>
      <Link to="/energy" className="widget-energy-btn">
        Energy →
      </Link>

      <div className="widget-layers-accordion">
        <button
          type="button"
          className="widget-layers-toggle"
          onClick={() => setLayersOpen((o) => !o)}
        >
          Katmanlar {layersOpen ? "▲" : "▼"}
        </button>
        {layersOpen && (
          <div className="widget-layers-body">
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
        )}
      </div>
    </div>
  );
}

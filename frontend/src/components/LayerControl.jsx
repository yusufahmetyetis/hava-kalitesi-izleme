// Haritanın sağ üstünde katman aç/kapa paneli. Katmanlar bağımsız.
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
];

export default function LayerControl({ layers, onToggle }) {
  return (
    <div className="layer-control">
      <div className="layer-control-title">Katmanlar</div>
      {LAYERS.map((l) => (
        <label key={l.key} className="layer-control-row">
          <input
            type="checkbox"
            checked={layers[l.key]}
            onChange={() => onToggle(l.key)}
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

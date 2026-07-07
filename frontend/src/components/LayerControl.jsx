// Haritanın sağ üstünde katman aç/kapa paneli. Üç katman bağımsız.
const LAYERS = [
  { key: "stations", label: "İstasyonlar" },
  { key: "heatmap", label: "Isı haritası" },
  { key: "anomalies", label: "Anomaliler" },
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
        </label>
      ))}
    </div>
  );
}

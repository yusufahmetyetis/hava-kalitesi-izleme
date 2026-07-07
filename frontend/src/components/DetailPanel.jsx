import StationSummary from "./StationSummary.jsx";
import StationRanking from "./StationRanking.jsx";

// Masaüstü docked panel. reading yoksa AQI sıralama listesi, varsa özet + detay butonu.
export default function DetailPanel({
  reading,
  readings,
  onSelect,
  onShowDetail,
  onClose,
  collapsed,
}) {
  const cls = `detail-panel${collapsed ? " collapsed" : ""}`;

  if (!reading) {
    return (
      <aside className={cls}>
        <StationRanking readings={readings} onSelect={onSelect} />
      </aside>
    );
  }

  return (
    <aside className={cls}>
      <button className="panel-close" onClick={onClose} aria-label="Kapat">
        ×
      </button>
      <StationSummary reading={reading} />
      <button className="btn-detail" onClick={onShowDetail}>
        Detayları Göster
      </button>
    </aside>
  );
}

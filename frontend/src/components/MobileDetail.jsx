import StationSummary from "./StationSummary.jsx";
import StationDetail from "./StationDetail.jsx";

// Mobil: marker'a tıklayınca ara adım olmadan tam ekran detay (özet + grafikler).
export default function MobileDetail({ reading, onClose }) {
  return (
    <div className="detail-fullscreen">
      <button className="panel-close" onClick={onClose} aria-label="Kapat">
        ×
      </button>
      <StationSummary reading={reading} />
      <StationDetail reading={reading} />
    </div>
  );
}

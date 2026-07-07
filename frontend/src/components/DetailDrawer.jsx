import StationDetail from "./StationDetail.jsx";

// Masaüstü: sağdan açılan geniş yan panel (drawer). Özet zaten docked panelde görünür.
export default function DetailDrawer({ reading, onClose, collapsed }) {
  return (
    <div className={`detail-drawer${collapsed ? " collapsed" : ""}`}>
      <div className="drawer-header">
        <h2>{reading.station_name ?? `İstasyon ${reading.station_id}`}</h2>
        <button className="panel-close" onClick={onClose} aria-label="Kapat">
          ×
        </button>
      </div>
      <StationDetail reading={reading} />
    </div>
  );
}

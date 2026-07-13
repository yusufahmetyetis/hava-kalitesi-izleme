import { useMapStore } from "../store/mapStore.js";

// Haritanın sol üstünde 2D/3D geçiş anahtarı. Konum/zoom useMapStore üzerinden korunur
// (bkz. lib/geoUtils.js) — geçişte harita aynı yerde açılır.
export default function ViewSwitcher() {
  const activeView = useMapStore((s) => s.activeView);
  const setActiveView = useMapStore((s) => s.setActiveView);

  return (
    <div className="view-switcher">
      <button
        className={activeView === "2d" ? "active" : ""}
        onClick={() => setActiveView("2d")}
      >
        2D
      </button>
      <button
        className={activeView === "3d" ? "active" : ""}
        onClick={() => setActiveView("3d")}
      >
        3D
      </button>
    </div>
  );
}

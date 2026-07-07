import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import MapView from "./components/MapView.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import DetailDrawer from "./components/DetailDrawer.jsx";
import MobileDetail from "./components/MobileDetail.jsx";
import { fetchLatestReadings } from "./api/client.js";
import { useMediaQuery } from "./hooks/useMediaQuery.js";
import "./app.css";

const PANEL_WIDTH = 300;
const DRAWER_WIDTH = 480;

export default function App() {
  const [readings, setReadings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [error, setError] = useState(null);

  const isMobile = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    fetchLatestReadings()
      .then(setReadings)
      .catch((e) => setError(e.message));
  }, []);

  function handleSelect(reading) {
    setSelected(reading);
    // Mobilde ara adım yok: doğrudan tam ekran detay. Masaüstünde önce özet.
    setDetailOpen(isMobile);
    // Seçim yapılınca panel gizliyse geri açılsın.
    setPanelCollapsed(false);
  }

  function closeAll() {
    setSelected(null);
    setDetailOpen(false);
  }

  // Toggle butonunun harita/panel sınırındaki yatay konumu.
  const toggleRight = panelCollapsed
    ? 0
    : detailOpen
      ? DRAWER_WIDTH
      : PANEL_WIDTH;

  return (
    <div className="app-layout">
      <MapView readings={readings} onSelect={handleSelect} />

      {!isMobile && (
        <>
          <DetailPanel
            reading={selected}
            readings={readings}
            onSelect={handleSelect}
            onShowDetail={() => setDetailOpen(true)}
            onClose={closeAll}
            collapsed={panelCollapsed}
          />

          {detailOpen && selected && (
            <DetailDrawer
              reading={selected}
              onClose={() => setDetailOpen(false)}
              collapsed={panelCollapsed}
            />
          )}

          <button
            className="panel-toggle"
            style={{ right: toggleRight }}
            onClick={() => setPanelCollapsed((c) => !c)}
            aria-label={panelCollapsed ? "Paneli aç" : "Paneli kapat"}
          >
            {panelCollapsed ? "‹" : "›"}
          </button>
        </>
      )}

      {isMobile && detailOpen && selected && (
        <MobileDetail reading={selected} onClose={closeAll} />
      )}

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import MapView from "./components/MapView.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import StationDetailPage from "./components/StationDetailPage.jsx";
import { fetchLatestReadings } from "./api/client.js";
import { useMediaQuery } from "./hooks/useMediaQuery.js";
import "./app.css";

const PANEL_WIDTH = 300;

export default function App() {
  const [readings, setReadings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("map"); // "map" | "detail"
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [layers, setLayers] = useState({
    stations: true,
    heatmap: false,
    anomalies: false,
    districts: false,
    wind: true,
  });
  const [error, setError] = useState(null);

  function toggleLayer(key) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const isMobile = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    fetchLatestReadings()
      .then(setReadings)
      .catch((e) => setError(e.message));
  }, []);

  function handleSelect(reading) {
    setSelected(reading);
    setPanelCollapsed(false);
    // Mobilde ara adım yok: doğrudan tam sayfa detay. Masaüstünde önce harita + özet panel.
    setView(isMobile ? "detail" : "map");
  }

  function closeSelection() {
    setSelected(null);
    setView("map");
  }

  if (view === "detail" && selected) {
    return (
      <StationDetailPage reading={selected} onBack={() => setView("map")} />
    );
  }

  return (
    <div className="app-layout">
      <MapView
        readings={readings}
        onSelect={handleSelect}
        selected={selected}
        layers={layers}
        onToggleLayer={toggleLayer}
      />

      {!isMobile && (
        <>
          <DetailPanel
            reading={selected}
            readings={readings}
            onSelect={handleSelect}
            onShowDetail={() => setView("detail")}
            onClose={closeSelection}
            collapsed={panelCollapsed}
          />

          <button
            className="panel-toggle"
            style={{ right: panelCollapsed ? 0 : PANEL_WIDTH }}
            onClick={() => setPanelCollapsed((c) => !c)}
            aria-label={panelCollapsed ? "Paneli aç" : "Paneli kapat"}
          >
            {panelCollapsed ? "‹" : "›"}
          </button>
        </>
      )}

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}

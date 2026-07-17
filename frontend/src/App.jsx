import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import MapView from "./components/MapView.jsx";
import DeckGLMap from "./components/DeckGLMap.jsx";
import LayerControl from "./components/LayerControl.jsx";
import ViewSwitcher from "./components/ViewSwitcher.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import StationDetailPage from "./components/StationDetailPage.jsx";
import EnergyDashboard from "./pages/EnergyDashboard.jsx";
import { fetchLatestReadings } from "./api/client.js";
import { useMediaQuery } from "./hooks/useMediaQuery.js";
import { useMapStore } from "./store/mapStore.js";
import "./app.css";

const PANEL_WIDTH = 300;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapDashboard />} />
        <Route path="/energy" element={<EnergyDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

function MapDashboard() {
  const [readings, setReadings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("map"); // "map" | "detail"
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [error, setError] = useState(null);

  const activeView = useMapStore((s) => s.activeView);
  const setSelectedStationId = useMapStore((s) => s.setSelectedStationId);

  const isMobile = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    fetchLatestReadings()
      .then(setReadings)
      .catch((e) => setError(e.message));
  }, []);

  function handleSelect(reading) {
    setSelected(reading);
    setSelectedStationId(reading.station_id);
    setPanelCollapsed(false);
    // Mobilde ara adım yok: doğrudan tam sayfa detay. Masaüstünde önce harita + özet panel.
    setView(isMobile ? "detail" : "map");
  }

  function closeSelection() {
    setSelected(null);
    setSelectedStationId(null);
    setView("map");
  }

  if (view === "detail" && selected) {
    return (
      <StationDetailPage reading={selected} onBack={() => setView("map")} />
    );
  }

  return (
    <div className="app-layout">
      <div className={`map-container${activeView === "3d" ? " map-container-sky" : ""}`}>
        {activeView === "3d" ? (
          <DeckGLMap readings={readings} onSelect={handleSelect} />
        ) : (
          <MapView readings={readings} onSelect={handleSelect} selected={selected} />
        )}

        <ViewSwitcher />
        <LayerControl />
        <Link to="/energy" className="energy-link">
          Energy →
        </Link>
      </div>

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

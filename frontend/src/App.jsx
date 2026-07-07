import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import MapView from "./components/MapView.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import { fetchLatestReadings } from "./api/client.js";
import "./app.css";

export default function App() {
  const [readings, setReadings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLatestReadings()
      .then(setReadings)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="app-layout">
      <MapView readings={readings} onSelect={setSelected} />
      <DetailPanel reading={selected} />
      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}

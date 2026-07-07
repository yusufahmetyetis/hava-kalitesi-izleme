const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function getJSON(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API hatası ${res.status}: ${path}`);
  }
  return res.json();
}

export function fetchLatestReadings() {
  return getJSON("/readings/latest");
}

export function fetchHistory(stationId, range) {
  return getJSON(`/stations/${stationId}/history?range=${range}`);
}

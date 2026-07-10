import { useEffect, useState } from "react";
import { fetchWindData } from "../services/windService.js";

const REFRESH_MS = 30 * 60 * 1000; // rüzgar AQI'ye göre daha yavaş değişir

export function useWindData() {
  const [uLayer, setULayer] = useState(null);
  const [vLayer, setVLayer] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await fetchWindData();
      if (cancelled) return;
      if (result === null) {
        setError("Rüzgar verisi alınamadı");
        return;
      }
      const [u, v] = result;
      setULayer(u);
      setVLayer(v);
      setError(null);
      setLastUpdated(new Date());
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { uLayer, vLayer, error, lastUpdated };
}

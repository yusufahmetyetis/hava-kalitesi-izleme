import { useEffect, useState } from "react";
import { fetchCamsGrid } from "../services/camsGridService.js";

const REFRESH_MS = 15 * 60 * 1000; // CityAqiWidget'taki tek nokta ile aynı yenileme sıklığı

export function useCamsGrid() {
  const [points, setPoints] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await fetchCamsGrid();
      if (cancelled) return;
      if (result === null) {
        setError("Model AQI ızgarası alınamadı");
        return;
      }
      setPoints(result);
      setError(null);
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { points, error };
}

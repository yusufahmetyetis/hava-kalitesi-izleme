import { useEffect, useState } from "react";
import { fetchOpenMeteoAirQuality } from "../services/openMeteoService.js";

const ISTANBUL_LAT = 41.01;
const ISTANBUL_LON = 28.98;
const REFRESH_MS = 15 * 60 * 1000; // 15 dakika — rate limit için yeterli

export function useOpenMeteoData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchOpenMeteoAirQuality(ISTANBUL_LAT, ISTANBUL_LON);
        if (cancelled) return;
        if (result === null) {
          setError("Open-Meteo verisi alınamadı");
        } else {
          setData(result);
          setError(null);
          setLastUpdated(new Date());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error, lastUpdated };
}

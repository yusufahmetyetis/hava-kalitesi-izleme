const OPEN_METEO_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

// Open-Meteo Air Quality API'den İstanbul için model tabanlı (CAMS) güncel saat verisini çeker.
// İstasyon ölçümü DEĞİLDİR — ~11 km çözünürlüklü model tahminidir.
export async function fetchOpenMeteoAirQuality(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    // us_aqi (european_aqi DEĞİL): istasyon marker'ları WAQI = ABD AQI ölçeğinde; EU AQI farklı
    // bir ölçek (0-20-40-60-80-100) olduğu için ABD paletiyle renklendirilince kirliliği yanlış
    // (olduğundan iyi) gösteriyordu. Tek ölçekte kalmak için us_aqi çekiliyor.
    hourly: "pm2_5,pm10,nitrogen_dioxide,ozone,us_aqi",
    timezone: "Europe/Istanbul",
    forecast_days: "1",
  });

  try {
    const res = await fetch(`${OPEN_METEO_URL}?${params}`);
    if (!res.ok) {
      throw new Error(`Open-Meteo API hatası: ${res.status}`);
    }
    const json = await res.json();
    const hourly = json.hourly;
    if (!hourly?.time?.length) return null;

    // "Güncel saat" en yakın geçmiş/şimdiki saat dilimine denk gelen indeks.
    const now = new Date();
    let index = hourly.time.findIndex((t) => new Date(t) > now) - 1;
    if (index < 0) index = 0;

    return {
      time: hourly.time[index],
      us_aqi: hourly.us_aqi?.[index] ?? null,
      pm2_5: hourly.pm2_5?.[index] ?? null,
      pm10: hourly.pm10?.[index] ?? null,
      nitrogen_dioxide: hourly.nitrogen_dioxide?.[index] ?? null,
      ozone: hourly.ozone?.[index] ?? null,
    };
  } catch (err) {
    console.error("Open-Meteo verisi alınamadı:", err);
    return null;
  }
}

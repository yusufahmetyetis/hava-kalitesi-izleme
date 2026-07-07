// Zaman serisi noktalarını takvim gününe göre grupla, günlük ort/min/maks AQI hesapla.
// measured_at ISO string (+03:00 offset), ilk 10 karakter = o offsetteki takvim günü.
export function dailyAqiSummary(points) {
  const byDay = new Map();
  for (const p of points) {
    if (p.aqi === null || p.aqi === undefined || !p.measured_at) continue;
    const day = p.measured_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(p.aqi);
  }
  return [...byDay.entries()].map(([day, vals]) => ({
    day,
    avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    min: Math.min(...vals),
    max: Math.max(...vals),
    count: vals.length,
  }));
}

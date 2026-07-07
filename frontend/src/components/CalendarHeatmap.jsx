import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCalendar } from "../api/client.js";
import { pmColor, anomalyColor } from "../lib/pmScale.js";

const CELL = 12;
const PITCH = 15;
const GUTTER_LEFT = 22;
const PAD_TOP = 18;
const EMPTY = "#ebedf0";
const WEEKDAY_LABELS = ["P", "S", "Ç", "P", "C", "C", "P"]; // Pzt..Paz
const MONTH_LABELS = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];
const METRICS = [
  { key: "pm25", label: "PM2.5" },
  { key: "pm10", label: "PM10" },
  { key: "anomali", label: "Anomaliler" },
];

const DAY_MS = 86400000;

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

// Bir yılın günlerini grid koordinatlarıyla üret (Pazartesi bazlı hafta sütunları).
function buildYear(year) {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const jan1Weekday = (jan1.getUTCDay() + 6) % 7;
  const cells = [];
  const d = new Date(jan1);
  while (d.getUTCFullYear() === year) {
    const dayIndex = Math.round((d - jan1) / DAY_MS);
    const row = (d.getUTCDay() + 6) % 7;
    const col = Math.floor((dayIndex + jan1Weekday) / 7);
    cells.push({ date: new Date(d), key: dayKey(d), month: d.getUTCMonth(), row, col });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  const numWeeks = cells[cells.length - 1].col + 1;
  return { year, cells, numWeeks };
}

// Ay sınırı: komşu hücre (spatial) farklı ayda ya da grid dışıysa o kenara siyah çizgi.
function monthOf(date) {
  return date.getUTCMonth();
}
function edges(cell, year) {
  const { date, row } = cell;
  const t = date.getTime();
  const jan1 = Date.UTC(year, 0, 1);
  const dec31 = Date.UTC(year, 11, 31);
  const m = monthOf(date);
  const diffAt = (ms) => ms < jan1 || ms > dec31 || monthOf(new Date(ms)) !== m;
  return {
    top: row === 0 ? true : diffAt(t - DAY_MS),
    bottom: row === 6 ? true : diffAt(t + DAY_MS),
    left: diffAt(t - 7 * DAY_MS),
    right: diffAt(t + 7 * DAY_MS),
  };
}

export default function CalendarHeatmap({ stationId }) {
  const [days, setDays] = useState([]);
  const [metric, setMetric] = useState("pm25");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tip, setTip] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCalendar(stationId)
      .then((data) => {
        if (!cancelled) setDays(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stationId]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const d of days) map.set(d.day, d);
    return map;
  }, [days]);

  const years = useMemo(() => {
    const set = new Set(days.map((d) => Number(d.day.slice(0, 4))));
    if (set.size === 0) set.add(new Date().getUTCFullYear());
    return [...set].sort((a, b) => b - a).map(buildYear);
  }, [days]);

  function showTip(e, text) {
    const rect = wrapRef.current.getBoundingClientRect();
    setTip({ text, left: e.clientX - rect.left, top: e.clientY - rect.top });
  }

  function cellContent(cell, x, y) {
    const data = byDay.get(cell.key);
    if (!data) return null;

    if (metric === "anomali") {
      const color = anomalyColor(data.anomaly_count, data.evaluated_count);
      if (!color) return null;
      const text =
        data.evaluated_count === 0
          ? `${cell.key} — değerlendirilmedi`
          : `${cell.key} — ${data.anomaly_count}/${data.evaluated_count} anomali`;
      return (
        <rect
          x={x}
          y={y}
          width={CELL}
          height={CELL}
          rx={2}
          fill={color}
          onMouseMove={(e) => showTip(e, text)}
          onMouseLeave={() => setTip(null)}
        />
      );
    }

    const q1 = data[`${metric}_q1`];
    const q2 = data[`${metric}_q2`];
    const q3 = data[`${metric}_q3`];
    if (q2 === null || q2 === undefined) return null;

    // Sağa yatık (/) şeritler, ters köşegene paralel iki çizgiyle üç bölge:
    //   Q1 = üst-sol üçgen (en açık), Q2 = orta band, Q3 = alt-sağ üçgen (en koyu).
    // Her şerit kendi çeyrek değerine göre boyanır (konumdan bağımsız).
    // Q1 = üst-sol üçgen, Q3 = alt-sağ üçgen; Q2 = kalan bölge = ALTIGEN
    // (üst-sağ ve alt-sol köşeler dahil, aksi halde o köşeler boş/gri kalırdı).
    const a = 1 / 3;
    const q1poly = `${x},${y} ${x + 2 * a * CELL},${y} ${x},${y + 2 * a * CELL}`;
    const q2poly = `${x + 2 * a * CELL},${y} ${x + CELL},${y} ${x + CELL},${y + a * CELL} ${x + a * CELL},${y + CELL} ${x},${y + CELL} ${x},${y + 2 * a * CELL}`;
    const q3poly = `${x + CELL},${y + a * CELL} ${x + CELL},${y + CELL} ${x + a * CELL},${y + CELL}`;
    const text = `${cell.key} — Q1:${Math.round(q1)} < Q2:${Math.round(q2)} < Q3:${Math.round(q3)}`;
    const handlers = {
      onMouseMove: (e) => showTip(e, text),
      onMouseLeave: () => setTip(null),
    };
    return (
      <g {...handlers}>
        <polygon points={q1poly} fill={pmColor(metric, q1)} />
        <polygon points={q2poly} fill={pmColor(metric, q2)} />
        <polygon points={q3poly} fill={pmColor(metric, q3)} />
      </g>
    );
  }

  return (
    <div className="calendar" ref={wrapRef}>
      <div className="calendar-toggle">
        {METRICS.map((m) => (
          <button
            key={m.key}
            className={m.key === metric ? "cal-btn active" : "cal-btn"}
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {error && <div className="detail-error">{error}</div>}
      {loading && <div className="detail-loading">Yükleniyor…</div>}

      {!loading && !error && (
        <div className="calendar-scroll">
          {years.map(({ year, cells, numWeeks }) => {
            const width = GUTTER_LEFT + numWeeks * PITCH + 4;
            const height = PAD_TOP + 7 * PITCH + 2;
            const monthFirst = new Map();
            for (const c of cells) {
              if (!monthFirst.has(c.month)) monthFirst.set(c.month, c.col);
            }
            return (
              <div className="calendar-year" key={year}>
                <div className="calendar-year-label">{year}</div>
                <svg width={width} height={height}>
                  {WEEKDAY_LABELS.map((lbl, r) => (
                    <text
                      key={r}
                      x={2}
                      y={PAD_TOP + r * PITCH + CELL - 2}
                      className="cal-axis"
                    >
                      {lbl}
                    </text>
                  ))}
                  {[...monthFirst.entries()].map(([m, col]) => (
                    <text
                      key={m}
                      x={GUTTER_LEFT + col * PITCH}
                      y={PAD_TOP - 6}
                      className="cal-axis"
                    >
                      {MONTH_LABELS[m]}
                    </text>
                  ))}
                  {cells.map((cell) => {
                    const x = GUTTER_LEFT + cell.col * PITCH;
                    const y = PAD_TOP + cell.row * PITCH;
                    const ed = edges(cell, year);
                    return (
                      <g key={cell.key}>
                        <rect
                          x={x}
                          y={y}
                          width={CELL}
                          height={CELL}
                          rx={2}
                          fill={EMPTY}
                        />
                        {cellContent(cell, x, y)}
                        {ed.top && (
                          <line x1={x} y1={y} x2={x + CELL} y2={y} className="cal-edge" />
                        )}
                        {ed.bottom && (
                          <line x1={x} y1={y + CELL} x2={x + CELL} y2={y + CELL} className="cal-edge" />
                        )}
                        {ed.left && (
                          <line x1={x} y1={y} x2={x} y2={y + CELL} className="cal-edge" />
                        )}
                        {ed.right && (
                          <line x1={x + CELL} y1={y} x2={x + CELL} y2={y + CELL} className="cal-edge" />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })}
        </div>
      )}

      {tip && (
        <div className="calendar-tip" style={{ left: tip.left, top: tip.top }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}

// leaflet-velocity, GRIB2 tarzı U/V bileşenli grid JSON'u bekler.
// Marmara Bölgesi bbox'u (lib/geoUtils.js#MARMARA_BOUNDS, CAMS füzyon katmanıyla paylaşılıyor)
// için gerçek bir 3x3 grid oluşturuyoruz (tek nokta ile interpolasyon imkansız —
// leaflet-velocity nx-1/ny-1'e bölerek komşu noktalar arasında bilinear interpolasyon yapıyor;
// alan büyüdükçe 2x2 tüm bölgede tek düzgün akış verir, bu yüzden 3x3'e çıkarıldı).
import { MARMARA_BOUNDS } from "../lib/geoUtils.js";

const NORTH_LAT = MARMARA_BOUNDS.maxLat;
const SOUTH_LAT = MARMARA_BOUNDS.minLat;
const WEST_LON = MARMARA_BOUNDS.minLng;
const EAST_LON = MARMARA_BOUNDS.maxLng;
const MID_LAT = (NORTH_LAT + SOUTH_LAT) / 2;
const MID_LON = (WEST_LON + EAST_LON) / 2;

export const WIND_GRID = {
  nx: 3,
  ny: 3,
  // Sıra önemli: satır satır, kuzeyden güneye; her satırda batıdan doğuya.
  points: [
    { lat: NORTH_LAT, lon: WEST_LON },
    { lat: NORTH_LAT, lon: MID_LON },
    { lat: NORTH_LAT, lon: EAST_LON },
    { lat: MID_LAT, lon: WEST_LON },
    { lat: MID_LAT, lon: MID_LON },
    { lat: MID_LAT, lon: EAST_LON },
    { lat: SOUTH_LAT, lon: WEST_LON },
    { lat: SOUTH_LAT, lon: MID_LON },
    { lat: SOUTH_LAT, lon: EAST_LON },
  ],
};

export function getCurrentHourIndex(times) {
  const now = new Date();
  let index = times.findIndex((t) => new Date(t) > now) - 1;
  if (index < 0) index = 0;
  return index;
}

// speed: m/s, direction: meteorolojik derece (rüzgarın geldiği yön, saat yönü, kuzey=0)
function toUV(speed, direction) {
  const rad = (direction * Math.PI) / 180;
  return {
    u: -speed * Math.sin(rad),
    v: -speed * Math.cos(rad),
  };
}

// openMeteoResponses: /v1/forecast çoklu konum yanıtı (sıra WIND_GRID.points ile aynı) →
// leaflet-velocity'nin data: [uLayer, vLayer] formatı + grid'in orta noktasının ham
// hız/yön değeri (İstanbul/Marmara'yı temsilen tek özet nokta, widget kartında gösterilir).
export function parseWindData(openMeteoResponses) {
  const pointCount = WIND_GRID.points.length;
  if (!Array.isArray(openMeteoResponses) || openMeteoResponses.length !== pointCount) {
    return null;
  }

  const times = openMeteoResponses[0]?.hourly?.time;
  if (!times?.length) return null;
  const index = getCurrentHourIndex(times);

  const uData = [];
  const vData = [];
  let center = null;
  const centerIndex = Math.floor(pointCount / 2);
  for (let i = 0; i < openMeteoResponses.length; i++) {
    const res = openMeteoResponses[i];
    const speed = res.hourly?.wind_speed_10m?.[index];
    const direction = res.hourly?.wind_direction_10m?.[index];
    if (speed == null || direction == null) return null;
    if (i === centerIndex) center = { speed, direction };
    const { u, v } = toUV(speed, direction);
    uData.push(u);
    vData.push(v);
  }

  const { nx, ny } = WIND_GRID;
  const lo1 = WIND_GRID.points[0].lon;
  const la1 = WIND_GRID.points[0].lat;
  const lo2 = WIND_GRID.points[pointCount - 1].lon;
  const la2 = WIND_GRID.points[pointCount - 1].lat;
  const dx = (lo2 - lo1) / (nx - 1);
  const dy = (la1 - la2) / (ny - 1);
  const refTime = times[index];

  const baseHeader = {
    parameterUnit: "m.s-1",
    parameterCategory: 2,
    la1,
    lo1,
    la2,
    lo2,
    dx,
    dy,
    nx,
    ny,
    refTime,
    forecastTime: 0,
    numberPoints: nx * ny,
  };

  return [
    {
      header: { ...baseHeader, parameterNumber: 2, parameterNumberName: "Eastward wind" },
      data: uData,
    },
    {
      header: { ...baseHeader, parameterNumber: 3, parameterNumberName: "Northward wind" },
      data: vData,
    },
    center,
  ];
}

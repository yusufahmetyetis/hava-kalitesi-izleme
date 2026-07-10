import { CircleMarker, Tooltip } from "react-leaflet";
import { aqiColor } from "../lib/aqi.js";
import { useOpenMeteoData } from "../hooks/useOpenMeteoData.js";

const ISTANBUL_CENTER = [41.01, 28.98];

// İstanbul geneli için tek bir model tahmini göstergesi (CAMS ~11 km çözünürlük).
// İstasyon ölçümü değildir — 3a/3c'deki StationMarker'lardan bilinçli olarak ayrı tutulur.
export default function OpenMeteoLayer() {
  const { data, error } = useOpenMeteoData();

  if (error || !data || data.european_aqi == null) return null;

  return (
    <CircleMarker
      center={ISTANBUL_CENTER}
      radius={22}
      pathOptions={{
        color: "#333",
        weight: 2,
        fillColor: aqiColor(data.european_aqi),
        fillOpacity: 0.7,
        dashArray: "4 3",
      }}
    >
      <Tooltip direction="top" offset={[0, -10]}>
        Open-Meteo Model AQI: {data.european_aqi} — Bu değer CAMS modelinden türetilmiştir,
        ölçüm değildir.
      </Tooltip>
    </CircleMarker>
  );
}

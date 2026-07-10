import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";
import { aqiColor } from "../lib/aqi.js";
import { computeDistrictAQI } from "../lib/districtMapping.js";

const NO_DATA_COLOR = "#cccccc";

function districtStyle(districtAQI) {
  return (feature) => {
    const aqi = districtAQI[feature.properties.name];
    return {
      color: "#888",
      weight: 1,
      fillColor: aqi != null ? aqiColor(aqi) : NO_DATA_COLOR,
      fillOpacity: aqi != null ? 0.5 : 0.4,
    };
  };
}

// İstasyonların altında, marker/heatmap/anomali katmanlarının üstüne çıkmayan
// ilçe özet katmanı. Veri kapsamayan ilçeler soluk gri gösterilir.
export default function DistrictLayer({ readings }) {
  const [geoJson, setGeoJson] = useState(null);

  useEffect(() => {
    fetch("/istanbul-ilceler.geojson")
      .then((res) => res.json())
      .then(setGeoJson)
      .catch(() => setGeoJson(null));
  }, []);

  if (!geoJson) return null;

  const districtAQI = computeDistrictAQI(readings);

  return (
    <GeoJSON
      key={JSON.stringify(districtAQI)}
      data={geoJson}
      style={districtStyle(districtAQI)}
      onEachFeature={(feature, layer) => {
        const name = feature.properties.name;
        const aqi = districtAQI[name];
        layer.bindTooltip(
          aqi != null ? `${name}: ${aqi} AQI` : `${name}: Veri yok`,
        );
      }}
    />
  );
}

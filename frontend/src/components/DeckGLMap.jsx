import { useEffect, useState } from "react";
import DeckGL from "@deck.gl/react";
import { ColumnLayer, GeoJsonLayer } from "@deck.gl/layers";
import { Map as MapLibreMap } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapStore } from "../store/mapStore.js";
import { getAQIColorRGB } from "../lib/aqiUtils.js";
import { normalizeStation } from "../lib/stationUtils.js";

// 2D'deki CartoDB Voyager ile aynı aile — token gerekmeyen ücretsiz vektör stil.
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const COLUMN_RADIUS_M = 400;
const ELEVATION_SCALE = 80; // AQI birimi başına metre (görsel abartı, gerçek yükseklik değil)

// AQI = sütun yüksekliği, kategori = renk. Şu an yalnızca "stations" ve "districts"
// katmanları 3D'de destekleniyor; heatmap/anomaliler/rüzgar 2D'ye özgü kalıyor.
export default function DeckGLMap({ readings, onSelect }) {
  const viewState = useMapStore((s) => s.viewState);
  const setViewState = useMapStore((s) => s.setViewState);
  const selectedStationId = useMapStore((s) => s.selectedStationId);
  const setSelectedStationId = useMapStore((s) => s.setSelectedStationId);
  const layers = useMapStore((s) => s.layers);

  const [districtGeoJson, setDistrictGeoJson] = useState(null);
  useEffect(() => {
    fetch("/istanbul-ilceler.geojson")
      .then((res) => res.json())
      .then(setDistrictGeoJson)
      .catch(() => setDistrictGeoJson(null));
  }, []);

  const deckLayers = [];

  if (layers.districts && districtGeoJson) {
    deckLayers.push(
      new GeoJsonLayer({
        id: "districts-3d",
        data: districtGeoJson,
        stroked: true,
        filled: true,
        getFillColor: [200, 200, 200, 40],
        getLineColor: [120, 120, 120, 150],
        lineWidthMinPixels: 1,
      }),
    );
  }

  if (layers.stations) {
    // normalizeStation ile aynı şekilden okunuyor (bkz. StationMarker.jsx, 2D tarafı);
    // ham `reading`'i rawById üzerinden tutuyoruz ki tıklamada DetailPanel'in ihtiyaç
    // duyduğu tüm alanlar (pollutant değerleri, filtered.is_anomaly vb.) kaybolmasın.
    const rawById = new Map(readings.map((r) => [r.station_id, r]));
    const stationData = readings
      .map(normalizeStation)
      .filter((s) => s.lat != null && s.lng != null);

    deckLayers.push(
      new ColumnLayer({
        id: "stations-3d",
        data: stationData,
        diskResolution: 12,
        radius: COLUMN_RADIUS_M,
        elevationScale: ELEVATION_SCALE,
        extruded: true,
        pickable: true,
        getPosition: (d) => [d.lng, d.lat],
        getElevation: (d) => d.aqi ?? 0,
        getFillColor: (d) =>
          d.id === selectedStationId
            ? [255, 255, 255, 230]
            : [...getAQIColorRGB(d.aqi), 210],
        onClick: ({ object }) => {
          if (!object) return;
          setSelectedStationId(object.id);
          onSelect?.(rawById.get(object.id));
        },
        updateTriggers: {
          getFillColor: [selectedStationId],
        },
      }),
    );
  }

  return (
    <DeckGL
      viewState={viewState}
      controller={true}
      onViewStateChange={({ viewState: vs }) => setViewState(vs)}
      layers={deckLayers}
    >
      <MapLibreMap mapStyle={MAP_STYLE} reuseMaps />
    </DeckGL>
  );
}

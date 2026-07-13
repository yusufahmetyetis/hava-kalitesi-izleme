import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import StationMarker from "./StationMarker.jsx";
import HeatLayer from "./HeatLayer.jsx";
import AnomalyLayer from "./AnomalyLayer.jsx";
import DistrictLayer from "./DistrictLayer.jsx";
import WindLayer from "./WindLayer.jsx";
import HexbinLayer from "./HexbinLayer.jsx";
import { useMapStore } from "../store/mapStore.js";
import { leafletToViewState, viewStateToLeaflet } from "../lib/geoUtils.js";
import { normalizeStation } from "../lib/stationUtils.js";

const FLYTO_ZOOM = 13;

// Türkiye geneli pan sınırı (güneyde Akdeniz — kuzeyde Karadeniz kıyısı,
// batıda Ege — doğu sınırı). Kıyıları biraz taşan makul bir dikdörtgen.
const TURKEY_BOUNDS = [
  [35.8, 25.5],
  [42.3, 44.8],
];

// Seçili istasyon değişince haritayı animasyonlu olarak o konuma kaydır.
function MapFlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target && target.lat != null && target.lng != null) {
      map.flyTo([target.lat, target.lng], FLYTO_ZOOM, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

// Leaflet'in konum/zoom'unu useMapStore'a yazar — 3D görünüme geçince aynı yerden devam
// edilsin diye (bkz. store/mapStore.js, lib/geoUtils.js).
function MapViewStateSync() {
  const map = useMap();
  const setViewState = useMapStore((s) => s.setViewState);
  useEffect(() => {
    function onMoveEnd() {
      setViewState(leafletToViewState({ center: map.getCenter(), zoom: map.getZoom() }));
    }
    map.on("moveend", onMoveEnd);
    return () => map.off("moveend", onMoveEnd);
  }, [map, setViewState]);
  return null;
}

export default function MapView({ readings, onSelect, selected }) {
  const layers = useMapStore((s) => s.layers);
  // Sadece ilk mount'ta kullanılır (react-leaflet center/zoom prop değişikliğini izlemez) —
  // 3D'den 2D'ye dönünce store'daki son konumdan devam eder.
  const initialViewState = useMapStore((s) => s.viewState);
  const { center, zoom } = viewStateToLeaflet(initialViewState);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={6}
      maxBounds={TURKEY_BOUNDS}
      maxBoundsViscosity={0.7}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />

      {layers.districts && <DistrictLayer readings={readings} />}
      {layers.heatmap && <HeatLayer readings={readings} />}
      {layers.anomalies && <AnomalyLayer readings={readings} />}
      {layers.stations &&
        readings.map((r) => (
          <StationMarker key={r.station_id} reading={r} onSelect={onSelect} />
        ))}
      {layers.wind && <WindLayer />}
      {layers.hexbin && <HexbinLayer stations={readings.map(normalizeStation)} />}

      <MapFlyTo target={selected} />
      <MapViewStateSync />
    </MapContainer>
  );
}

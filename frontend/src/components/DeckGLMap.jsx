import { useEffect, useState } from "react";
import DeckGL from "@deck.gl/react";
import { ColumnLayer, GeoJsonLayer } from "@deck.gl/layers";
import { TerrainLayer } from "@deck.gl/geo-layers";
import { Map as MapLibreMap } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapStore } from "../store/mapStore.js";
import { getAQIColorRGB } from "../lib/aqiUtils.js";
import { normalizeStation } from "../lib/stationUtils.js";
import { clampToBounds } from "../lib/geoUtils.js";

// 2D'deki CartoDB Voyager ile aynı aile — token gerekmeyen ücretsiz vektör stil.
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const COLUMN_RADIUS_M = 150;
const ELEVATION_SCALE = 40; // AQI birimi başına metre (görsel abartı, gerçek yükseklik değil)

// Yönergedeki Re:Earth endpoint'i ölü çıktı (z0/0/0 dahil her istek 404) — AWS Open Data'nın
// herkese açık, ücretsiz, CORS destekli Terrarium arşivine geçildi (curl ile doğrulandı).
const TERRAIN_TILE_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
// Gerçek uydu görüntüsü yerine topoğrafik harita: CartoDB Voyager vektör-stil doku üzerinde
// topoğrafya seçilmiyordu (kullanıcı geri bildirimi), World Imagery'den de World Topo Map'e
// geçildi (kullanıcı tercihi — kabartma/gölgeleme + kontur çizgileri terrain'i World Imagery'nin
// düz uydu fotoğrafından daha iyi tamamlıyor). API key gerekmez, CORS destekli, aynı Esri
// ArcGIS Online REST şeması: {z}/{y}/{x} sırasında (standart XYZ'nin tersi).
const SURFACE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
const BASE_ELEVATION_DECODER = {
  rScaler: 256,
  gScaler: 1,
  bScaler: 1 / 256,
  offset: -32768,
};

// TerrainLayer'ın gerçekte bir `elevationScale` prop'u yok (deck.gl kaynağında tanımlı değil,
// sessizce yok sayılıyor) — yükseklik abartması için tek yol elevationDecoder'ın dört
// katsayısını da (r/g/bScaler + offset) aynı faktörle ölçeklemek (height = R*rScaler +
// G*gScaler + B*bScaler + offset olduğundan, hepsi çarpılmazsa oran bozulur).
function scaledElevationDecoder(factor) {
  return {
    rScaler: BASE_ELEVATION_DECODER.rScaler * factor,
    gScaler: BASE_ELEVATION_DECODER.gScaler * factor,
    bScaler: BASE_ELEVATION_DECODER.bScaler * factor,
    offset: BASE_ELEVATION_DECODER.offset * factor,
  };
}
// 2D'deki minZoom=6 ile tutarlı. maxZoom=15 — AWS Terrarium arşivinin gerçek tavanı bu
// (z16+ test edildi, 404 dönüyor); pan artık Türkiye'ye kilitli olduğundan (clampToBounds)
// dünya geneli tile yükü riski yok, bu yüzden önceki z13 sınırını (bulanıklaştırıyordu) bu
// gerçek tavana çıkarabiliyoruz. Doku (uydu görüntüsü) da aynı z/x/y'den geldiği için
// çözünürlüğü bu tavanla birlikte sınırlı.
const TERRAIN_MIN_ZOOM = 6;
const TERRAIN_MAX_ZOOM = 15;
// Nesne referansı her render'da değişmesin diye modül seviyesinde sabit — DeckGL'in
// controller prop'unu inline obje olarak geçmek her render'da gereksiz yeniden kuruluma
// yol açabiliyor. maxPitch varsayılanı 60° — ufka daha yakın/yatay bakabilmek için 85'e
// çıkarıldı (90'a çok yaklaşmak render kırpma sorunlarına yol açabildiğinden tam 90 değil).
const CONTROLLER_OPTIONS = { minZoom: TERRAIN_MIN_ZOOM, maxZoom: 18, minPitch: 0, maxPitch: 85 };

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

  // Yükseklik abartma faktörü — görünüme özel geçici bir ayar, store'a değil local state'e
  // bağlı (bkz. yönerge kısıtı: "elevationScale slider'ı store'a değil local state'e bağla").
  const [terrainExaggeration, setTerrainExaggeration] = useState(2);

  const deckLayers = [];

  if (layers.terrain) {
    // Diğer katmanların altına (dizinin başına) eklenir ki AQI sütunları/ilçe zemini
    // terrain yüzeyinin üzerinde görünsün.
    // BİLİNEN SINIRLAMA: belli bir seviyeden fazla uzaklaşınca uydu dokusu bulanıklaşıyor
    // (WebGL texture minification, mipmap yok). Sebebi araştırıldı: alttaki SimpleMeshLayer
    // bir `textureParameters` prop'u destekliyor ama TerrainLayer kendi renderSubLayers()
    // içinde bunu iletmiyor ve defaultProps'unda da yok (@deck.gl/geo-layers v9.3.6) — yani
    // dışarıdan mipmap/filtreleme ayarı yapılamıyor. Kütüphanenin kendi API boşluğu; internal
    // API'ye müdahale etmeden düzeltilemiyor, kullanıcı onayıyla bilinen sınırlama kabul edildi.
    deckLayers.push(
      // id'ye faktörü gömüyoruz: deck.gl'in tiled terrain önbelleği elevationDecoder
      // referans değişikliğini zaten yüklü tile'lar için otomatik geçersiz kılmıyor;
      // id değişince katman komple yeniden kuruluyor, tüm tile'lar yeni ölçekle çekiliyor.
      new TerrainLayer({
        id: `terrain-${terrainExaggeration}`,
        minZoom: TERRAIN_MIN_ZOOM,
        maxZoom: TERRAIN_MAX_ZOOM,
        elevationDecoder: scaledElevationDecoder(terrainExaggeration),
        elevationData: TERRAIN_TILE_URL,
        texture: SURFACE_TILE_URL,
        wireframe: false,
        color: [255, 255, 255],
        // Gölgeleme (Phong) bilinçli olarak açık bırakıldı — kullanıcı geri bildirimi: dokusuz
        // (unlit) halde yükseklik farkları neredeyse fark edilmiyordu. Varsayılan
        // ambient:0.35/diffuse:0.6 ışığa ters yüzeyleri fazla karartıyordu (bkz. phong-material.js
        // defaultUniforms); ambient'i yükseltip specular'ı kapatarak genel karanlığı azaltırken
        // eğime bağlı diffuse kontrastı (yükseklik okunabilirliği) koruyoruz.
        material: { ambient: 0.6, diffuse: 0.6, shininess: 1, specularColor: [0, 0, 0] },
      }),
    );
  }

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
    <>
      <DeckGL
        viewState={viewState}
        controller={CONTROLLER_OPTIONS}
        onViewStateChange={({ viewState: vs }) => setViewState(clampToBounds(vs))}
        layers={deckLayers}
      >
        <MapLibreMap mapStyle={MAP_STYLE} reuseMaps maxPitch={CONTROLLER_OPTIONS.maxPitch} />
      </DeckGL>

      {layers.terrain && (
        <div className="terrain-scale-control">
          <label htmlFor="terrain-exaggeration">
            Yükseklik abartması: {terrainExaggeration.toFixed(1)}x
          </label>
          <input
            id="terrain-exaggeration"
            type="range"
            min="1"
            max="3"
            step="0.5"
            value={terrainExaggeration}
            onChange={(e) => setTerrainExaggeration(Number(e.target.value))}
          />
        </div>
      )}
    </>
  );
}

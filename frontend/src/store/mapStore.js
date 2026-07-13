import { create } from "zustand";

// 2D (Leaflet) ve 3D (deck.gl) görünümleri arasında paylaşılan tek state kaynağı.
// viewState formatı deck.gl'inkiyle birebir aynı (longitude/latitude/zoom/pitch/bearing);
// Leaflet tarafı lib/geoUtils.js ile bu formata çevrilip okunuyor.
export const useMapStore = create((set) => ({
  activeView: "2d", // "2d" | "3d"
  setActiveView: (view) => set({ activeView: view }),

  viewState: {
    longitude: 28.95,
    latitude: 41.05,
    zoom: 11,
    pitch: 0,
    bearing: 0,
  },
  setViewState: (vs) => set((s) => ({ viewState: { ...s.viewState, ...vs } })),

  selectedStationId: null,
  setSelectedStationId: (id) => set({ selectedStationId: id }),

  activePollutant: "aqi", // "aqi" | "pm25" | "pm10" | "no2" | "o3"
  setActivePollutant: (p) => set({ activePollutant: p }),

  // Anahtarlar mevcut LayerControl'deki katmanlarla birebir eşleşiyor.
  layers: {
    stations: true,
    heatmap: false,
    anomalies: false,
    districts: false,
    wind: true,
    hexbin: false,
    terrain: true,
  },
  setLayerVisible: (key, visible) =>
    set((s) => ({ layers: { ...s.layers, [key]: visible } })),
  toggleLayer: (key) =>
    set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
}));

// Leaflet (2D) ve deck.gl (3D) arasında ortak konum/zoom çevirimi — saf, motor importu yok.

// center: Leaflet LatLng ({lat, lng}) ya da [lat, lng]
export function leafletToViewState({ center, zoom }) {
  const lat = Array.isArray(center) ? center[0] : center.lat;
  const lng = Array.isArray(center) ? center[1] : center.lng;
  return { longitude: lng, latitude: lat, zoom, pitch: 0, bearing: 0 };
}

export function viewStateToLeaflet({ longitude, latitude, zoom }) {
  return { center: [latitude, longitude], zoom };
}

// Türkiye geneli pan sınırı — 2D (Leaflet maxBounds) ve 3D (deck.gl viewState clamp)
// aynı kutuyu paylaşır (güneyde Akdeniz — kuzeyde Karadeniz kıyısı, batıda Ege — doğu
// sınırı; kıyıları biraz taşan makul bir dikdörtgen).
export const TURKEY_BOUNDS = { minLat: 35.8, minLng: 25.5, maxLat: 42.3, maxLng: 44.8 };

export function clampToBounds(viewState, bounds = TURKEY_BOUNDS) {
  return {
    ...viewState,
    latitude: Math.min(Math.max(viewState.latitude, bounds.minLat), bounds.maxLat),
    longitude: Math.min(Math.max(viewState.longitude, bounds.minLng), bounds.maxLng),
  };
}

// Marmara Bölgesi bbox'u — rüzgar ızgarası (windUtils.js) ve CAMS+istasyon füzyon katmanı
// (camsGridService.js) aynı kutuyu paylaşır, tekrar tanımlanmasın diye tek kaynak burası.
export const MARMARA_BOUNDS = { minLat: 39.8, maxLat: 41.5, minLng: 26.0, maxLng: 30.5 };

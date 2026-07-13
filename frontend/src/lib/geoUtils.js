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

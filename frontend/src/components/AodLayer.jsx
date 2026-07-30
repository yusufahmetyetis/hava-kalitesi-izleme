import { TileLayer } from "react-leaflet";

// NASA GIBS — MODIS Combined Value Added Aerosol Optical Depth (AOD).
// Uydudan aerosol optik derinliği; PM2.5 için dolaylı ama bilimsel bir vekildir
// (gece ışıkları gibi kentleşme vekillerinin aksine gerçek atmosfer ölçümüdür).
// EPSG:3857 "best" endpoint Leaflet ile birebir uyumlu (Web Mercator, XYZ karo).
// Ürün ~2 km çözünürlük → native max zoom 6; Leaflet daha yakında karoyu büyütür.
// AOD günlük üretilir ve ~1 gün gecikmeli gelir (bugünün karosu 404 döner, doğrulandı),
// o yüzden 2 gün geriye giderek kesin veri olan günü kullanıyoruz. Public servis,
// API anahtarı gerektirmez. Bulutlu bölgelerde veri boşluğu (şeffaf) olması normaldir.
const AOD_DATE = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);

export default function AodLayer() {
  return (
    <TileLayer
      url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Combined_Value_Added_AOD/default/${AOD_DATE}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`}
      attribution='Aerosol: <a href="https://earthdata.nasa.gov/gibs">NASA EOSDIS GIBS</a>'
      maxNativeZoom={6}
      maxZoom={19}
      opacity={0.7}
    />
  );
}

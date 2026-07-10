import StationSummary from "./StationSummary.jsx";
import WeatherCard from "./WeatherCard.jsx";
import StationRanking from "./StationRanking.jsx";
import CityAqiWidget from "./CityAqiWidget.jsx";

// Masaüstü docked panel. reading yoksa AQI sıralama listesi (üstünde şehir geneli
// Open-Meteo model AQI kartı), varsa özet + hava durumu + alta sabitlenmiş
// "Detayları Göster" butonu.
export default function DetailPanel({
  reading,
  readings,
  onSelect,
  onShowDetail,
  onClose,
  collapsed,
}) {
  const cls = `detail-panel${collapsed ? " collapsed" : ""}`;

  if (!reading) {
    return (
      <aside className={cls}>
        <div className="panel-scroll">
          <CityAqiWidget />
          <StationRanking readings={readings} onSelect={onSelect} />
        </div>
      </aside>
    );
  }

  return (
    <aside className={cls}>
      <button className="panel-close" onClick={onClose} aria-label="Kapat">
        ×
      </button>
      <div className="panel-scroll">
        <StationSummary reading={reading} />
        <WeatherCard reading={reading} />
      </div>
      <button className="btn-detail" onClick={onShowDetail}>
        Detayları Göster
      </button>
    </aside>
  );
}

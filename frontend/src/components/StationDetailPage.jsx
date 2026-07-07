import StationSummary from "./StationSummary.jsx";
import WeatherCard from "./WeatherCard.jsx";
import StationDetail from "./StationDetail.jsx";
import CalendarHeatmap from "./CalendarHeatmap.jsx";

// Tam sayfa istasyon detay ekranı (harita yok). Masaüstü ve mobil aynı deneyimi paylaşır.
export default function StationDetailPage({ reading, onBack }) {
  return (
    <div className="detail-page">
      <div className="detail-page-inner">
        <button className="btn-back" onClick={onBack}>
          ◀ Haritaya Dön
        </button>
        <StationSummary reading={reading} dominantAsBox />
        <WeatherCard reading={reading} />
        <StationDetail reading={reading} />
        <section className="chart-block">
          <h3>Günlük Dağılım Takvimi</h3>
          <CalendarHeatmap stationId={reading.station_id} />
        </section>
      </div>
    </div>
  );
}

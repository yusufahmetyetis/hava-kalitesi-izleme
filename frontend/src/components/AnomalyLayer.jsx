import { CircleMarker } from "react-leaflet";

// filtered.is_anomaly === true olan istasyonları kırmızı kesikli halkayla vurgular.
// İstasyonlar katmanından bağımsız çalışır.
export default function AnomalyLayer({ readings }) {
  const anomalies = readings.filter(
    (r) => r.filtered?.is_anomaly === true && r.lat != null && r.lng != null
  );

  return (
    <>
      {anomalies.map((r) => (
        <CircleMarker
          key={r.station_id}
          center={[r.lat, r.lng]}
          radius={18}
          pathOptions={{
            color: "#cc0033",
            weight: 3,
            dashArray: "5 5",
            fill: false,
          }}
          interactive={false}
        />
      ))}
    </>
  );
}

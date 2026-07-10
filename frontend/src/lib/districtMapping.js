// İstasyon -> İlçe sabit eşlemesi. Değiştirilmeyecek (bkz. docs/CLAUDE.md stage3-patch aşama 1).
export const STATION_DISTRICT_MAP = {
  4143: "Fatih",
  4144: "Eyüpsultan",
  4145: "Beşiktaş",
  4146: "Esenler",
  4147: "Kadıköy",
  4150: "Ümraniye",
  4151: "Üsküdar",
  5382: "Kağıthane",
  8152: "Başakşehir",
  8153: "Esenyurt",
  8154: "Kağıthane",
  8156: "Şişli",
  8158: "Şile",
  8159: "Bahçelievler",
  8161: "Üsküdar",
  8772: "Fatih",
  8773: "Üsküdar",
  9558: "Adalar",
  11610: "Sultanbeyli",
  11611: "Sultangazi",
  14843: "Esenler",
  900001: "Üsküdar", // Kandilli
  900002: "Silivri",
  900003: "Şişli",
};

// Birden fazla istasyon aynı ilçeye düşerse ortalama AQI kullanılır.
export function computeDistrictAQI(stations) {
  const districtData = {};
  for (const station of stations) {
    const district = STATION_DISTRICT_MAP[station.station_id ?? station.id];
    if (!district || station.aqi == null) continue;
    if (!districtData[district]) districtData[district] = [];
    districtData[district].push(station.aqi);
  }
  const result = {};
  for (const [district, values] of Object.entries(districtData)) {
    result[district] = Math.round(
      values.reduce((a, b) => a + b, 0) / values.length,
    );
  }
  return result;
}

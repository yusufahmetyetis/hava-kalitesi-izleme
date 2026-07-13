import { groupStationsByDistrict } from "./stationUtils.js";

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

export function computeDistrictAQI(stations) {
  return groupStationsByDistrict(stations, STATION_DISTRICT_MAP);
}

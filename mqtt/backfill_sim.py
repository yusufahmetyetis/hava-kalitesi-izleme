"""SİM (sim.csb.gov.tr) 1 yıllık saatlik geçmiş veri backfill scripti.

Kullanım (proje kökünden):
    python -m mqtt.backfill_sim --dir data/sim --dry-run
    python -m mqtt.backfill_sim --dir data/sim
    python -m mqtt.backfill_sim --file "Istanbul Sultangazi.xlsx"   # tek dosya testi

MQTT canlı akışına dokunmaz. compute_baseline/filter_reading/process_reading/category
mantığı mqtt.subscriber.handlers'dan İMPORT edilir, kopyalanmaz.
"""

import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import openpyxl
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from shared.db import get_session
from shared.models import RawReading, Station

from .subscriber.handlers import filter_reading, process_reading

ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")

# --- SİM dosya adı (xlsx stem) -> WAQI station_id eşlemesi ----------------------------------
# Değer: int (mevcut WAQI istasyonuna yaz) | "NEW" (yeni stations satırı) | None (belirsiz, TODO)
SIM_TO_WAQI: dict[str, int | str | None] = {
    "Istanbul Basaksehir": 8152,
    "Istanbul Esenyurt": 8153,
    # Kagithane/Uskudar: WAQI listesinde her ikisi için de 2 aday var (aynı ilçede 2 ayrı
    # fiziksel SİM istasyonu — attribution ikisinde de "Turkey National Air Quality Monitoring
    # Network", yani ağ kaynağı ayırt etmiyor). Kesin ayraç: WAQI'nin city.url slug'ında "mthm"
    # geçmesi — Excel'deki dahili istasyon adı da "...-MTHM" son ekiyle bitiyor, birebir eşleşiyor.
    # 8154 -> .../kagithane/mthm, 8161 -> .../uskudar/mthm (5382/4151'de "mthm" yok).
    "Istanbul Kagithane": 8154,
    "Istanbul Kandilli": "NEW",  # WAQI listesinde eşleşen istasyon yok.
    "Istanbul Mecidiyekoy": 8156,
    "Istanbul Sile": 8158,
    "Istanbul Silivri": "NEW",  # WAQI listesinde eşleşen istasyon yok.
    "Istanbul Sirinevler": 8159,
    "Istanbul Sisli": "NEW",  # WAQI listesinde eşleşen istasyon yok.
    "Istanbul Sultanbeyli": 11610,
    "Istanbul Sultangazi": 11611,
    "Istanbul Umraniye": 4150,
    "Istanbul Uskudar": 8161,
    "Mobil 2": 14843,  # BİLİNEN KISIT (kullanıcı onayıyla kabul edildi, çözülmedi): SEYYAR
    #       istasyon. SİM dosyasındaki isim "Tuzla - Tershaneler" konumunu gösteriyor ama
    #       stations tablosundaki 14843 koordinatı (41.05,28.87) farklı bir yerde (muhtemelen
    #       aracın en son senkronize edilen konumu). 1 yıllık geçmiş veri boyunca araç muhtemelen
    #       hareket etti; bu bilgi dosyada yok. Sonuç: backfill edilen geçmiş ölçümler haritada/
    #       heatmap'te TEK SABİT (muhtemelen yanlış) konumda görünür. Takvim/zaman serisi
    #       grafiklerini etkilemez (konuma bağlı değiller).
}

# "NEW" işaretli istasyonlara sabit id (900000+). lat/lng bilinmiyor -> NULL
# (TODO: sim.csb.gov.tr'den koordinat bulunup elle doldurulabilir).
NEW_STATION_IDS: dict[str, int] = {
    "Istanbul Kandilli": 900001,
    "Istanbul Silivri": 900002,
    "Istanbul Sisli": 900003,
}

# --- Kolon başlığı normalizasyonu -> şema alanı ----------------------------------------------
# NOX, NO, CO bilinçli olarak alınmıyor (patch talimatı karar 1): şemada karşılığı yok / co NULL.
HEADER_TO_FIELD = {
    "PM10": "pm10",
    "PM2.5": "pm25",
    "SO2": "so2",
    "NO2": "no2",
    "O3": "o3",
}
TARGET_FIELDS = ("pm25", "pm10", "so2", "no2", "o3")


def normalize_header(raw_header: str) -> str | None:
    token = raw_header.split("(")[0].strip().replace(" ", "").upper()
    return HEADER_TO_FIELD.get(token)


# --- EPA breakpoint tabloları (µg/m³ -> AQI alt-endeksi), lineer enterpolasyon ----------------
# PM2.5/PM10 doğrudan µg/m³ kullanır. SO2/NO2/O3 için EPA tablosu ppb/ppm cinsinden; önce
# UGM3_TO_PPB ile dönüştürülür (25°C, 1 atm standart faktörler).
# PM2.5 sınırları frontend/src/lib/pmScale.js'teki kategori bantlarıyla ([9, 35.4, 55.4, 125.4])
# birebir tutarlı (2024 EPA revizyonu).
UGM3_TO_PPB = {"so2": 2.62, "no2": 1.88, "o3": 1.96}

EPA_BREAKPOINTS = {
    "pm25": [
        (0.0, 9.0, 0, 50),
        (9.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 125.4, 151, 200),
        (125.5, 225.4, 201, 300),
        (225.5, 325.4, 301, 500),
    ],
    "pm10": [
        (0, 54, 0, 50),
        (55, 154, 51, 100),
        (155, 254, 101, 150),
        (255, 354, 151, 200),
        (355, 424, 201, 300),
        (425, 504, 301, 400),
        (505, 604, 401, 500),
    ],
    "so2": [
        (0, 35, 0, 50),
        (36, 75, 51, 100),
        (76, 185, 101, 150),
        (186, 304, 151, 200),
        (305, 604, 201, 300),
        (605, 1004, 301, 400),
        (1005, 2004, 401, 500),
    ],
    "no2": [
        (0, 53, 0, 50),
        (54, 100, 51, 100),
        (101, 360, 101, 150),
        (361, 649, 151, 200),
        (650, 1249, 201, 300),
        (1250, 1649, 301, 400),
        (1650, 2049, 401, 500),
    ],
    # O3: EPA'nın 8 saatlik tablosu (AQI<=300) + 1 saatlik tablonun üst ucu (AQI>300)
    # birleştirilmiş yaklaşık bir tablo; saatlik ham veriden 8s/1s ayrımı yapılmıyor
    # (dokümante edilmiş basitleştirme, düzenleyici raporlama amaçlı değil).
    "o3": [
        (0, 54, 0, 50),
        (55, 70, 51, 100),
        (71, 85, 101, 150),
        (86, 105, 151, 200),
        (106, 200, 201, 300),
        (201, 404, 301, 400),
        (405, 504, 401, 500),
    ],
}


def sub_index(field: str, conc_ugm3: float | None) -> int | None:
    if conc_ugm3 is None or conc_ugm3 < 0:
        return None
    conc = conc_ugm3 / UGM3_TO_PPB[field] if field in UGM3_TO_PPB else conc_ugm3
    for c_lo, c_hi, i_lo, i_hi in EPA_BREAKPOINTS[field]:
        if conc <= c_hi:
            return round((i_hi - i_lo) / (c_hi - c_lo) * (conc - c_lo) + i_lo)
    return 500  # tablo üstü -> tavan


def parse_decimal(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if text in ("", "-"):
        return None
    # Türkçe sayı biçimi: "." binlik ayracı, "," ondalık ayracı (örn. "1.461,15" -> 1461.15).
    return float(text.replace(".", "").replace(",", "."))


def round_to_hour(dt: datetime) -> datetime:
    dt = dt.replace(second=0, microsecond=0)
    if dt.minute >= 30:
        return dt.replace(minute=0) + timedelta(hours=1)
    return dt.replace(minute=0)


def resolve_new_stations(session) -> None:
    for sim_name, new_id in NEW_STATION_IDS.items():
        stmt = pg_insert(Station).values(id=new_id, name=f"{sim_name} (SİM)", lat=None, lng=None)
        stmt = stmt.on_conflict_do_nothing(index_elements=[Station.id])
        session.execute(stmt)


def load_existing_measured_ats(session, station_id: int) -> set[datetime]:
    rows = session.execute(
        select(RawReading.measured_at).where(RawReading.station_id == station_id)
    ).scalars().all()
    return set(rows)


def process_file(session, path: Path, dry_run: bool) -> dict:
    stem = path.stem
    target = SIM_TO_WAQI.get(stem)
    if target is None:
        print("  [ATLANDI] WAQI eşlemesi belirsiz (TODO) — SIM_TO_WAQI güncellenmeli.")
        return {"skipped_unmapped": True}
    station_id = NEW_STATION_IDS[stem] if target == "NEW" else target

    # read_only=True KULLANILMIYOR: bu SİM dosyalarının sheet XML'inde dimension etiketi
    # eksik/hatalı, read_only modu bu yüzden yanlışlıkla tek satır/sütun algılıyor.
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)
    header1 = next(rows_iter)
    station_name_sim = header1[1] if len(header1) > 1 and header1[1] else stem
    header2 = next(rows_iter)

    field_by_col = {}
    for col_idx, header in enumerate(header2, start=1):
        if header is None:
            continue
        field = normalize_header(str(header))
        if field:
            field_by_col[col_idx] = field

    existing = load_existing_measured_ats(session, station_id)

    stats = dict(read=0, written=0, skipped_dup=0, skipped_empty=0, anomalies=0)
    parsed_rows = []
    for row in rows_iter:
        raw_dt = row[0]
        if raw_dt is None:
            continue
        stats["read"] += 1

        measured_at_naive = round_to_hour(raw_dt)
        measured_at = measured_at_naive.replace(tzinfo=ISTANBUL_TZ)

        concentrations = {}
        for col_idx, field in field_by_col.items():
            val = row[col_idx - 1] if col_idx - 1 < len(row) else None
            concentrations[field] = parse_decimal(val)

        sub_indices = {f: sub_index(f, concentrations.get(f)) for f in TARGET_FIELDS}
        present = {f: v for f, v in sub_indices.items() if v is not None}
        if not present:
            stats["skipped_empty"] += 1
            continue

        if measured_at in existing:
            stats["skipped_dup"] += 1
            continue

        aqi = max(present.values())
        dominant = max(present, key=present.get)
        parsed_rows.append((measured_at, concentrations, sub_indices, aqi, dominant))

    wb.close()
    parsed_rows.sort(key=lambda r: r[0])  # baseline hesabı için kronolojik sıra şart

    stats["written"] = len(parsed_rows)
    if dry_run:
        return stats

    for i, (measured_at, concentrations, sub_indices, aqi, dominant) in enumerate(parsed_rows):
        raw = RawReading(
            station_id=station_id,
            station_name=station_name_sim,
            measured_at=measured_at,
            pm25=sub_indices["pm25"],
            pm10=sub_indices["pm10"],
            o3=sub_indices["o3"],
            no2=sub_indices["no2"],
            so2=sub_indices["so2"],
            co=None,
            temperature=None,
            humidity=None,
            wind=None,
            aqi=aqi,
            dominant=dominant,
            raw_payload={
                "source": "sim_csb",
                "concentrations": concentrations,
                "station_name_sim": station_name_sim,
            },
        )
        session.add(raw)
        session.flush()  # raw.id + baseline sorgusunun bu satırı görmesi için

        process_reading(session, raw)

        payload = {
            "aqi": raw.aqi,
            "pm25": raw.pm25,
            "pm10": raw.pm10,
            "o3": raw.o3,
            "no2": raw.no2,
            "so2": raw.so2,
            "co": raw.co,
            "dominant": raw.dominant,
        }
        filtered = filter_reading(session, raw, payload)
        if filtered.is_anomaly:
            stats["anomalies"] += 1

        if (i + 1) % 1000 == 0:
            session.commit()

    session.commit()
    return stats


def main():
    parser = argparse.ArgumentParser(description="SİM CSB yıllık saatlik veri backfill")
    parser.add_argument("--dir", default="data/sim", help="SİM xlsx dosyalarının klasörü")
    parser.add_argument("--dry-run", action="store_true", help="DB'ye yazmadan özet göster")
    parser.add_argument("--file", help="Sadece belirtilen dosya adını işle (test için)")
    args = parser.parse_args()

    paths = sorted(Path(args.dir).glob("*.xlsx"))
    if args.file:
        paths = [p for p in paths if p.name == args.file]
        if not paths:
            print(f"Dosya bulunamadı: {args.file}")
            sys.exit(1)

    print(f"{len(paths)} dosya işlenecek. dry_run={args.dry_run}\n")

    summary = []
    with get_session() as session:
        if not args.dry_run:
            resolve_new_stations(session)
            session.commit()

        for path in paths:
            print(f"--- {path.name} ---")
            stats = process_file(session, path, args.dry_run)
            summary.append((path.name, stats))
            print(f"  {stats}\n")

    print("=== ÖZET ===")
    for name, stats in summary:
        print(f"{name}: {stats}")


if __name__ == "__main__":
    main()

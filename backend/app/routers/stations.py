from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..deps import get_db
from ..schemas.reading import CalendarDayOut, HistoryPointOut, LatestReadingOut
from ..schemas.station import StationOut
from ..services import stations as stations_service

router = APIRouter()

VALID_RANGES = {"24h", "7d", "30d"}


@router.get("/stations", response_model=list[StationOut])
def list_stations(db: Session = Depends(get_db)):
    return stations_service.list_stations(db)


@router.get("/stations/{station_id}/latest", response_model=LatestReadingOut)
def get_station_latest(station_id: int, db: Session = Depends(get_db)):
    result = stations_service.get_latest_for_station(db, station_id)
    if result is None:
        raise HTTPException(status_code=404, detail="İstasyon için veri bulunamadı")
    return result


@router.get("/stations/{station_id}/history", response_model=list[HistoryPointOut])
def get_station_history(station_id: int, range: str = "24h", db: Session = Depends(get_db)):
    if range not in VALID_RANGES:
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz range: {range!r}. Seçenekler: {sorted(VALID_RANGES)}",
        )
    return stations_service.get_history(db, station_id, range)


@router.get("/stations/{station_id}/calendar", response_model=list[CalendarDayOut])
def get_station_calendar(station_id: int, db: Session = Depends(get_db)):
    return stations_service.get_calendar(db, station_id)

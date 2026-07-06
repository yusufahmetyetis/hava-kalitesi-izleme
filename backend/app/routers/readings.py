from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..deps import get_db
from ..schemas.reading import AnomalyOut, LatestReadingOut
from ..services import readings as readings_service

router = APIRouter()


@router.get("/readings/latest", response_model=list[LatestReadingOut])
def get_all_latest(db: Session = Depends(get_db)):
    return readings_service.get_all_latest(db)


@router.get("/readings/anomalies", response_model=list[AnomalyOut])
def get_anomalies(limit: int = Query(50, ge=1, le=500), db: Session = Depends(get_db)):
    return readings_service.get_anomalies(db, limit)

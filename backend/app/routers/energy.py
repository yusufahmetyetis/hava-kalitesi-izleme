from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..deps import get_db, get_energy_db
from ..schemas.energy import (
    AqiCorrelationPointOut,
    ElectricityReadingOut,
    EnergyAnomalyOut,
    HouseholdOut,
)
from ..services import energy as energy_service

router = APIRouter(prefix="/energy")


@router.get("/households", response_model=list[HouseholdOut])
def list_households(energy_db: Session = Depends(get_energy_db)):
    return energy_service.list_households(energy_db)


@router.get("/readings/{household_code}", response_model=list[ElectricityReadingOut])
def get_readings(household_code: str, energy_db: Session = Depends(get_energy_db)):
    readings = energy_service.get_recent_readings(energy_db, household_code)
    if not readings:
        raise HTTPException(status_code=404, detail="Hane için veri bulunamadı")
    return readings


@router.get("/anomalies", response_model=list[EnergyAnomalyOut])
def get_anomalies(energy_db: Session = Depends(get_energy_db)):
    return energy_service.get_anomalies(energy_db, limit=50)


@router.get("/aqi-correlation", response_model=list[AqiCorrelationPointOut])
def get_aqi_correlation(
    energy_db: Session = Depends(get_energy_db), aqi_db: Session = Depends(get_db)
):
    return energy_service.get_aqi_correlation(energy_db, aqi_db)

from datetime import datetime

from pydantic import BaseModel


class HouseholdOut(BaseModel):
    id: int
    household_code: str
    description: str | None
    person_count: int | None
    home_type: str | None
    district: str | None
    neighborhood: str | None
    has_ac: bool | None
    has_electric_oven: bool | None
    has_gas_boiler: bool | None


class ElectricityReadingOut(BaseModel):
    measured_at: datetime
    device: str | None
    consumption_kwh: float | None


class EnergyAnomalyOut(BaseModel):
    household_code: str
    metric_key: str
    reading_type: str
    measured_at: datetime
    actual_value: float
    expected_value: float
    deviation_pct: float


class AqiCorrelationPointOut(BaseModel):
    hour: datetime
    avg_consumption_kwh: float | None
    avg_aqi: float | None

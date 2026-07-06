from pydantic import BaseModel


class StationOut(BaseModel):
    id: int
    name: str | None
    lat: float | None
    lng: float | None

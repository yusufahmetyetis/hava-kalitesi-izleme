from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Double,
    ForeignKey,
    Integer,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True)
    name = Column(Text)
    lat = Column(Double)
    lng = Column(Double)


class RawReading(Base):
    __tablename__ = "raw_readings"

    id = Column(BigInteger, primary_key=True)
    station_id = Column(Integer, ForeignKey("stations.id"))
    station_name = Column(Text)
    measured_at = Column(DateTime(timezone=True))
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())
    pm25 = Column(Double)
    pm10 = Column(Double)
    o3 = Column(Double)
    no2 = Column(Double)
    so2 = Column(Double)
    co = Column(Double)
    temperature = Column(Double)
    humidity = Column(Double)
    wind = Column(Double)
    aqi = Column(Integer)
    dominant = Column(Text)
    raw_payload = Column(JSONB)


class ProcessedReading(Base):
    __tablename__ = "processed_readings"

    id = Column(BigInteger, primary_key=True)
    raw_id = Column(BigInteger, ForeignKey("raw_readings.id"))
    station_id = Column(Integer)
    measured_at = Column(DateTime(timezone=True))
    computed_aqi = Column(Integer)
    category = Column(Text)
    is_anomaly = Column(Boolean)
    algo_version = Column(Text)
    processed_at = Column(DateTime(timezone=True), server_default=func.now())


class FilteredReading(Base):
    __tablename__ = "filtered_readings"

    id = Column(BigInteger, primary_key=True)
    raw_id = Column(BigInteger, ForeignKey("raw_readings.id"))
    station_id = Column(Integer)
    measured_at = Column(DateTime(timezone=True))
    baseline_mean = Column(Double)
    baseline_std = Column(Double)
    z_score = Column(Double)
    is_anomaly = Column(Boolean)
    is_valid = Column(Boolean)
    validity_notes = Column(Text)
    algo_version = Column(Text)
    filtered_at = Column(DateTime(timezone=True), server_default=func.now())

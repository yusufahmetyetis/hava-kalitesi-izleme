from shared.db import SessionLocal
from shared.energy_db import EnergySessionLocal


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_energy_db():
    db = EnergySessionLocal()
    try:
        yield db
    finally:
        db.close()

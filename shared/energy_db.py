import os
from contextlib import contextmanager

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# energy verileri ayrı bir veritabanında yaşıyor (aqi_db ile cross-database JOIN yapılamaz),
# bu yüzden ayrı bir engine/session gerekiyor.
ENERGY_DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/energy_demo"
)

energy_engine = create_engine(ENERGY_DATABASE_URL)
EnergySessionLocal = sessionmaker(bind=energy_engine)


@contextmanager
def get_energy_session():
    session = EnergySessionLocal()
    try:
        yield session
    finally:
        session.close()

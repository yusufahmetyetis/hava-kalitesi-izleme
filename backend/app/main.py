from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import energy, readings, stations

app = FastAPI(title="Hava Kalitesi İzleme BFF")

# Geliştirme ortamı: tüm origin'lere açık. Gerçek deploy'da kısıtlanacak (bkz. backend/CLAUDE.md).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stations.router)
app.include_router(readings.router)
app.include_router(energy.router)

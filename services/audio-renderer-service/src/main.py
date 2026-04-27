import logging
import os

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .config import settings
from .controllers import tasks_controller, voices_controller
from .database import close_db
from .services.voice_samples import generate_voice_samples

logging.basicConfig(level=logging.INFO)

os.makedirs(settings.AUDIO_STORAGE_PATH, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await generate_voice_samples()
    yield
    await close_db()


app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=settings.API_DESCRIPTION,
    lifespan=lifespan,
)

app.mount("/audio", StaticFiles(directory=settings.AUDIO_STORAGE_PATH), name="audio")

app.include_router(voices_controller.router)
app.include_router(tasks_controller.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

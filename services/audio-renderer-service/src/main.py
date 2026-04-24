import logging
import os

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .config import settings
from .controllers import tasks_controller, voices_controller
from .database import close_db, get_db
from .models.voice import HARDCODED_VOICES

logging.basicConfig(level=logging.INFO)

os.makedirs(settings.AUDIO_STORAGE_PATH, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _seed_voices()
    yield
    await close_db()


async def _seed_voices():
    db = get_db()
    for voice in HARDCODED_VOICES:
        existing = await db.voices.find_one({"id": voice.id})
        if not existing:
            await db.voices.insert_one(voice.model_dump())
            logging.info("Seeded voice: %s | %s | %s | %s", voice.id, voice.slug, voice.friendlyName, voice.description)
        else:
            logging.info("Voice already exists, skipping: %s | %s | %s | %s", voice.id, voice.slug, voice.friendlyName, voice.description)


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

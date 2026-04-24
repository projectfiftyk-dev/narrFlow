import logging

from elevenlabs import AsyncElevenLabs
from fastapi import APIRouter, HTTPException, Query, status

from ..config import settings
from ..database import get_db
from ..models.voice import Voice, VoiceUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voices", tags=["voices"])


@router.get("", response_model=list[Voice])
async def list_voices(language: str | None = Query(default=None, description="BCP-47 language code, e.g. 'ro', 'en'")):
    logger.debug("Fetching voices from ElevenLabs (language=%s)", language)
    client = AsyncElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
    response = await client.voices.search(language=language) if language else await client.voices.get_all()
    voices = [
        Voice(
            id=v.voice_id,
            slug=v.name.lower().replace(" ", "_"),
            friendlyName=v.name,
            description=(v.labels or {}).get("description", ""),
        )
        for v in response.voices
    ]
    logger.debug("Fetched %d voices from ElevenLabs", len(voices))
    return voices


@router.post("", response_model=Voice, status_code=status.HTTP_201_CREATED)
async def create_voice(
    voice: Voice,
    # current_user = Depends(require_role("SUPERADMIN")),  # uncomment to enforce SUPERADMIN-only
):
    logger.info("Creating voice: %s (%s)", voice.id, voice.friendlyName)
    db = get_db()
    existing = await db.voices.find_one({"id": voice.id})
    if existing:
        logger.warning("Voice already exists: %s", voice.id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Voice with id '{voice.id}' already exists.",
        )
    await db.voices.insert_one(voice.model_dump())
    logger.info("Voice created: %s", voice.id)
    return voice


@router.put("/{voice_id}", response_model=Voice)
async def update_voice(voice_id: str, update: VoiceUpdate):
    logger.info("Updating voice: %s", voice_id)
    db = get_db()
    changes = {k: v for k, v in update.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields to update.",
        )
    result = await db.voices.find_one_and_update(
        {"id": voice_id},
        {"$set": changes},
        projection={"_id": 0},
        return_document=True,
    )
    if not result:
        logger.warning("Voice not found for update: %s", voice_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice not found.")
    logger.info("Voice updated: %s, fields: %s", voice_id, list(changes.keys()))
    return result


@router.delete("/{voice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_voice(voice_id: str):
    logger.info("Deleting voice: %s", voice_id)
    db = get_db()
    result = await db.voices.delete_one({"id": voice_id})
    if result.deleted_count == 0:
        logger.warning("Voice not found for deletion: %s", voice_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice not found.")
    logger.info("Voice deleted: %s", voice_id)

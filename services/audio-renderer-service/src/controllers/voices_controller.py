from fastapi import APIRouter, HTTPException, status

from ..database import get_db
from ..models.voice import Voice, VoiceUpdate

router = APIRouter(prefix="/voices", tags=["voices"])


@router.get("", response_model=list[Voice])
async def list_voices():
    db = get_db()
    docs = await db.voices.find({}, {"_id": 0}).to_list(length=None)
    return docs


@router.post("", response_model=Voice, status_code=status.HTTP_201_CREATED)
async def create_voice(
    voice: Voice,
    # current_user = Depends(require_role("SUPERADMIN")),  # uncomment to enforce SUPERADMIN-only
):
    db = get_db()
    existing = await db.voices.find_one({"id": voice.id})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Voice with id '{voice.id}' already exists.",
        )
    await db.voices.insert_one(voice.model_dump())
    return voice


@router.put("/{voice_id}", response_model=Voice)
async def update_voice(voice_id: str, update: VoiceUpdate):
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice not found.")
    return result


@router.delete("/{voice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_voice(voice_id: str):
    db = get_db()
    result = await db.voices.delete_one({"id": voice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice not found.")

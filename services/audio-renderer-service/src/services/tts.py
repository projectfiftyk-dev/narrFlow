import asyncio
import logging
from datetime import datetime, timezone
from functools import partial

from elevenlabs import ElevenLabs, VoiceSettings

from ..config import settings
from ..database import get_db
from ..models.task import Emotion, SegmentInput, SegmentResult, TaskStatus
from .storage import audio_file_path, audio_url

logger = logging.getLogger(__name__)

# Maps each emotion to ElevenLabs VoiceSettings parameters.
# stability   — higher = more consistent/monotone, lower = more expressive/variable
# similarity_boost — higher = closer to the original voice clone
# style       — higher = more stylistic exaggeration (requires v2 model)
_EMOTION_SETTINGS: dict[Emotion, dict] = {
    Emotion.NEUTRAL:   {"stability": 0.75, "similarity_boost": 0.75, "style": 0.00},
    Emotion.HAPPY:     {"stability": 0.50, "similarity_boost": 0.80, "style": 0.60},
    Emotion.SAD:       {"stability": 0.85, "similarity_boost": 0.70, "style": 0.30},
    Emotion.ANGRY:     {"stability": 0.35, "similarity_boost": 0.90, "style": 0.80},
    Emotion.FEARFUL:   {"stability": 0.40, "similarity_boost": 0.75, "style": 0.50},
    Emotion.SURPRISED: {"stability": 0.45, "similarity_boost": 0.80, "style": 0.70},
}


def _synthesize_segment(text: str, voice_id: str, output_path: str, emotion: Emotion = Emotion.NEUTRAL) -> None:
    """Blocking ElevenLabs TTS call — runs in a thread pool executor."""
    client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
    extra = (
        {"voice_settings": VoiceSettings(**_EMOTION_SETTINGS[emotion])}
        if emotion != Emotion.NEUTRAL
        else {}
    )
    audio = client.text_to_speech.convert(
        voice_id=voice_id,
        text=text,
        model_id=settings.ELEVENLABS_MODEL,
        output_format="mp3_44100_128",
        **extra,
    )
    with open(output_path, "wb") as f:
        for chunk in audio:
            f.write(chunk)


async def process_tts_task(task_id: str, segments: list[SegmentInput]) -> None:
    db = get_db()
    now = datetime.now(timezone.utc)

    logger.info("Task %s starting processing — %d segment(s)", task_id, len(segments))

    await db.tts_tasks.update_one(
        {"taskId": task_id},
        {"$set": {"status": TaskStatus.PROCESSING, "updatedAt": now}},
    )

    results: list[SegmentResult] = []
    loop = asyncio.get_event_loop()

    try:
        for segment in sorted(segments, key=lambda s: s.segmentNumber):
            logger.debug(
                "Task %s — synthesizing segment %d with voice '%s'",
                task_id, segment.segmentNumber, segment.voiceId,
            )
            out_path = audio_file_path(task_id, segment.segmentNumber)
            await loop.run_in_executor(
                None,
                partial(_synthesize_segment, segment.text, segment.voiceId, out_path, segment.emotion),
            )
            results.append(
                SegmentResult(
                    segmentNumber=segment.segmentNumber,
                    audioUrl=audio_url(task_id, segment.segmentNumber),
                )
            )
            logger.debug("Task %s — segment %d done", task_id, segment.segmentNumber)

        await db.tts_tasks.update_one(
            {"taskId": task_id},
            {
                "$set": {
                    "status": TaskStatus.COMPLETED,
                    "result": [r.model_dump() for r in results],
                    "updatedAt": datetime.now(timezone.utc),
                }
            },
        )
        logger.info("Task %s completed (%d segments)", task_id, len(results))

    except Exception as exc:
        logger.exception("Task %s failed: %s", task_id, exc)
        await db.tts_tasks.update_one(
            {"taskId": task_id},
            {
                "$set": {
                    "status": TaskStatus.FAILED,
                    "error": str(exc),
                    "updatedAt": datetime.now(timezone.utc),
                }
            },
        )

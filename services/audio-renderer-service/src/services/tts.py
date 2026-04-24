import asyncio
import logging
from datetime import datetime, timezone
from functools import partial

from elevenlabs import ElevenLabs

from ..config import settings
from ..database import get_db
from ..models.task import SegmentInput, SegmentResult, TaskStatus
from .storage import audio_file_path, audio_url

logger = logging.getLogger(__name__)


def _synthesize_segment(text: str, voice_id: str, output_path: str) -> None:
    """Blocking ElevenLabs TTS call — runs in a thread pool executor."""
    client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
    audio = client.text_to_speech.convert(
        voice_id=voice_id,
        text=text,
        model_id=settings.ELEVENLABS_MODEL,
        output_format="mp3_44100_128",
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
                partial(_synthesize_segment, segment.text, segment.voiceId, out_path),
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

import asyncio
import logging
from datetime import datetime, timezone
from functools import partial

import azure.cognitiveservices.speech as speechsdk

from ..config import settings
from ..database import get_db
from ..models.task import SegmentInput, SegmentResult, TaskStatus
from .storage import audio_file_path, audio_url

logger = logging.getLogger(__name__)


def _synthesize_segment(text: str, voice_id: str, output_path: str) -> None:
    """Blocking Azure TTS call — runs in a thread pool executor."""
    speech_config = speechsdk.SpeechConfig(
        subscription=settings.AZURE_SPEECH_KEY,
        region=settings.AZURE_SPEECH_REGION,
    )
    speech_config.speech_synthesis_voice_name = voice_id
    audio_config = speechsdk.audio.AudioOutputConfig(filename=output_path)
    synthesizer = speechsdk.SpeechSynthesizer(
        speech_config=speech_config, audio_config=audio_config
    )
    result = synthesizer.speak_text_async(text).get()
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        details = result.cancellation_details
        raise RuntimeError(
            f"Azure TTS failed for voice '{voice_id}': {details.error_details}"
        )


async def process_tts_task(task_id: str, segments: list[SegmentInput]) -> None:
    db = get_db()
    now = datetime.now(timezone.utc)

    await db.tts_tasks.update_one(
        {"taskId": task_id},
        {"$set": {"status": TaskStatus.PROCESSING, "updatedAt": now}},
    )

    results: list[SegmentResult] = []
    loop = asyncio.get_event_loop()

    try:
        for segment in sorted(segments, key=lambda s: s.segmentNumber):
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

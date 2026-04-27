import asyncio
import logging
import os
from functools import partial

from elevenlabs import ElevenLabs

from ..config import settings
from ..models.voice import CURATED_VOICES
from .storage import test_audio_file_path

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = ["en", "ro"]

_SAMPLE_TEXTS = {
    "en": "Hi, I am {name} and I'm glad to assist you.",
    "ro": "Salut, eu sunt {name}. Cu ce vă pot ajuta astăzi?",
}


def _synthesize_sample(text: str, voice_id: str, output_path: str) -> None:
    """Blocking ElevenLabs call — runs in a thread pool executor."""
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


async def generate_voice_samples() -> None:
    """Generate test samples for all curated voices × supported languages on startup."""
    loop = asyncio.get_event_loop()
    for voice in CURATED_VOICES:
        for language in SUPPORTED_LANGUAGES:
            out_path = test_audio_file_path(voice.id, language)
            if os.path.exists(out_path):
                logger.info("Test sample exists, skipping: voice=%s lang=%s", voice.friendlyName, language)
                continue
            text = _SAMPLE_TEXTS[language].format(name=voice.friendlyName)
            logger.info("Generating test sample: voice=%s lang=%s", voice.friendlyName, language)
            try:
                await loop.run_in_executor(
                    None,
                    partial(_synthesize_sample, text, voice.id, out_path),
                )
                logger.info("Test sample saved: %s", out_path)
            except Exception as exc:
                logger.error(
                    "Failed to generate test sample for voice=%s lang=%s: %s",
                    voice.friendlyName, language, exc,
                )

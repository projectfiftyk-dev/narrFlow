import logging

from fastapi import APIRouter

from ..models.voice import CURATED_VOICES, Voice, VoiceTestSample
from ..services.storage import test_audio_url
from ..services.voice_samples import SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voices", tags=["voices"])


@router.get("", response_model=list[Voice])
async def list_voices():
    voices = [
        voice.model_copy(update={
            "tests": [
                VoiceTestSample(language=lang, url=test_audio_url(voice.id, lang))
                for lang in SUPPORTED_LANGUAGES
            ]
        })
        for voice in CURATED_VOICES
    ]
    logger.debug("Returning %d curated voices with test samples", len(voices))
    return voices

import logging
import os

from ..config import settings

logger = logging.getLogger(__name__)


def ensure_task_dir(task_id: str) -> str:
    path = os.path.join(settings.AUDIO_STORAGE_PATH, task_id)
    os.makedirs(path, exist_ok=True)
    logger.debug("Ensured task directory: %s", path)
    return path


def audio_file_path(task_id: str, segment_number: int) -> str:
    task_dir = ensure_task_dir(task_id)
    path = os.path.join(task_dir, f"{segment_number}.mp3")
    logger.debug("Audio file path — task=%s segment=%d: %s", task_id, segment_number, path)
    return path


def audio_url(task_id: str, segment_number: int) -> str:
    return f"{settings.AUDIO_BASE_URL}/{task_id}/{segment_number}.mp3"


def ensure_test_dir(voice_id: str, language: str) -> str:
    path = os.path.join(settings.AUDIO_STORAGE_PATH, "tests", voice_id, language)
    os.makedirs(path, exist_ok=True)
    logger.debug("Ensured test directory: %s", path)
    return path


def test_audio_file_path(voice_id: str, language: str) -> str:
    test_dir = ensure_test_dir(voice_id, language)
    return os.path.join(test_dir, "sample.mp3")


def test_audio_url(voice_id: str, language: str) -> str:
    return f"{settings.AUDIO_BASE_URL}/tests/{voice_id}/{language}/sample.mp3"

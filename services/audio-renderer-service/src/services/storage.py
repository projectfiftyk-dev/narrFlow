import os
from ..config import settings


def ensure_task_dir(task_id: str) -> str:
    path = os.path.join(settings.AUDIO_STORAGE_PATH, task_id)
    os.makedirs(path, exist_ok=True)
    return path


def audio_file_path(task_id: str, segment_number: int) -> str:
    task_dir = ensure_task_dir(task_id)
    return os.path.join(task_dir, f"{segment_number}.mp3")


def audio_url(task_id: str, segment_number: int) -> str:
    return f"{settings.AUDIO_BASE_URL}/{task_id}/{segment_number}.mp3"

import os
import pytest

import src.services.storage as storage_module
from src.services.storage import audio_file_path, audio_url, ensure_task_dir


@pytest.fixture(autouse=True)
def patch_storage_path(tmp_path, monkeypatch):
    monkeypatch.setattr(storage_module.settings, "AUDIO_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(storage_module.settings, "AUDIO_BASE_URL", "/audio")


def test_ensure_task_dir_creates_directory(tmp_path):
    task_id = "task-abc"
    result = ensure_task_dir(task_id)
    assert os.path.isdir(result)
    assert result == os.path.join(str(tmp_path), task_id)


def test_ensure_task_dir_idempotent(tmp_path):
    task_id = "task-idem"
    ensure_task_dir(task_id)
    ensure_task_dir(task_id)  # should not raise
    assert os.path.isdir(os.path.join(str(tmp_path), task_id))


def test_audio_file_path_returns_correct_path(tmp_path):
    path = audio_file_path("task-xyz", 3)
    expected = os.path.join(str(tmp_path), "task-xyz", "3.mp3")
    assert path == expected


def test_audio_file_path_creates_parent_directory(tmp_path):
    audio_file_path("task-newdir", 0)
    assert os.path.isdir(os.path.join(str(tmp_path), "task-newdir"))


def test_audio_url_format():
    url = audio_url("task-123", 0)
    assert url == "/audio/task-123/0.mp3"


def test_audio_url_segment_numbers():
    assert audio_url("t", 0) == "/audio/t/0.mp3"
    assert audio_url("t", 99) == "/audio/t/99.mp3"

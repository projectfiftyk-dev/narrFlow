import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from datetime import datetime, timezone

from src.models.task import SegmentInput, TaskStatus
from src.services.tts import process_tts_task


def _make_segment(number: int, voice_id: str = "en-US-JennyNeural") -> SegmentInput:
    return SegmentInput(
        segmentNumber=number,
        text=f"Segment {number} text.",
        voiceId=voice_id,
        personaId=f"persona_{number}",
    )


@pytest.fixture
def mock_db_collection():
    collection = MagicMock()
    collection.update_one = AsyncMock()
    db = MagicMock()
    db.tts_tasks = collection
    return db, collection


async def test_process_tts_task_success(tmp_path, monkeypatch, mock_db_collection):
    db, collection = mock_db_collection
    monkeypatch.setattr("src.services.tts.get_db", lambda: db)
    monkeypatch.setattr("src.services.tts._synthesize_segment", lambda t, v, p: None)
    monkeypatch.setattr("src.services.storage.settings.AUDIO_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr("src.services.tts.audio_file_path", lambda tid, n: str(tmp_path / f"{n}.mp3"))
    monkeypatch.setattr("src.services.tts.audio_url", lambda tid, n: f"/audio/{tid}/{n}.mp3")

    segments = [_make_segment(0), _make_segment(1)]
    await process_tts_task("task-123", segments)

    assert collection.update_one.call_count == 2

    first_call_filter, first_call_update = collection.update_one.call_args_list[0].args
    assert first_call_filter == {"taskId": "task-123"}
    assert first_call_update["$set"]["status"] == TaskStatus.PROCESSING

    second_call_filter, second_call_update = collection.update_one.call_args_list[1].args
    assert second_call_filter == {"taskId": "task-123"}
    assert second_call_update["$set"]["status"] == TaskStatus.COMPLETED

    result = second_call_update["$set"]["result"]
    assert len(result) == 2
    assert result[0]["segmentNumber"] == 0
    assert result[0]["audioUrl"] == "/audio/task-123/0.mp3"
    assert result[1]["segmentNumber"] == 1
    assert result[1]["audioUrl"] == "/audio/task-123/1.mp3"


async def test_process_tts_task_failure_marks_failed(tmp_path, monkeypatch, mock_db_collection):
    db, collection = mock_db_collection
    monkeypatch.setattr("src.services.tts.get_db", lambda: db)
    monkeypatch.setattr(
        "src.services.tts._synthesize_segment",
        lambda t, v, p: (_ for _ in ()).throw(RuntimeError("Azure TTS exploded")),
    )
    monkeypatch.setattr("src.services.tts.audio_file_path", lambda tid, n: str(tmp_path / f"{n}.mp3"))
    monkeypatch.setattr("src.services.tts.audio_url", lambda tid, n: f"/audio/{tid}/{n}.mp3")

    await process_tts_task("task-fail", [_make_segment(0)])

    last_update = collection.update_one.call_args_list[-1]
    _, update = last_update.args
    assert update["$set"]["status"] == TaskStatus.FAILED
    assert "Azure TTS exploded" in update["$set"]["error"]


async def test_process_tts_task_segments_ordered(tmp_path, monkeypatch, mock_db_collection):
    """Segments are processed in segmentNumber order regardless of input order."""
    db, collection = mock_db_collection
    processed_order: list[int] = []

    def fake_synth(text: str, voice_id: str, output_path: str) -> None:
        seg_num = int(text.split()[1])
        processed_order.append(seg_num)

    monkeypatch.setattr("src.services.tts.get_db", lambda: db)
    monkeypatch.setattr("src.services.tts._synthesize_segment", fake_synth)
    monkeypatch.setattr("src.services.tts.audio_file_path", lambda tid, n: str(tmp_path / f"{n}.mp3"))
    monkeypatch.setattr("src.services.tts.audio_url", lambda tid, n: f"/audio/{tid}/{n}.mp3")

    segments = [_make_segment(2), _make_segment(0), _make_segment(1)]
    await process_tts_task("task-order", segments)

    assert processed_order == [0, 1, 2]


def test_synthesize_segment_raises_on_azure_failure(monkeypatch):
    """_synthesize_segment propagates Azure SDK errors as RuntimeError."""
    import azure.cognitiveservices.speech as speechsdk

    mock_result = MagicMock()
    mock_result.reason = speechsdk.ResultReason.Canceled
    mock_result.cancellation_details.error_details = "Invalid subscription key."

    mock_future = MagicMock()
    mock_future.get.return_value = mock_result

    mock_synthesizer = MagicMock()
    mock_synthesizer.speak_text_async.return_value = mock_future

    with patch("src.services.tts.speechsdk.SpeechConfig"), \
         patch("src.services.tts.speechsdk.audio.AudioOutputConfig"), \
         patch("src.services.tts.speechsdk.SpeechSynthesizer", return_value=mock_synthesizer):
        from src.services.tts import _synthesize_segment
        with pytest.raises(RuntimeError, match="Azure TTS failed"):
            _synthesize_segment("Hello", "en-US-JennyNeural", "/tmp/out.mp3")

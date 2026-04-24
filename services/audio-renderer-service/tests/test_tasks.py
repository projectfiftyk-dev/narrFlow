import pytest
from datetime import datetime, timezone
from httpx import AsyncClient

from src.models.task import TaskStatus


SEGMENTS = [
    {
        "segmentNumber": 0,
        "text": "It was a dark and stormy night.",
        "voiceId": "en-US-JennyNeural",
        "tone": None,
        "personaId": "persona_abc",
        "transformationId": "transform_001",
    },
    {
        "segmentNumber": 1,
        "text": "She whispered his name into the silence.",
        "voiceId": "en-US-GuyNeural",
        "tone": None,
        "personaId": "persona_xyz",
        "transformationId": "transform_001",
    },
]


async def test_create_task_returns_202(http_client: AsyncClient):
    response = await http_client.post("/tts/tasks", json={"segments": SEGMENTS})
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "accepted"
    assert "taskId" in body
    assert len(body["taskId"]) > 0


async def test_create_task_stores_job_as_pending(http_client: AsyncClient, patch_db):
    response = await http_client.post("/tts/tasks", json={"segments": SEGMENTS})
    task_id = response.json()["taskId"]

    doc = await patch_db.tts_tasks.find_one({"taskId": task_id})
    assert doc is not None
    assert doc["status"] == TaskStatus.PENDING


async def test_poll_task_not_found_returns_404(http_client: AsyncClient):
    response = await http_client.get("/tts/tasks/nonexistent-id")
    assert response.status_code == 404


async def test_poll_task_pending(http_client: AsyncClient, patch_db):
    post = await http_client.post("/tts/tasks", json={"segments": SEGMENTS})
    task_id = post.json()["taskId"]

    # Set status to PENDING explicitly (background task may have run).
    await patch_db.tts_tasks.update_one(
        {"taskId": task_id}, {"$set": {"status": TaskStatus.PENDING}}
    )

    response = await http_client.get(f"/tts/tasks/{task_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["taskId"] == task_id
    assert body["status"] == TaskStatus.PENDING
    assert body.get("result") is None
    assert body.get("error") is None


async def test_poll_task_completed(http_client: AsyncClient, patch_db):
    post = await http_client.post("/tts/tasks", json={"segments": SEGMENTS})
    task_id = post.json()["taskId"]

    result = [
        {"segmentNumber": 0, "audioUrl": f"/audio/{task_id}/0.mp3"},
        {"segmentNumber": 1, "audioUrl": f"/audio/{task_id}/1.mp3"},
    ]
    await patch_db.tts_tasks.update_one(
        {"taskId": task_id},
        {"$set": {"status": TaskStatus.COMPLETED, "result": result}},
    )

    response = await http_client.get(f"/tts/tasks/{task_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == TaskStatus.COMPLETED
    assert len(body["result"]) == 2
    assert body["result"][0]["audioUrl"] == f"/audio/{task_id}/0.mp3"


async def test_poll_task_failed(http_client: AsyncClient, patch_db):
    post = await http_client.post("/tts/tasks", json={"segments": SEGMENTS})
    task_id = post.json()["taskId"]

    await patch_db.tts_tasks.update_one(
        {"taskId": task_id},
        {"$set": {"status": TaskStatus.FAILED, "error": "Azure TTS error on segment 0."}},
    )

    response = await http_client.get(f"/tts/tasks/{task_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == TaskStatus.FAILED
    assert "Azure TTS error" in body["error"]
    assert body.get("result") is None


async def test_get_content_not_found_returns_404(http_client: AsyncClient):
    response = await http_client.get("/tts/tasks/nonexistent-id/content")
    assert response.status_code == 404


async def test_get_content_completed(http_client: AsyncClient, patch_db):
    post = await http_client.post("/tts/tasks", json={"segments": SEGMENTS})
    task_id = post.json()["taskId"]

    result = [
        {"segmentNumber": 0, "audioUrl": f"/audio/{task_id}/0.mp3"},
        {"segmentNumber": 1, "audioUrl": f"/audio/{task_id}/1.mp3"},
    ]
    await patch_db.tts_tasks.update_one(
        {"taskId": task_id},
        {"$set": {"status": TaskStatus.COMPLETED, "result": result}},
    )

    response = await http_client.get(f"/tts/tasks/{task_id}/content")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == TaskStatus.COMPLETED
    assert len(body["segments"]) == 2

    seg0 = next(s for s in body["segments"] if s["segmentNumber"] == 0)
    assert seg0["text"] == SEGMENTS[0]["text"]
    assert seg0["personaId"] == "persona_abc"
    assert seg0["audioUrl"] == f"/audio/{task_id}/0.mp3"


async def test_get_content_not_completed_returns_no_segments(
    http_client: AsyncClient, patch_db
):
    post = await http_client.post("/tts/tasks", json={"segments": SEGMENTS})
    task_id = post.json()["taskId"]

    await patch_db.tts_tasks.update_one(
        {"taskId": task_id}, {"$set": {"status": TaskStatus.PROCESSING}}
    )

    response = await http_client.get(f"/tts/tasks/{task_id}/content")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == TaskStatus.PROCESSING
    assert body.get("segments") is None

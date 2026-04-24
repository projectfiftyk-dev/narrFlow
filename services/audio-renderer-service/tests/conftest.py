import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from mongomock_motor import AsyncMongoMockClient
from unittest.mock import AsyncMock


@pytest.fixture
def mock_db():
    client = AsyncMongoMockClient()
    return client["test_db"]


@pytest.fixture
def patch_db(mock_db, monkeypatch):
    monkeypatch.setattr("src.controllers.voices_controller.get_db", lambda: mock_db)
    monkeypatch.setattr("src.controllers.tasks_controller.get_db", lambda: mock_db)
    monkeypatch.setattr("src.services.tts.get_db", lambda: mock_db)
    return mock_db


@pytest.fixture
def patch_worker(monkeypatch):
    """Prevents the background TTS worker from running during HTTP-level tests."""
    monkeypatch.setattr(
        "src.controllers.tasks_controller.process_tts_task",
        AsyncMock(return_value=None),
    )


@pytest.fixture
def patch_tts(monkeypatch):
    """Replaces the blocking Azure TTS call with a no-op for service-level tests."""
    monkeypatch.setattr(
        "src.services.tts._synthesize_segment",
        lambda text, voice_id, output_path: None,
    )


@pytest_asyncio.fixture
async def http_client(patch_db, patch_worker):
    from src.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

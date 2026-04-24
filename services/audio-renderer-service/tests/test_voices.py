import pytest
from httpx import AsyncClient


VOICE_PAYLOAD = {
    "id": "en-US-TestNeural",
    "slug": "test_voice",
    "friendlyName": "Test Voice",
    "description": "A voice for testing",
}


async def test_list_voices_empty(http_client: AsyncClient):
    response = await http_client.get("/voices")
    assert response.status_code == 200
    assert response.json() == []


async def test_create_voice(http_client: AsyncClient):
    response = await http_client.post("/voices", json=VOICE_PAYLOAD)
    assert response.status_code == 201
    assert response.json() == VOICE_PAYLOAD


async def test_list_voices_after_create(http_client: AsyncClient):
    await http_client.post("/voices", json=VOICE_PAYLOAD)
    response = await http_client.get("/voices")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == VOICE_PAYLOAD["id"]


async def test_create_voice_duplicate_returns_409(http_client: AsyncClient):
    await http_client.post("/voices", json=VOICE_PAYLOAD)
    response = await http_client.post("/voices", json=VOICE_PAYLOAD)
    assert response.status_code == 409


async def test_update_voice(http_client: AsyncClient):
    await http_client.post("/voices", json=VOICE_PAYLOAD)
    response = await http_client.put(
        f"/voices/{VOICE_PAYLOAD['id']}",
        json={"friendlyName": "Updated Name"},
    )
    assert response.status_code == 200
    assert response.json()["friendlyName"] == "Updated Name"
    assert response.json()["slug"] == VOICE_PAYLOAD["slug"]


async def test_update_voice_not_found_returns_404(http_client: AsyncClient):
    response = await http_client.put(
        "/voices/nonexistent-id",
        json={"friendlyName": "Ghost"},
    )
    assert response.status_code == 404


async def test_update_voice_no_fields_returns_422(http_client: AsyncClient):
    await http_client.post("/voices", json=VOICE_PAYLOAD)
    response = await http_client.put(f"/voices/{VOICE_PAYLOAD['id']}", json={})
    assert response.status_code == 422


async def test_delete_voice(http_client: AsyncClient):
    await http_client.post("/voices", json=VOICE_PAYLOAD)
    response = await http_client.delete(f"/voices/{VOICE_PAYLOAD['id']}")
    assert response.status_code == 204

    list_response = await http_client.get("/voices")
    assert list_response.json() == []


async def test_delete_voice_not_found_returns_404(http_client: AsyncClient):
    response = await http_client.delete("/voices/nonexistent-id")
    assert response.status_code == 404

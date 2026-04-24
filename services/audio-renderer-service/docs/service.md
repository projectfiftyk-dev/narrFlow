# Audio Renderer Service

> **Role:** Stateless batch TTS engine with job tracking
> **Stack:** Python 3.13 · FastAPI · Motor (MongoDB) · Azure Cognitive Services Speech SDK
> **Status:** MVP — implemented and tested

---

## What the service does

The Audio Renderer does exactly two things:

| Responsibility | Description |
|---------------|-------------|
| Voice Registry | CRUD management of available TTS voices |
| Audio Generation | Converts batches of text segments into MP3 files, asynchronously |

It is not a streaming engine, not an AI assistant, and not a real-time synthesizer. It accepts a batch of text segments, synthesizes each one with Azure TTS, writes MP3 files to disk, and makes the results available for polling.

Spring Boot calls this service. The frontend never contacts it directly.

---

## Capabilities

### Voice Registry

- Four Azure Neural voices are seeded automatically on startup.
- Voices can be created, updated, and deleted at runtime (admin operation — no auth enforced at this layer; access control is Spring Boot's responsibility).
- The voice `id` field must exactly match the Azure TTS voice name (e.g. `en-US-JennyNeural`). All other fields are metadata.

### TTS Job Engine

- Accepts a batch of text segments in a single request and returns a `taskId` immediately (`202 Accepted`).
- Processes segments in the background using FastAPI `BackgroundTasks` + `asyncio` thread pool (Azure SDK is blocking; it runs in an executor to avoid blocking the event loop).
- Writes one MP3 file per segment: `tts-storage/{taskId}/{segmentNumber}.mp3`.
- Exposes a status polling endpoint and a convenience resolved-content endpoint.
- Job state is tracked in MongoDB. The filesystem holds only the binary audio files.

### What is NOT implemented (MVP scope)

- No authentication or authorization (delegated to Spring Boot).
- No tone processing — text is sent to Azure TTS as plain text.
- No retry logic on failed segments.
- No S3 or CDN storage — local filesystem only.
- No message broker (no Celery, no RabbitMQ).
- No duplicate job detection.

---

## Hardcoded Voices

These four voices are seeded into MongoDB on every startup via `$setOnInsert` (idempotent):

| id (Azure voice name) | slug | friendly_name |
|-----------------------|------|---------------|
| `en-US-JennyNeural` | `calm_female` | Calm Female Narrator |
| `en-US-GuyNeural` | `deep_male` | Deep Male Narrator |
| `en-US-AriaNeural` | `expressive_female` | Expressive Female |
| `en-US-DavisNeural` | `casual_male` | Casual Male |

Additional voices can be added at runtime via `POST /voices`.

---

## API Reference

### Health

#### `GET /health`

```json
{ "status": "ok" }
```

---

### Voice Registry

#### `GET /voices`

Returns all registered voices.

```json
[
  {
    "id": "en-US-JennyNeural",
    "slug": "calm_female",
    "friendly_name": "Calm Female Narrator",
    "description": "Soft, neutral female narration voice"
  }
]
```

---

#### `POST /voices` → `201 Created`

Registers a new voice. `id` must be a valid Azure TTS voice name.

```json
{
  "id": "en-US-BrandonNeural",
  "slug": "warm_male",
  "friendly_name": "Warm Male",
  "description": "Warm, engaging male voice"
}
```

Returns `409` if a voice with that `id` already exists.

---

#### `PUT /voices/{id}` → `200 OK`

Updates metadata fields (`slug`, `friendly_name`, `description`). The `id` is immutable.

```json
{ "friendly_name": "Updated Name" }
```

Returns `404` if the voice does not exist. Returns `422` if the request body contains no updatable fields.

---

#### `DELETE /voices/{id}` → `204 No Content`

Removes a voice from the registry. Returns `404` if not found.

---

### TTS Tasks

#### `POST /tts/tasks` → `202 Accepted`

Submits a batch of text segments for audio generation. Returns immediately.

**Request:**

```json
{
  "segments": [
    {
      "segmentNumber": 0,
      "text": "It was a dark and stormy night.",
      "voiceId": "en-US-JennyNeural",
      "personaId": "persona_abc",
      "transformationId": "transform_001"
    },
    {
      "segmentNumber": 1,
      "text": "She whispered his name into the silence.",
      "voiceId": "en-US-GuyNeural",
      "personaId": "persona_xyz",
      "transformationId": "transform_001"
    }
  ]
}
```

All fields except `segmentNumber`, `text`, and `voiceId` are optional metadata passed through and echoed back in the content endpoint.

**Response:**

```json
{ "status": "accepted", "taskId": "550e8400-e29b-41d4-a716-446655440000" }
```

---

#### `GET /tts/tasks/{taskId}`

Polls the status of a job.

**PENDING / PROCESSING:**

```json
{ "taskId": "...", "status": "PROCESSING" }
```

**COMPLETED:**

```json
{
  "taskId": "...",
  "status": "COMPLETED",
  "result": [
    { "segmentNumber": 0, "audioUrl": "/audio/550e.../0.mp3" },
    { "segmentNumber": 1, "audioUrl": "/audio/550e.../1.mp3" }
  ]
}
```

**FAILED:**

```json
{
  "taskId": "...",
  "status": "FAILED",
  "error": "Azure TTS failed for voice 'en-US-JennyNeural': ..."
}
```

Returns `404` if the task does not exist.

---

#### `GET /tts/tasks/{taskId}/content`

Convenience endpoint for Spring Boot. Returns the fully resolved, playback-ready payload once the job is `COMPLETED` — segments merged with their audio URLs and original metadata. Spring Boot uses this to assemble the `Content` object without manual aggregation.

**Response (COMPLETED):**

```json
{
  "taskId": "...",
  "status": "COMPLETED",
  "segments": [
    {
      "segmentNumber": 0,
      "text": "It was a dark and stormy night.",
      "personaId": "persona_abc",
      "audioUrl": "/audio/550e.../0.mp3"
    },
    {
      "segmentNumber": 1,
      "text": "She whispered his name into the silence.",
      "personaId": "persona_xyz",
      "audioUrl": "/audio/550e.../1.mp3"
    }
  ]
}
```

**Response (not yet completed):** Returns the current status with `segments: null`.

---

### Audio Files

#### `GET /audio/{taskId}/{segmentNumber}.mp3`

Serves the generated audio file directly. Mounted as a FastAPI `StaticFiles` route.

Audio URLs returned by the task endpoints are ready to use as-is against this service's base URL.

---

## Job Status Lifecycle

```
PENDING → PROCESSING → COMPLETED
                     ↘ FAILED
```

| Status | Meaning |
|--------|---------|
| `PENDING` | Job stored, worker not yet started |
| `PROCESSING` | Worker is synthesizing segments |
| `COMPLETED` | All segments synthesized, audio files written |
| `FAILED` | An error occurred during synthesis |

---

## Storage

Audio files are written to `tts-storage/` relative to the working directory:

```
tts-storage/
  {taskId}/
    0.mp3
    1.mp3
    2.mp3
```

File naming is deterministic (`{segmentNumber}.mp3`) so re-runs of the same task safely overwrite rather than orphan files.

MongoDB stores job metadata, status, payload, and result URLs. The filesystem holds only binary MP3 files. Files are considered disposable derivatives — they are regenerable from the job payload at any time.

When the project outgrows local storage, only the storage layer needs to change. The `audioUrl` abstraction in the API contract means the frontend requires zero changes.

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and fill in the required values.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_SPEECH_KEY` | Yes | — | Azure Cognitive Services subscription key |
| `AZURE_SPEECH_REGION` | Yes | `eastus` | Azure region (e.g. `westeurope`, `eastus`) |
| `MONGODB_URL` | No | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB_NAME` | No | `audio_renderer` | Database name |
| `AUDIO_STORAGE_PATH` | No | `tts-storage` | Local directory for MP3 files |
| `AUDIO_BASE_URL` | No | `/audio` | URL prefix embedded in returned `audioUrl` values |

---

## Running Locally

**Prerequisites:** Python 3.13, `uv`, a running MongoDB instance, an Azure Cognitive Services Speech resource.

```bash
cd services/audio-renderer-service

# Configure
cp .env.example .env
# edit .env — set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION

# Install
uv sync --extra dev

# Start (hot reload)
uv run uvicorn src.main:app --reload --port 8001
```

Swagger UI: `http://localhost:8001/docs`

On startup the service:
1. Creates the `tts-storage/` directory if it does not exist.
2. Seeds the four hardcoded Azure voices into MongoDB (idempotent).

---

## Running Tests

Tests run fully offline — MongoDB is replaced with an in-memory mock (`mongomock-motor`) and the Azure TTS call is patched out.

```bash
# Run all tests
uv run pytest

# Verbose
uv run pytest -v

# Single module
uv run pytest tests/test_voices.py -v
uv run pytest tests/services/test_tts.py -v
```

### Test structure

```
tests/
  conftest.py                  # shared fixtures
  test_voices.py               # voice CRUD endpoint tests
  test_tasks.py                # task creation, polling, content endpoint
  services/
    test_tts.py                # TTS worker unit tests (Azure SDK mocked)
    test_storage.py            # path and URL helper tests
```

### Key fixtures (`conftest.py`)

| Fixture | What it does |
|---------|-------------|
| `mock_db` | In-memory MongoDB via `mongomock-motor` |
| `patch_db` | Replaces `get_db()` in all routers and services with `mock_db` |
| `patch_worker` | Replaces `process_tts_task` with an `AsyncMock` — prevents the background worker from running during HTTP-level tests |
| `patch_tts` | Replaces `_synthesize_segment` with a no-op — used in direct service tests |
| `http_client` | `httpx.AsyncClient` wired to the FastAPI app via `ASGITransport` |

---

## Project Structure

```
src/
  main.py            # FastAPI app, lifespan, static file mount
  config.py          # Environment-based settings (pydantic-settings)
  database.py        # Motor async MongoDB client singleton
  models/
    voice.py         # Voice schema + hardcoded voice list
    task.py          # TTSTask, SegmentInput/Result, status enum, response models
  routers/
    voices.py        # GET/POST/PUT/DELETE /voices
    tasks.py         # POST/GET /tts/tasks, GET /tts/tasks/{id}/content
  services/
    tts.py           # Background worker: Azure TTS synthesis, job state machine
    storage.py       # File path and URL helpers
tests/
  conftest.py
  test_voices.py
  test_tasks.py
  services/
    test_tts.py
    test_storage.py
docs/
  service.md         # this file
```

---

## Integration with Spring Boot

Spring Boot is the only caller. The expected integration sequence:

```
POST /tts/tasks          → store taskId on the Transformation document
                           set Transformation status → GENERATING

[polling loop]
GET  /tts/tasks/{id}     → check status every N seconds

status == COMPLETED:
GET  /tts/tasks/{id}/content  → receive fully resolved segments

assemble Content object  → persist to MongoDB
                           set Transformation status → DONE
```

Audio URLs returned by this service (`/audio/{taskId}/{n}.mp3`) should be prefixed with this service's base URL before being stored in the Spring Boot `Content` document, so the frontend can resolve them directly.

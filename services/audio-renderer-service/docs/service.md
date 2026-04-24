# Audio Renderer Service

> **Role:** Stateless batch TTS engine with job tracking
> **Stack:** Python 3.13 · FastAPI · Motor (MongoDB) · ElevenLabs SDK
> **Status:** MVP — implemented

---

## What the service does

The Audio Renderer does exactly two things:

| Responsibility | Description |
|---------------|-------------|
| Voice Registry | Proxies ElevenLabs voices API and returns them in a normalized format |
| Audio Generation | Converts batches of text segments into MP3 files, asynchronously |

It is not a streaming engine, not an AI assistant, and not a real-time synthesizer. It accepts a batch of text segments, synthesizes each one via ElevenLabs, writes MP3 files to disk, and makes the results available for polling.

Spring Boot calls this service. The frontend never contacts it directly.

---

## Capabilities

### Voice Registry

- `GET /voices` calls the ElevenLabs API live and returns normalized voice objects.
- An optional `?language=` query param (BCP-47 code) filters by language — e.g. `?language=ro` for Romanian, `?language=en` for English.
- The voice `id` field is the ElevenLabs `voice_id`. Slug is derived from the voice name (lowercase, underscored). Description comes from the ElevenLabs `labels.description` field.
- Voices can also be created, updated, and deleted in the local MongoDB registry for custom overrides (admin operation — no auth enforced at this layer).

### TTS Job Engine

- Accepts a batch of text segments in a single request and returns a `taskId` immediately (`202 Accepted`).
- Processes segments in the background using FastAPI `BackgroundTasks` + `asyncio` thread pool (ElevenLabs SDK is blocking; it runs in an executor to avoid blocking the event loop).
- Synthesizes with the `eleven_multilingual_v2` model by default (configurable via `ELEVENLABS_MODEL`).
- Writes one MP3 file per segment: `tts-storage/{taskId}/{segmentNumber}.mp3`.
- Exposes a status polling endpoint and a convenience resolved-content endpoint.
- Job state is tracked in MongoDB. The filesystem holds only the binary audio files.

### What is NOT implemented (MVP scope)

- No authentication or authorization (delegated to Spring Boot).
- No tone processing — text is sent to ElevenLabs as plain text.
- No retry logic on failed segments.
- No S3 or CDN storage — local filesystem only.
- No message broker (no Celery, no RabbitMQ).
- No duplicate job detection.

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

Fetches voices live from ElevenLabs and returns them in normalized format.

Optional query param: `?language=<BCP-47 code>` — filters by language using ElevenLabs v2 search.

```
GET /voices          → all voices
GET /voices?language=ro  → Romanian voices
GET /voices?language=en  → English voices
```

**Response:**

```json
[
  {
    "id": "EXAVITQu4vr4xnSDxMaL",
    "slug": "sarah",
    "friendlyName": "Sarah",
    "description": "Mature, reassuring, confident"
  },
  {
    "id": "JBFqnCBsd6RMkjVDRZzb",
    "slug": "george",
    "friendlyName": "George",
    "description": "Warm, captivating storyteller"
  }
]
```

---

#### `POST /voices` → `201 Created`

Registers a custom voice in the local MongoDB registry. `id` must be a valid ElevenLabs `voice_id`.

```json
{
  "id": "EXAVITQu4vr4xnSDxMaL",
  "slug": "sarah_narrator",
  "friendlyName": "Sarah – Narrator",
  "description": "Mature, reassuring female voice"
}
```

Returns `409` if a voice with that `id` already exists.

---

#### `PUT /voices/{id}` → `200 OK`

Updates metadata fields (`slug`, `friendlyName`, `description`). The `id` is immutable.

```json
{ "friendlyName": "Updated Name" }
```

Returns `404` if the voice does not exist. Returns `422` if the request body contains no updatable fields.

---

#### `DELETE /voices/{id}` → `204 No Content`

Removes a voice from the local registry. Returns `404` if not found.

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
      "voiceId": "EXAVITQu4vr4xnSDxMaL",
      "personaId": "persona_abc",
      "transformationId": "transform_001"
    },
    {
      "segmentNumber": 1,
      "text": "She whispered his name into the silence.",
      "voiceId": "JBFqnCBsd6RMkjVDRZzb",
      "personaId": "persona_xyz",
      "transformationId": "transform_001"
    }
  ]
}
```

All fields except `segmentNumber`, `text`, and `voiceId` are optional metadata echoed back in the content endpoint.

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
  "error": "ElevenLabs API error: quota_exceeded"
}
```

Returns `404` if the task does not exist.

---

#### `GET /tts/tasks/{taskId}/content`

Convenience endpoint for Spring Boot. Returns the fully resolved, playback-ready payload once the job is `COMPLETED` — segments merged with their audio URLs and original metadata.

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
    }
  ]
}
```

**Response (not yet completed):** Returns the current status with `segments: null`.

---

### Audio Files

#### `GET /audio/{taskId}/{segmentNumber}.mp3`

Serves the generated audio file directly. Mounted as a FastAPI `StaticFiles` route.

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

File naming is deterministic (`{segmentNumber}.mp3`) so re-runs safely overwrite rather than orphan files.

MongoDB stores job metadata, status, payload, and result URLs. The filesystem holds only binary MP3 files. Files are disposable derivatives — regenerable from the job payload at any time.

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and fill in the required values.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ELEVENLABS_API_KEY` | Yes | — | ElevenLabs API key (needs `voices_read` + `text_to_speech` permissions) |
| `ELEVENLABS_MODEL` | No | `eleven_multilingual_v2` | ElevenLabs model ID |
| `MONGODB_URL` | No | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB_NAME` | No | `audio_renderer` | Database name |
| `AUDIO_STORAGE_PATH` | No | `tts-storage` | Local directory for MP3 files |
| `AUDIO_BASE_URL` | No | `/audio` | URL prefix embedded in returned `audioUrl` values |

### ElevenLabs API Key Permissions

When creating your API key in the ElevenLabs dashboard, enable:
- **Voices (read)** — required for `GET /voices`
- **Text to Speech** — required for audio synthesis

---

## Running Locally

**Prerequisites:** Python 3.13, `uv`, a running MongoDB instance, an ElevenLabs API key.

```bash
cd services/audio-renderer-service

# Configure
cp .env.example .env
# edit .env — set ELEVENLABS_API_KEY

# Install
uv sync

# Start (hot reload)
uv run uvicorn src.main:app --reload --port 8081
```

Swagger UI: `http://localhost:8081/docs`

On startup the service creates the `tts-storage/` directory if it does not exist.

---

## Running Tests

Tests run fully offline — MongoDB is replaced with an in-memory mock (`mongomock-motor`) and the ElevenLabs SDK call is patched out.

```bash
# Run all tests
uv run pytest

# Verbose
uv run pytest -v

# Single module
uv run pytest tests/test_voices.py -v
uv run pytest tests/services/test_tts.py -v
```

---

## Project Structure

```
src/
  main.py            # FastAPI app, lifespan, static file mount
  config.py          # Environment-based settings (pydantic-settings)
  database.py        # Motor async MongoDB client singleton
  models/
    voice.py         # Voice schema
    task.py          # TTSTask, SegmentInput/Result, status enum, response models
  controllers/
    voices_controller.py   # GET/POST/PUT/DELETE /voices
    tasks_controller.py    # POST/GET /tts/tasks, GET /tts/tasks/{id}/content
  services/
    tts.py           # Background worker: ElevenLabs synthesis, job state machine
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

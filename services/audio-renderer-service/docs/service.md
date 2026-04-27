# Audio Renderer Service

> **Role:** Stateless batch TTS engine with job tracking and curated voice management
> **Stack:** Python 3.13 · FastAPI · Motor (MongoDB) · ElevenLabs SDK
> **Status:** MVP — implemented

---

## What the service does

| Responsibility | Description |
|---------------|-------------|
| Curated Voice Registry | Exposes a fixed set of 5 approved voices; generates test samples on startup |
| Audio Generation | Converts batches of text segments into MP3 files, asynchronously |

It is not a streaming engine, not an AI assistant, and not a real-time synthesizer. It accepts a batch of text segments, synthesizes each one via ElevenLabs, writes MP3 files to disk, and makes the results available for polling.

Spring Boot calls this service. The frontend never contacts it directly.

---

## Capabilities

### Curated Voice Registry

- `GET /voices` returns a fixed list of 5 curated voices — no live ElevenLabs call at request time.
- The available voices are: **Rachel**, **Lily**, **Adam**, **Antoni**, **Josh**.
- Each voice includes a `tests` array with pre-generated sample URLs for each supported language (`en`, `ro`).

### Voice Test Samples (startup)

On every startup the service checks whether test samples exist for all 5 curated voices in each supported language (`en`, `ro`). Missing samples are synthesized via ElevenLabs and written to disk. Existing files are skipped (idempotent).

- Stored at: `tts-storage/tests/{voiceId}/{language}/sample.mp3`
- Served at: `/audio/tests/{voiceId}/{language}/sample.mp3`
- Sample texts:
  - **English:** `"Hi, I am {name} and I'm glad to assist you."`
  - **Romanian:** `"Salut, eu sunt {name}. Cu ce vă pot ajuta astăzi?"`

### TTS Job Engine

- Accepts a batch of text segments in a single request and returns a `taskId` immediately (`202 Accepted`).
- Processes segments in the background using FastAPI `BackgroundTasks` + `asyncio` thread pool (ElevenLabs SDK is blocking; it runs in an executor to avoid blocking the event loop).
- Synthesizes with the `eleven_multilingual_v2` model by default (configurable via `ELEVENLABS_MODEL`).
- Writes one MP3 file per segment: `tts-storage/{taskId}/{segmentNumber}.mp3`.
- Exposes a status polling endpoint and a convenience resolved-content endpoint.
- Job state is tracked in MongoDB. The filesystem holds only the binary audio files.

### What is NOT implemented (MVP scope)

- No authentication or authorization (delegated to Spring Boot).
- No retry logic on failed segments.
- No S3 or CDN storage — local filesystem only.
- No message broker (no Celery, no RabbitMQ).
- No duplicate job detection.

---

## Emotion

Each segment can carry an optional `emotion` field that slightly adjusts how the voice sounds. If omitted it defaults to `NEUTRAL`.

Emotions are mapped to ElevenLabs `VoiceSettings` parameters (`stability`, `similarity_boost`, `style`):

| Emotion | stability | similarity_boost | style | Effect |
|---------|-----------|-----------------|-------|--------|
| `NEUTRAL` | 0.75 | 0.75 | 0.00 | Balanced, consistent delivery |
| `HAPPY` | 0.50 | 0.80 | 0.60 | Upbeat, expressive |
| `SAD` | 0.85 | 0.70 | 0.30 | Slower, softer, subdued |
| `ANGRY` | 0.35 | 0.90 | 0.80 | High energy, forceful |
| `FEARFUL` | 0.40 | 0.75 | 0.50 | Tense, unsteady |
| `SURPRISED` | 0.45 | 0.80 | 0.70 | Animated, sudden |

> `style` requires the `eleven_multilingual_v2` model (already the default).

---

## Curated Voices

| Friendly Name | Voice ID | Description |
|---------------|----------|-------------|
| Sarah | `EXAVITQu4vr4xnSDxMaL` | Soft, young adult female |
| Lily | `pFZP5JQG7iQjIQuC4Bku` | Warm, expressive female |
| Adam | `pNInz6obpgDQGcFmaJgB` | Deep, middle-aged male |
| Antoni | `ErXwobaYiN019PkySvjV` | Well-rounded, young adult male |
| Charlie | `IKne3meq5aSn9XLyUdCD` | Casual, middle-aged male |

Supported languages for test samples: `en`, `ro`.

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

Returns the 5 curated voices. Each voice includes a `tests` array with pre-generated sample URLs for every supported language (`en`, `ro`).

**Response:**

```json
[
  {
    "id": "EXAVITQu4vr4xnSDxMaL",
    "slug": "sarah",
    "friendlyName": "Sarah",
    "description": "Soft, young adult female",
    "tests": [
      { "language": "en", "url": "/audio/tests/EXAVITQu4vr4xnSDxMaL/en/sample.mp3" },
      { "language": "ro", "url": "/audio/tests/EXAVITQu4vr4xnSDxMaL/ro/sample.mp3" }
    ]
  },
  {
    "id": "pFZP5JQG7iQjIQuC4Bku",
    "slug": "lily",
    "friendlyName": "Lily",
    "description": "Warm, expressive female",
    "tests": [
      { "language": "en", "url": "/audio/tests/pFZP5JQG7iQjIQuC4Bku/en/sample.mp3" },
      { "language": "ro", "url": "/audio/tests/pFZP5JQG7iQjIQuC4Bku/ro/sample.mp3" }
    ]
  }
]
```

*(remaining voices follow the same shape)*

---

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
      "voiceId": "21m00Tcm4TlvDq8ikWAM",
      "emotion": "ANGRY",
      "personaId": "persona_abc",
      "transformationId": "transform_001"
    },
    {
      "segmentNumber": 1,
      "text": "She whispered his name into the silence.",
      "voiceId": "TxGEqnHWrfWFTfGW9XjX",
      "emotion": "SAD",
      "personaId": "persona_xyz",
      "transformationId": "transform_001"
    }
  ]
}
```

`emotion` is optional — defaults to `NEUTRAL` when omitted. Valid values: `NEUTRAL`, `HAPPY`, `SAD`, `ANGRY`, `FEARFUL`, `SURPRISED`. All other fields except `segmentNumber`, `text`, and `voiceId` are optional metadata echoed back in the content endpoint.

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
      "audioUrl": "/audio/550e.../0.mp3",
      "emotion": "ANGRY"
    }
  ]
}
```

`emotion` is omitted from the segment when it was not set on the original request (i.e., the TTS service defaulted to `NEUTRAL` internally but does not echo it back as a field).

**Response (not yet completed):** Returns the current status with `segments: null`.

---

### Audio Files

#### `GET /audio/{taskId}/{segmentNumber}.mp3`

Serves a generated task audio file directly. Mounted as a FastAPI `StaticFiles` route.

#### `GET /audio/tests/{voiceId}/{language}/sample.mp3`

Serves a pre-generated voice test sample directly.

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

```
tts-storage/
  tests/
    {voiceId}/
      en/
        sample.mp3        ← pre-generated on startup
      ro/
        sample.mp3        ← pre-generated on startup
  {taskId}/
    0.mp3
    1.mp3
    2.mp3
```

File naming is deterministic so re-runs safely overwrite rather than orphan files. MongoDB stores job metadata, status, payload, and result URLs. Files are disposable derivatives — regenerable from the job payload at any time.

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and fill in the required values.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ELEVENLABS_API_KEY` | Yes | — | ElevenLabs API key (needs `text_to_speech` permission) |
| `ELEVENLABS_MODEL` | No | `eleven_multilingual_v2` | ElevenLabs model ID |
| `MONGODB_URL` | No | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB_NAME` | No | `audio_renderer` | Database name |
| `AUDIO_STORAGE_PATH` | No | `tts-storage` | Local directory for MP3 files |
| `AUDIO_BASE_URL` | No | `/audio` | URL prefix embedded in returned `audioUrl` values |

### ElevenLabs API Key Permissions

When creating your API key in the ElevenLabs dashboard, enable:
- **Text to Speech** — required for audio synthesis and test sample generation

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

On startup the service:
1. Creates `tts-storage/` directory if it does not exist.
2. Generates test samples for all 5 curated voices × 2 languages (skips existing files).

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
  main.py            # FastAPI app, lifespan, static file mount, startup sample generation
  config.py          # Environment-based settings (pydantic-settings)
  database.py        # Motor async MongoDB client singleton
  models/
    voice.py         # Voice schema, CURATED_VOICES, VoiceTestResponse
    task.py          # TTSTask, SegmentInput/Result, status enum, response models
  controllers/
    voices_controller.py   # GET /voices (includes test sample URLs per language)
    tasks_controller.py    # POST/GET /tts/tasks, GET /tts/tasks/{id}/content
  services/
    tts.py           # Background worker: ElevenLabs synthesis, job state machine
    storage.py       # File path and URL helpers (tasks + test samples)
    voice_samples.py # Startup sample generation for curated voices
tests/
  conftest.py
  test_voices.py
  test_tasks.py
  services/
    test_tts.py
    test_storage.py
docs/
  service.md                          # this file
  audio-renderer.postman_collection.json  # Postman collection for all endpoints
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

For persona voice previews, Spring Boot can read the `tests` array returned by `GET /voices` and prefix the `url` values with this service's base URL.

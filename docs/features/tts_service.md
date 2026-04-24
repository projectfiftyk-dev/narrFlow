# TTS Service (FastAPI) — Feature Documentation

> **Service Role:** Stateless batch audio generation engine with job tracking
> **Stack:** Python · FastAPI · MongoDB · ElevenLabs SDK
> **Port:** 8081
> **Version:** MVP 1.0 — implemented

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Voice Module](#voice-module)
3. [Audio Generation Module](#audio-generation-module)
4. [Internal Processing Flow](#internal-processing-flow)
5. [Storage Strategy](#storage-strategy)
6. [End-to-End Flow](#end-to-end-flow)
7. [Key Design Decisions](#key-design-decisions)
8. [MVP Boundaries](#mvp-boundaries)

---

## Service Overview

The TTS Service does exactly **two things**:

| Responsibility | Description |
|---------------|-------------|
| Voice Registry | Proxies the ElevenLabs voices API and returns normalized voice objects |
| Audio Generation Engine | Converts structured text segments into MP3 files asynchronously |

### Mental Model

> **"A batch audio renderer with a job tracker."**

This service is not a streaming engine, not an AI assistant, and not a real-time synthesizer. It receives a batch of text segments, generates audio for each one via ElevenLabs, and makes the results available for polling.

---

## Voice Module

### Purpose

The Voice Module is a **normalized interface** over the ElevenLabs voice catalog. `GET /voices` calls ElevenLabs live and returns every voice in a consistent internal format. No static list is seeded or maintained locally.

### Voice Data Model

```json
{
  "id": "EXAVITQu4vr4xnSDxMaL",
  "slug": "sarah",
  "friendlyName": "Sarah",
  "description": "Mature, reassuring, confident"
}
```

| Field | Source |
|-------|--------|
| `id` | ElevenLabs `voice_id` — passed as-is to the TTS API |
| `slug` | Derived from voice name: lowercased, spaces → underscores |
| `friendlyName` | ElevenLabs voice `name` |
| `description` | ElevenLabs `labels.description` (empty string if absent) |

> **Critical constraint:** `id` must equal the ElevenLabs `voice_id`. All other fields are metadata derived from the ElevenLabs response.

### Language Filtering

The `GET /voices` endpoint accepts an optional `?language=` query param (BCP-47 code). When provided, the request is routed through ElevenLabs' v2 search API which filters server-side.

```
GET /voices              → all voices
GET /voices?language=ro  → Romanian voices (eleven_multilingual_v2 compatible)
GET /voices?language=en  → English voices
```

### Recommended Voices for Romanian Narration

ElevenLabs does not have dedicated native Romanian voices, but any voice using `eleven_multilingual_v2` speaks Romanian fluently when passed Romanian text.

| Voice ID | Name | Gender | Best for |
|----------|------|--------|---------|
| `EXAVITQu4vr4xnSDxMaL` | Sarah | Female | Mature, reassuring narration |
| `JBFqnCBsd6RMkjVDRZzb` | George | Male | Warm, captivating storytelling |

### Endpoints

#### List Voices

```
GET /voices
GET /voices?language=ro
```

**Response:**

```json
[
  {
    "id": "EXAVITQu4vr4xnSDxMaL",
    "slug": "sarah",
    "friendlyName": "Sarah",
    "description": "Mature, reassuring, confident"
  }
]
```

---

#### Create Voice (local override)

```
POST /voices
```

Stores a custom voice entry in the local MongoDB registry. Useful for aliasing or overriding ElevenLabs metadata.

**Response:** `201 Created` with the created voice object.

---

#### Update Voice

```
PUT /voices/{id}
```

Updates `slug`, `friendlyName`, or `description` in the local registry.

**Response:** `200 OK` with updated voice object.

---

#### Delete Voice

```
DELETE /voices/{id}
```

**Response:** `204 No Content`

---

## Audio Generation Module

### Design Decision — Polling over Messaging

| Option | Decision | Reason |
|--------|----------|--------|
| Polling API + Job Table | **Selected for MVP** | Simple, debuggable, no infrastructure dependency |
| RabbitMQ / Celery | Rejected | Overengineering — not needed at MVP scale |

### TTS Provider

All synthesis is performed via **ElevenLabs** using the `eleven_multilingual_v2` model (configurable via `ELEVENLABS_MODEL`). The model supports Romanian, English, and 28 other languages without changing voice or configuration.

Output format: `mp3_44100_128` (44.1 kHz, 128 kbps).

### TTS Job Data Model

```json
{
  "taskId": "uuid",
  "status": "PENDING | PROCESSING | COMPLETED | FAILED",
  "createdAt": "2026-04-24T10:00:00Z",
  "updatedAt": "2026-04-24T10:00:45Z",
  "payload": [
    {
      "segmentNumber": 0,
      "text": "It was a dark and stormy night.",
      "voiceId": "EXAVITQu4vr4xnSDxMaL",
      "personaId": "persona_abc",
      "transformationId": "transform_001"
    }
  ],
  "result": [
    {
      "segmentNumber": 0,
      "audioUrl": "/audio/uuid/0.mp3"
    }
  ]
}
```

**Status lifecycle:**

```
PENDING → PROCESSING → COMPLETED
                     ↘ FAILED
```

---

### Endpoints

#### Create TTS Task

```
POST /tts/tasks
```

**Request Body:**

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

**Response:** `202 Accepted`

```json
{
  "status": "accepted",
  "taskId": "abc123"
}
```

---

#### Poll Task Status

```
GET /tts/tasks/{taskId}
```

**Response (completed):**

```json
{
  "taskId": "abc123",
  "status": "COMPLETED",
  "result": [
    { "segmentNumber": 0, "audioUrl": "/audio/abc123/0.mp3" },
    { "segmentNumber": 1, "audioUrl": "/audio/abc123/1.mp3" }
  ]
}
```

---

#### Get Resolved Content

```
GET /tts/tasks/{taskId}/content
```

Returns the fully resolved, playback-ready structure — segments merged with text, personaId, and audioUrl.

**Response:**

```json
{
  "taskId": "abc123",
  "status": "COMPLETED",
  "segments": [
    {
      "segmentNumber": 0,
      "text": "It was a dark and stormy night.",
      "personaId": "persona_abc",
      "audioUrl": "/audio/abc123/0.mp3"
    }
  ]
}
```

---

## Internal Processing Flow

```
1. POST /tts/tasks received
        ↓
2. Create TTS Job in MongoDB (status: PENDING)
        ↓
3. Return taskId immediately (202 Accepted)
        ↓
4. Background worker picks up job (status: PROCESSING)
        ↓
5. For each segment (sorted by segmentNumber):
        a. Call ElevenLabs text_to_speech.convert(voice_id, text, model_id)
        b. Stream audio chunks to disk: tts-storage/{taskId}/{segmentNumber}.mp3
        c. Append audioUrl to job result array
        ↓
6. Mark job COMPLETED (or FAILED on error)
        ↓
7. Spring Boot polling detects COMPLETED
        ↓
8. Spring Boot assembles Content object → saved to MongoDB
```

### Async Execution Model

| Option | Decision | Reason |
|--------|----------|--------|
| FastAPI `BackgroundTasks` + thread pool executor | **Selected** | Built-in, zero dependencies; ElevenLabs SDK is synchronous so it runs in executor |
| Celery | Rejected | Requires Redis/RabbitMQ broker — overkill for MVP |

```python
@router.post("")
async def create_task(payload: TTSTaskCreate, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    # persist to DB ...
    background_tasks.add_task(process_tts_task, task_id, payload.segments)
    return {"status": "accepted", "taskId": task_id}
```

---

## Storage Strategy

### Local Filesystem (MVP)

| Option | Decision | Reason |
|--------|----------|--------|
| Local filesystem | **Selected** | Zero infrastructure overhead |
| AWS S3 | Post-MVP | Migration path when scale requires it |

### Directory Structure

```
tts-storage/
  {taskId}/
    0.mp3
    1.mp3
    2.mp3
```

### Serving Files

Audio files are served as static assets directly from FastAPI:

```python
app.mount("/audio", StaticFiles(directory="tts-storage"), name="audio")
```

Any generated file is immediately accessible at:

```
GET /audio/{taskId}/{segmentNumber}.mp3
```

### Future Migration Path

The `audioUrl` abstraction in the API contract means the storage backend can be swapped without any frontend changes:

```
Now:   /audio/{taskId}/{n}.mp3
Later: https://bucket.s3.../audio/{taskId}/{n}.mp3
```

---

## End-to-End Flow

```
Spring Boot
    │  POST /tts/tasks  (segments with text + voiceId)
    ▼
FastAPI
    │  Creates job in MongoDB (PENDING)
    │  Returns taskId immediately
    │
    │  [Background Worker]
    │  Calls ElevenLabs per segment (eleven_multilingual_v2)
    │  Streams audio chunks → tts-storage/{taskId}/N.mp3
    │  Marks job COMPLETED
    │
Spring Boot (polling)
    │  GET /tts/tasks/{taskId}  ← polls until COMPLETED
    │  GET /tts/tasks/{taskId}/content
    │  Assembles Content object → saves to MongoDB
    │  Marks Transformation → DONE
    ▼
Frontend
    │  GET /api/v1/content/{transformationId}
    ▼
Player — synchronized text + audio
```

---

## Key Design Decisions

### 1. ElevenLabs over Azure TTS

ElevenLabs was chosen over Azure Cognitive Services because:
- Significantly higher voice quality and naturalness
- `eleven_multilingual_v2` handles Romanian without separate voice configuration
- No region/endpoint management
- Simple REST API with a first-class Python SDK

### 2. Live Voice API, No Local Seed

Voices are fetched live from ElevenLabs on every `GET /voices` request rather than seeded into MongoDB on startup. This means:
- Voice catalog is always up to date with ElevenLabs additions
- Language filtering is handled server-side by ElevenLabs
- No maintenance of a static voice list

### 3. Polling over Messaging

No broker infrastructure to deploy or manage. Job state is always visible in MongoDB. Sufficient for MVP request volume.

### 4. Job-Based Batch Model

The service processes a complete batch of segments per transformation and marks the job done. Playback only begins after the entire job is `COMPLETED`. This keeps the player experience deterministic and buffer-free.

---

## MVP Boundaries

### In Scope

- [x] `GET /voices` — live ElevenLabs proxy with optional `?language=` filter
- [x] Voice CRUD for local overrides
- [x] `POST /tts/tasks` — submit batch generation job
- [x] `GET /tts/tasks/{taskId}` — poll job status
- [x] `GET /tts/tasks/{taskId}/content` — convenience resolved endpoint
- [x] Async background worker (FastAPI BackgroundTasks + executor)
- [x] ElevenLabs synthesis via `eleven_multilingual_v2`
- [x] Local filesystem audio storage
- [x] Static file serving via FastAPI
- [x] MongoDB job tracking

### Explicitly Out of Scope (Post-MVP)

| Feature | Why deferred |
|---------|-------------|
| S3 / MinIO storage | Infrastructure not needed yet |
| CDN audio delivery | Post-validation |
| WebSocket progress updates | Polling is sufficient |
| Streaming / real-time TTS | Different product feature |
| Retry & idempotency logic | Deferred until concurrent load demands it |
| Tone/SSML processing | Text is sent as plain text |

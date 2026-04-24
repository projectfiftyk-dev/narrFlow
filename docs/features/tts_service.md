# 🐍 TTS Service (FastAPI) — Feature Documentation

> **Service Role:** Stateless batch audio generation engine with job tracking  
> **Stack:** Python · FastAPI · MongoDB · Local Filesystem  
> **Version:** MVP 1.0

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Voice Module (CRUD)](#voice-module-crud)
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
| 🎤 Voice Registry | CRUD management of available TTS voices (admin-only) |
| 🔊 Audio Generation Engine | Converts structured text segments into audio files asynchronously |

### Mental Model

> **"A batch audio renderer with a job tracker."**

This service is not a streaming engine, not an AI assistant, and not a real-time synthesizer. It receives a batch of text segments, generates audio for each one, and makes the results available for polling.

---

## Voice Module (CRUD)

### Purpose

The Voice Module is a **stable mapping layer** between your internal system and the external TTS provider. It is not modeling AI behavior — it is modeling a registry abstraction so that the rest of the system never references a provider's raw voice IDs directly.

### Voice Data Model

```json
{
  "id": "eleven_voice_001",
  "slug": "calm_female",
  "friendly_name": "Calm Female Narrator",
  "description": "Soft, neutral female narration voice"
}
```

| Field | Description |
|-------|-------------|
| `id` | **Must match the TTS provider's voice ID exactly** — this is a hard constraint |
| `slug` | Internal human-readable identifier |
| `friendly_name` | Display name shown in the UI |
| `description` | Optional metadata |

> ⚠️ **Critical constraint:** `id` is not a generated UUID. It must equal the provider's voice ID (e.g., ElevenLabs voice ID). All other fields are metadata only.

### Access Control

| Operation | Who |
|-----------|-----|
| Create, Update, Delete | `SUPERADMIN` only |
| List / Read | All authenticated users (internal use) |

### Endpoints

#### List Voices

```
GET /voices
```

**Response:**

```json
[
  {
    "id": "eleven_voice_001",
    "slug": "calm_female",
    "friendly_name": "Calm Female Narrator",
    "description": "Soft, neutral female narration voice"
  }
]
```

---

#### Create Voice

```
POST /voices
```

**Request Body:**

```json
{
  "id": "eleven_voice_002",
  "slug": "deep_male",
  "friendly_name": "Deep Male Narrator",
  "description": "Low, authoritative male voice"
}
```

**Response:** `201 Created` with created voice object.

---

#### Update Voice

```
PUT /voices/{id}
```

**Request Body:** Partial or full voice fields (excluding `id`).

**Response:** `200 OK` with updated voice object.

---

#### Delete Voice

```
DELETE /voices/{id}
```

**Response:** `204 No Content`

---

## Audio Generation Module

This is the core of the service.

### Design Decision — Polling over Messaging

Two approaches were considered:

| Option | Decision | Reason |
|--------|----------|--------|
| ✅ Polling API + Job Table | **Selected for MVP** | Simple, debuggable, no infrastructure dependency |
| ❌ RabbitMQ / Celery | Rejected | Overengineering — not needed at MVP scale |

The polling model is:

```
FastAPI receives job → stores job → processes async → Spring Boot polls for status
```

No message broker. No external worker system.

---

### TTS Job Data Model

```json
{
  "taskId": "uuid",
  "status": "PENDING | PROCESSING | COMPLETED | FAILED",
  "createdAt": "2026-04-23T10:00:00Z",
  "updatedAt": "2026-04-23T10:00:45Z",
  "payload": [
    {
      "segmentNumber": 0,
      "text": "It was a dark and stormy night.",
      "voiceId": "eleven_voice_001",
      "tone": "dramatic",
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
      "tone": "dramatic",
      "voiceId": "eleven_voice_001",
      "personaId": "persona_abc",
      "transformationId": "transform_001"
    },
    {
      "segmentNumber": 1,
      "text": "She whispered his name into the silence.",
      "tone": "soft",
      "voiceId": "eleven_voice_002",
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

**Response (in progress):**

```json
{
  "taskId": "abc123",
  "status": "PROCESSING"
}
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

**Response (failed):**

```json
{
  "taskId": "abc123",
  "status": "FAILED",
  "error": "TTS provider returned an error on segment 1."
}
```

---

#### Get Resolved Content *(convenience endpoint)*

```
GET /tts/tasks/{taskId}/content
```

Returns the fully resolved, playback-ready structure — useful for Spring Boot to avoid manual aggregation.

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
    },
    {
      "segmentNumber": 1,
      "text": "She whispered his name into the silence.",
      "personaId": "persona_xyz",
      "audioUrl": "/audio/abc123/1.mp3"
    }
  ]
}
```

---

## Internal Processing Flow

### Step-by-Step

```
1. POST /tts/tasks received
        ↓
2. Create TTS Job in MongoDB (status: PENDING)
        ↓
3. Acknowledge request → return taskId immediately
        ↓
4. Background worker picks up job (status: PROCESSING)
        ↓
5. For each segment:
        a. Call TTS provider with text + voiceId
        b. Receive audio binary
        c. Write to disk: /tts-storage/{taskId}/{segmentNumber}.mp3
        d. Store resulting audioUrl in job result array
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
| ✅ FastAPI `BackgroundTasks` or internal `asyncio` queue | **Selected** | Built-in, zero dependencies |
| ❌ Celery | Rejected | Requires Redis/RabbitMQ broker — overkill |
| ❌ External worker process | Rejected | Unnecessary infrastructure for MVP |

```python
# Simplified example
from fastapi import BackgroundTasks

@app.post("/tts/tasks")
async def create_task(payload: TTSRequest, background_tasks: BackgroundTasks):
    task_id = create_job_in_db(payload)
    background_tasks.add_task(process_tts_job, task_id, payload)
    return {"status": "accepted", "taskId": task_id}
```

---

## Storage Strategy

### Decision — Local Filesystem (MVP)

| Option | Decision | Reason |
|--------|----------|--------|
| ✅ Local filesystem | **Selected** | Zero infrastructure overhead, instant dev speed |
| ❌ AWS S3 | Rejected | Too early — adds credentials, IAM, bucket policies |
| ❌ MinIO / CDN | Post-MVP | Migration path when scale requires it |

### Directory Structure

```
/tts-storage/
  /{taskId}/
      0.mp3
      1.mp3
      2.mp3
```

Or with transformation context for traceability:

```
/tts-storage/
  /transformations/{transformationId}/
    /tasks/{taskId}/
        0001.mp3
        0002.mp3
```

### File Naming Convention

Use **deterministic naming** — never random UUIDs for individual audio files.

```
{segmentNumber}.mp3
```

Or, for improved cacheability:

```
{voiceId}_{segmentNumber}.mp3
```

**Why deterministic?**
- Prevents duplication on regeneration
- Makes caching trivial in post-MVP
- Allows safe re-runs without orphaned files

### Serving Files via FastAPI

Audio files are served as static assets directly from FastAPI:

```python
from fastapi.staticfiles import StaticFiles

app.mount("/audio", StaticFiles(directory="tts-storage"), name="audio")
```

This means any generated file is immediately accessible at:

```
GET /audio/{taskId}/{segmentNumber}.mp3
```

No additional serving infrastructure needed.

### Data Responsibility Split

| Layer | Stores |
|-------|--------|
| **MongoDB** | Job metadata, status, result URLs, payload |
| **Filesystem** | Binary `.mp3` files only |

> Audio files are **derivatives**, not core data. The source of truth is always the MongoDB job document. Files are regenerable from the job payload.

### Future Migration Path

When MVP outgrows local storage, migration requires **zero frontend changes** because the API already returns an `audioUrl` field. Only the backend storage implementation changes.

```
Step 1 (NOW):    Local filesystem  →  /audio/{taskId}/{n}.mp3
Step 2 (later):  S3-compatible     →  https://bucket.s3.../audio/{taskId}/{n}.mp3
Step 3 (later):  CDN layer         →  https://cdn.example.com/audio/{taskId}/{n}.mp3
```

---

## End-to-End Flow

```
Spring Boot
    │
    │  POST /tts/tasks  (segments with text + voiceId)
    ▼
FastAPI
    │  Creates job in MongoDB (PENDING)
    │  Returns taskId immediately
    │
    │  [Background Worker]
    │  Calls TTS provider per segment
    │  Writes .mp3 files to /tts-storage/{taskId}/
    │  Updates job result with audioUrls
    │  Marks job COMPLETED
    │
Spring Boot (polling)
    │
    │  GET /tts/tasks/{taskId}   ← polls until COMPLETED
    ▼
Spring Boot
    │  Reads result audioUrls
    │  Assembles Content object
    │  Saves Content to MongoDB
    │  Marks Transformation → READY
    ▼
Frontend
    │  GET /content/{transformationId}
    │  Receives sections with text + personaId + audioUrl
    ▼
Player
    Plays audiobook with synchronized text + audio
```

---

## Key Design Decisions

### 1. Polling over Messaging

Polling was chosen over RabbitMQ or Celery because:

- No broker infrastructure to deploy or manage
- Fully debuggable — job state is always visible in MongoDB
- Sufficient for MVP request volume
- Spring Boot already has a polling loop pattern built in

### 2. Job-Based Batch Model

The service does not stream audio and does not synthesize in real time. It processes a complete batch of segments for a transformation and marks the job done. Playback only begins after the entire job is `COMPLETED`. This keeps the player experience deterministic and buffer-free.

### 3. Local Filesystem for Audio

Chosen for zero infrastructure overhead. Audio files are treated as **disposable derivatives** — regenerable from the job payload at any time. The `audioUrl` abstraction in the API contract means the storage backend can be swapped (to S3, MinIO, etc.) without any frontend change.

### 4. Idempotency Deferred

The following are explicitly **not required for MVP**:

- Retry logic on failed segments
- Duplicate job detection
- Distributed locks
- Exactly-once delivery guarantees

These become relevant post-MVP when multiple concurrent users generate audio simultaneously.

---

## MVP Boundaries

### In Scope

- [x] Voice CRUD (admin-only)
- [x] `POST /tts/tasks` — submit batch generation job
- [x] `GET /tts/tasks/{taskId}` — poll job status
- [x] `GET /tts/tasks/{taskId}/content` — convenience resolved endpoint
- [x] Async background worker (FastAPI BackgroundTasks / asyncio)
- [x] Local filesystem audio storage
- [x] Static file serving via FastAPI
- [x] MongoDB job tracking

### Explicitly Out of Scope (Post-MVP)

| Feature | Why deferred |
|---------|-------------|
| RabbitMQ / Celery | Overengineering for current load |
| S3 / MinIO storage | Infrastructure not needed yet |
| CDN audio delivery | Post-validation |
| WebSocket progress updates | Polling is sufficient |
| Streaming / real-time TTS | Different product feature |
| Retry & idempotency logic | Deferred until concurrent load demands it |
| Distributed locks | Single-instance MVP doesn't need them |

# Interactive Multi-Persona Book Player

An application that lets users assign AI-generated voices to characters in a book, then experience it as a fully synchronized audiobook — one distinct voice per character.

---

## What it does

```
Login → Select Book → Create Transformation → Assign Personas → Generate Audio → Play Audiobook
```

A user picks a book, maps each character to a voice persona, triggers audio generation, and plays back the result with text and audio synchronized in real time. All audio is pre-generated before playback begins — no streaming, no buffering mid-session.

---

## System Architecture

```
┌─────────────────────┐
│   React Frontend    │  TypeScript — Player + Library UI
└────────┬────────────┘
         │ REST / JWT
┌────────▼────────────┐
│  Spring Boot API    │  Java — Orchestrator & Business Logic
└────────┬────────────┘
         │ HTTP (internal)
┌────────▼────────────┐
│  Audio Renderer     │  Python / FastAPI — TTS generation engine
└────────┬────────────┘
         │
┌────────▼────────────┐
│      MongoDB        │  Document store — all persistent state
└─────────────────────┘
```

| Layer | Role |
|-------|------|
| React | User-facing UI — library, transformation builder, synchronized player |
| Spring Boot | Single source of truth — auth, orchestration, all business logic |
| Audio Renderer | Stateless audio engine — accepts tasks, returns MP3 files + URLs |
| MongoDB | Persistent storage — books, users, transformations, content, TTS jobs |

The frontend **never** contacts the Audio Renderer directly. Spring Boot owns all coordination.

---

## Services

| Service | Stack | Location |
|---------|-------|----------|
| Audio Renderer | Python · FastAPI · Motor | `services/audio-renderer-service/` |
| Business API | Java · Spring Boot | *(not yet scaffolded)* |
| Frontend | React · TypeScript | *(not yet scaffolded)* |

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.13 | Audio Renderer runtime |
| uv | latest | Python package manager |
| MongoDB | 7+ | Shared database |
| Azure Cognitive Services | — | TTS provider (Audio Renderer) |

---

## Getting Started

### 1. MongoDB

Start a local instance (or point services at an Atlas URI):

```bash
mongod --dbpath ./data/db
```

Or with Docker:

```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

---

### 2. Audio Renderer Service

```bash
cd services/audio-renderer-service

# Copy and fill in credentials
cp .env.example .env

# Install dependencies (Python 3.13 required)
uv sync --extra dev

# Start the service
uv run uvicorn src.main:app --reload --port 8001
```

Swagger UI: `http://localhost:8001/docs`

See [`services/audio-renderer-service/docs/service.md`](services/audio-renderer-service/docs/service.md) for full configuration reference and API documentation.

---

## Key Design Decisions

**Spring Boot is the orchestrator.** Python is never called by the frontend. All state transitions, validation, and coordination live in Java.

**Polling over messaging.** The frontend polls Java for transformation status. Java polls Python for TTS job status. No message broker, no WebSockets, no Kafka — the MVP volume does not require them.

**Pre-generated audio.** All audio is rendered before playback begins, making the player experience instant and buffer-free.

**Personas live in Java, voices live in Python.** Python owns the TTS provider abstraction (raw Azure voice IDs). Java owns the user-facing layer (named personas, book scoping, character identity). Neither bleeds into the other's domain.

---

## Feature Documentation

| Document | Covers |
|----------|--------|
| [`docs/mvp_general_documentation.md`](docs/mvp_general_documentation.md) | Full system overview, all flows, MVP scope |
| [`docs/features/tts_service.md`](docs/features/tts_service.md) | Audio Renderer design spec |
| [`docs/features/businss_service.md`](docs/features/businss_service.md) | Spring Boot design spec |
| [`docs/features/frontend.md`](docs/features/frontend.md) | Frontend design spec |
| [`services/audio-renderer-service/docs/service.md`](services/audio-renderer-service/docs/service.md) | Audio Renderer implementation reference |

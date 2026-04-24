# narrFlow — Interactive Multi-Persona Book Player

An application that lets users assign AI-generated voices to characters in a book, then experience it as a fully synchronized audiobook — one distinct voice per character.

---

## What it does

```
Login → Select Book → Create Transformation → Assign Personas → Generate Audio → Play Audiobook
```

A user picks a book, maps each character to a voice persona, triggers audio generation, and plays back the result with text and audio synchronized. All audio is pre-generated before playback begins — no streaming, no buffering mid-session.

---

## System Architecture

```
┌─────────────────────┐
│   React Frontend    │  TypeScript — Player + Library UI        port 5173
└────────┬────────────┘
         │ REST / JWT
┌────────▼────────────┐
│  Spring Boot API    │  Java — Orchestrator & Business Logic    port 8080
└────────┬────────────┘
         │ HTTP (internal)
┌────────▼────────────┐
│  Audio Renderer     │  Python / FastAPI — TTS engine           port 8081
└────────┬────────────┘
         │ ElevenLabs API / local filesystem
┌────────▼────────────┐
│      MongoDB        │  Document store — all persistent state
└─────────────────────┘
```

| Layer | Role |
|-------|------|
| React | User-facing UI — library, transformation builder, synchronized player |
| Spring Boot | Single source of truth — auth, orchestration, all business logic |
| Audio Renderer | Stateless TTS engine — accepts tasks, synthesizes via ElevenLabs, returns MP3 files |
| MongoDB | Persistent storage — books, users, transformations, content, TTS jobs |

The frontend **never** contacts the Audio Renderer directly. Spring Boot owns all coordination.

---

## Services

| Service | Stack | Port | Location |
|---------|-------|------|----------|
| Audio Renderer | Python · FastAPI · Motor · ElevenLabs | 8081 | `services/audio-renderer-service/` |
| Orchestrator | Java · Spring Boot · MongoDB | 8080 | `services/orchestrator-service/` |
| Frontend | React · TypeScript · Vite | 5173 | `ui/` |

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.13 | Audio Renderer runtime |
| uv | latest | Python package manager |
| Java | 17 | Orchestrator runtime |
| Node.js | 18+ | Frontend build |
| MongoDB | 7+ | Shared database |
| ElevenLabs API key | — | TTS provider (Audio Renderer) |

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
# Set ELEVENLABS_API_KEY in .env

# Install dependencies
uv sync

# Start the service
uv run uvicorn src.main:app --reload --port 8081
```

Swagger UI: `http://localhost:8081/docs`

See [`services/audio-renderer-service/docs/service.md`](services/audio-renderer-service/docs/service.md) for full configuration and API reference.

---

### 3. Orchestrator Service

```bash
cd services/orchestrator-service
./mvnw spring-boot:run
```

API base: `http://localhost:8080/api/v1`

---

### 4. Frontend

```bash
cd ui
npm install
npm run dev
```

App: `http://localhost:5173`

For environment-specific API URL, create `ui/.env.local`:

```
VITE_API_URL=http://localhost:8080
```

---

## Exposing Services Externally (Cloudflare Tunnel)

To access the app from another device (phone, remote machine) without deploying:

```bash
# Three separate terminals
cloudflared tunnel --url http://localhost:5173   # frontend
cloudflared tunnel --url http://localhost:8080   # orchestrator
cloudflared tunnel --url http://localhost:8081   # audio renderer
```

Each command prints a `https://*.trycloudflare.com` URL. Set the orchestrator URL in `ui/.env.local` and the audio renderer URL in `services/orchestrator-service/src/main/resources/application.yml` under `tts.service.base-url`.

> Note: Quick tunnel URLs change on every restart. For stable URLs, use a named Cloudflare Tunnel with a free account.

---

## Key Design Decisions

**Spring Boot is the orchestrator.** Python is never called by the frontend. All state transitions, validation, and coordination live in Java.

**Polling over messaging.** The frontend polls Java for transformation status. Java polls Python for TTS job status. No message broker, no WebSockets, no Kafka — the MVP volume does not require them.

**Pre-generated audio.** All audio is rendered before playback begins, making the player experience instant and buffer-free.

**ElevenLabs via eleven_multilingual_v2.** The Audio Renderer uses ElevenLabs for TTS synthesis. Voices are fetched live from the ElevenLabs API and support language filtering (e.g. `GET /voices?language=ro` for Romanian).

**Personas live in Java, voices live in Python.** Python owns the TTS provider abstraction (ElevenLabs voice IDs). Java owns the user-facing layer (named personas, book scoping, character identity).

---

## Feature Documentation

| Document | Covers |
|----------|--------|
| [`docs/mvp_general_documentation.md`](docs/mvp_general_documentation.md) | Full system overview, all flows, MVP scope |
| [`docs/features/tts_service.md`](docs/features/tts_service.md) | Audio Renderer design spec |
| [`docs/features/businss_service.md`](docs/features/businss_service.md) | Spring Boot design spec |
| [`docs/features/frontend.md`](docs/features/frontend.md) | Frontend design spec |
| [`services/audio-renderer-service/docs/service.md`](services/audio-renderer-service/docs/service.md) | Audio Renderer implementation reference |

# Java Service (Spring Boot) — Feature Documentation

> **Service Role:** System of record + orchestration layer
> **Stack:** Java 17 · Spring Boot 3 · MongoDB
> **Port:** 8080
> **Version:** MVP 1.0 — implemented

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Book Module](#book-module)
3. [Transformation Module](#transformation-module)
4. [Persona & Voice Separation](#persona--voice-separation)
5. [Generation Flow](#generation-flow)
6. [Content Model](#content-model)
7. [Polling Architecture Decision](#polling-architecture-decision)
8. [Full System Flow](#full-system-flow)
9. [Key Design Decisions](#key-design-decisions)

---

## Service Overview

The Java service is the **system of record and orchestration layer** for the entire platform.

| What it does | What it does NOT do |
|--------------|---------------------|
| Owns all business logic | Generate audio |
| Manages transformation state machine | Store audio files |
| Coordinates calls to the TTS service | Serve static assets |
| Is the single source of truth for the frontend | Handle TTS provider directly |
| Proxies voice listing to the Python service | |

### Mental Model

> **"A state machine with batch processing."**

This is not a real-time system, not an event-driven architecture, and not a distributed orchestrator. It is a deterministic pipeline backed by a DB-driven state machine and polling.

---

## Book Module

### Endpoints

#### Create Book *(SUPERADMIN only)*

```
POST /api/v1/books
```

Accepts a structured JSON payload and persists it as a `Book` document in MongoDB.

---

#### List Books

```
GET /api/v1/books
```

Returns all available books. Read-only for `TESTER` role.

---

#### Get Book

```
GET /api/v1/books/{bookId}
```

Returns the full book document including all sections and content paragraphs.

---

### Book Data Format

```json
{
  "title": "The Midnight Expedition",
  "version": "1.0",
  "sections": [
    {
      "sectionId": "s1",
      "sectionName": "Chapter 1 - Introduction",
      "content": [
        { "text": "Initial paragraph text.", "author": "narrator" },
        { "text": "Second paragraph text.", "author": "narrator" }
      ]
    },
    {
      "sectionId": "s2",
      "sectionName": "Chapter 2 - Dialog",
      "content": [
        { "text": "You shouldn't have come here.", "author": "edmund" },
        { "text": "I had no choice.", "author": "margaret" }
      ]
    }
  ]
}
```

| Field | Requirement |
|-------|-------------|
| `sectionId` | Explicit and deterministic — used as key in `personaMapping` |
| `author` | The character speaking — users assign voices per author, not per paragraph |
| `sectionName` | Human-readable section label |

---

## Transformation Module

The Transformation is the **core domain object**. It tracks a user's journey from book selection through persona assignment to completed audio generation.

### Data Model

```json
{
  "id": "uuid",
  "userId": "u1",
  "bookId": "b1",
  "status": "DRAFT | PERSONA_ASSIGNMENT | GENERATING | DONE",
  "personaMapping": {
    "s1": "persona_abc",
    "s2": "persona_xyz"
  },
  "ttsTaskId": "abc123",
  "createdAt": "2026-04-24T10:00:00Z",
  "updatedAt": "2026-04-24T10:05:30Z"
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique transformation identifier |
| `userId` | Owner |
| `bookId` | The book this transformation applies to |
| `status` | Current phase in the state machine |
| `personaMapping` | Map of `sectionId → personaId` |
| `ttsTaskId` | Stored after Java calls Python — used for internal polling |

### Status State Machine

```
DRAFT
  │   (user begins assigning personas)
  ▼
PERSONA_ASSIGNMENT
  │   (user triggers generation)
  ▼
GENERATING
  │   (Python TTS completes job)
  ▼
DONE
```

Each transition is owned and validated by Java. The frontend never advances state directly.

### Endpoints

#### Create Transformation

```
POST /api/v1/transformations
```

**Request:**

```json
{ "bookId": "b1" }
```

**Response:** New transformation with `status: DRAFT`. Returns `409` if user already has 5 transformations.

---

#### List Transformations

```
GET /api/v1/transformations
```

Returns all transformations for the current authenticated user.

---

#### Get Transformation

```
GET /api/v1/transformations/{id}
```

Returns full transformation including current status. This is the endpoint the frontend polls to detect generation completion.

---

#### Update Persona Assignment

```
PUT /api/v1/transformations/{id}/personas
```

**Request:**

```json
{
  "personaMapping": {
    "s1": "persona_abc",
    "s2": "persona_xyz"
  }
}
```

Advances status from `DRAFT` → `PERSONA_ASSIGNMENT` (or updates an existing mapping).

---

#### Trigger Generation

```
POST /api/v1/transformations/{id}/generate
```

Kicks off the audio generation pipeline. Returns immediately.

**Response:**

```json
{
  "transformationId": "uuid",
  "status": "GENERATING",
  "ttsTaskId": "abc123"
}
```

---

## Persona & Voice Separation

Voices and personas are owned by different services:

| Concept | Owner | Description |
|---------|-------|-------------|
| **Voice** | Python TTS Service | Raw ElevenLabs voice — a `voice_id` string |
| **Persona** | Java Service | User-defined mapping — a named character assigned to a voice |

This means:
- Python is a **voice registry** (provider-coupled, fetched live from ElevenLabs)
- Java is a **persona registry** (user-specific, book-scoped, human-readable)

When Java builds a TTS request, it resolves `personaId → voiceId` internally before sending segments to Python. Python only ever sees raw `voiceId` values.

### Persona Data Model (Java)

```json
{
  "id": "persona_abc",
  "userId": "u1",
  "bookId": "b1",
  "name": "Old Wizard",
  "voiceId": "JBFqnCBsd6RMkjVDRZzb"
}
```

---

## Generation Flow

### Step-by-Step

```
1. User calls POST /transformations/{id}/generate
        ↓
2. Java validates:
   - status is PERSONA_ASSIGNMENT
   - all sections have a persona assigned
        ↓
3. Java fetches all section texts for the book
        ↓
4. Java resolves each sectionId → personaId → voiceId
        ↓
5. Java builds TTS request:
   [
     { segmentNumber: 0, text: "...", voiceId: "EXAVITQu...", personaId: "p1", transformationId: "t1" },
     { segmentNumber: 1, text: "...", voiceId: "JBFqnCBs...", personaId: "p2", transformationId: "t1" }
   ]
        ↓
6. Java calls POST /tts/tasks (Python service)
        ↓
7. Python returns taskId immediately (202 Accepted)
        ↓
8. Java stores taskId on Transformation
9. Java sets status → GENERATING
        ↓
10. [Background: Java polls Python GET /tts/tasks/{taskId}]
        ↓
11. Python returns COMPLETED with audioUrls
        ↓
12. Java calls GET /tts/tasks/{taskId}/content
13. Java assembles Content object
14. Java persists Content to MongoDB
15. Java sets Transformation status → DONE
```

### Internal Polling (Java → Python)

```
Java Background Scheduler
    │  GET /tts/tasks/{ttsTaskId}  (every N seconds)
    ▼
Python TTS Service
    │  Returns { status: "COMPLETED", result: [...] }
    ▼
Java
    │  GET /tts/tasks/{taskId}/content
    │  Assembles Content
    │  Sets Transformation → DONE
```

---

## Content Model

The `Content` object is the **final, precomputed playback graph** consumed by the frontend player. Assembled once after TTS generation completes and stored in MongoDB.

```json
{
  "contentId": "uuid",
  "bookId": "b1",
  "transformationId": "t1",
  "items": [
    {
      "sectionId": "s1",
      "sectionName": "Chapter 1 - Introduction",
      "text": "It was a dark and stormy night.",
      "audioUri": "https://audio-renderer.trycloudflare.com/audio/abc123/0.mp3",
      "personaId": "persona_abc",
      "voiceId": "EXAVITQu4vr4xnSDxMaL"
    }
  ]
}
```

### Access Endpoint

```
GET /api/v1/content/{transformationId}
```

Returns the full `Content` object once the transformation status is `DONE`. The frontend calls this once and drives the player entirely from the response.

---

## Polling Architecture Decision

| Option | Decision | Reason |
|--------|----------|--------|
| Frontend polls Java | **Selected** | Clean, single source of truth, secure, debuggable |
| Frontend polls Python directly | Rejected | Bypasses orchestration, no security boundary |
| Java pushes via WebSockets / Kafka | Rejected | Overengineering for MVP load |

### Selected Flow

```
Frontend
    │  GET /api/v1/transformations/{id}  every 3s
    ▼
Java → { status: "GENERATING" }  ← keep polling
Java → { status: "DONE" }        ← stop, load content
    ▼
Frontend
    │  GET /api/v1/content/{transformationId}
    ▼
Player starts
```

---

## Full System Flow

```
1.  SUPERADMIN uploads book
         ↓  POST /api/v1/books
         Java parses → stores Book in MongoDB

2.  User creates transformation
         ↓  POST /api/v1/transformations
         Java creates Transformation (status: DRAFT)

3.  User assigns personas
         ↓  PUT /api/v1/transformations/{id}/personas
         Java saves personaMapping (status: PERSONA_ASSIGNMENT)

4.  User triggers generation
         ↓  POST /api/v1/transformations/{id}/generate
         Java validates → builds TTS payload → calls Python
         Java stores ttsTaskId (status: GENERATING)

5.  Python generates audio
         [Java polls GET /tts/tasks/{taskId} internally]
         Python returns COMPLETED + audioUrls

6.  Java assembles Content
         Java stores Content in MongoDB
         Java sets Transformation → DONE

7.  Frontend detects DONE
         GET /api/v1/content/{transformationId}

8.  Playback begins
         Player iterates Content items
         Displays text + persona, plays audio per section
```

---

## Key Design Decisions

### 1. Java is the Single Source of Truth

The frontend never needs to understand the TTS system. It only talks to Java. Java owns the complete state machine and shields the frontend from all backend complexity.

### 2. Polling over Events (for MVP)

A polling model backed by DB state was chosen over WebSockets, Kafka, or server-sent events. The result is a system that is fully debuggable, stateless between requests, and simple to reason about.

### 3. Content is Precomputed

The `Content` object is generated once and stored. The frontend player reads a static, ordered list of sections. There is no live rendering, no on-demand synthesis, and no streaming. Playback is instant because all work is done before the player opens.

### 4. Personas Live in Java, Voices Live in Python

Python manages the ElevenLabs voice abstraction. Java manages the user experience layer — naming, book scoping, persona identity. Neither bleeds into the other's domain.

### 5. State Machine over Ad-Hoc Flags

The formal `DRAFT → PERSONA_ASSIGNMENT → GENERATING → DONE` state machine prevents invalid transitions, makes the system self-documenting, and gives the frontend a reliable contract for rendering the correct UI phase at each step.

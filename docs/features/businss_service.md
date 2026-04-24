# ☕ Java Service (Spring Boot) — Feature Documentation

> **Service Role:** System of record + orchestration layer  
> **Stack:** Java · Spring Boot · MongoDB  
> **Version:** MVP 1.0

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
| Is the single source of truth for frontend | Handle TTS provider directly |

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

Accepts a structured JSON file and persists it as a `Book` document in MongoDB.

---

#### List Books

```
GET /api/v1/books
```

Returns all available books. Read-only for `TESTER` role.

---

#### Get Sections for a Book

```
GET /api/v1/books/{bookId}/sections
```

Returns all sections belonging to the specified book.

---

#### Get a Single Section

```
GET /api/v1/books/{bookId}/sections/{sectionId}
```

Returns a single section by ID. Used by the player and transformation builder.

---

### Book File Format

When a `SUPERADMIN` uploads a book, it must follow this structure. The `sectionId` field is critical — it is the stable key used throughout the transformation and TTS pipeline.

```json
{
  "version": "1.0",
  "sections": [
    {
      "sectionId": "s1",
      "sectionName": "Chapter 1 - Introduction",
      "content": [
        { "text": "Initial paragraph text." },
        { "text": "Second paragraph text." }
      ]
    },
    {
      "sectionId": "s2",
      "sectionName": "Chapter 1 - The Discovery",
      "content": [
        { "text": "She opened the door slowly." }
      ]
    }
  ]
}
```

**Why this format matters:**

| Requirement | How the format satisfies it |
|-------------|----------------------------|
| Stable section identity | `sectionId` is explicit and deterministic — never auto-generated from position |
| TTS mapping | `personaMapping` in transformations uses `sectionId` as key |
| Unambiguous display | `sectionName` is clear and human-readable |
| Multiple paragraphs per section | `content` is an array, so sections are not limited to a single text block |

---

## Transformation Module

The Transformation is the **core domain object** of the system. It tracks a user's journey from book selection through persona assignment to completed audio generation.

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
  "createdAt": "2026-04-23T10:00:00Z",
  "updatedAt": "2026-04-23T10:05:30Z"
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique transformation identifier |
| `userId` | Owner of this transformation |
| `bookId` | The book this transformation applies to |
| `status` | Current phase in the state machine |
| `personaMapping` | Map of `sectionId → personaId` |
| `ttsTaskId` | Stored after Java calls Python — used for internal polling |
| `createdAt / updatedAt` | Full audit trail |

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

Each status transition is owned and validated by Java. The frontend never advances the state directly.

### Endpoints

#### Create Transformation

```
POST /api/v1/transformations
```

**Request Body:**

```json
{
  "bookId": "b1"
}
```

**Response:** New transformation object with `status: DRAFT`.

---

#### Get Transformation

```
GET /api/v1/transformations/{id}
```

Returns the full transformation including current status. This is the endpoint the frontend polls to check generation readiness.

---

#### Update Persona Assignment

```
PUT /api/v1/transformations/{id}/personas
```

**Request Body:**

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

Kicks off the audio generation pipeline. Java validates the transformation, builds the TTS request, calls the Python service, stores the returned `ttsTaskId`, and sets status to `GENERATING`.

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

A key architectural clarification: **voices** and **personas** are owned by different services.

| Concept | Owner | Description |
|---------|-------|-------------|
| **Voice** | Python TTS Service | Raw TTS provider voice — e.g., an ElevenLabs voice ID |
| **Persona** | Java Service | User-defined mapping layer — a named character assigned to a voice |

This separation means:

- The Python service is a **voice registry** (stable, admin-managed, provider-coupled)
- The Java service is a **persona registry** (user-specific, book-scoped, human-readable)

### Flow

```
Python TTS Service → owns voices  (e.g., "eleven_voice_001", "calm_female")
Java Service       → owns personas (e.g., "Old Wizard" mapped to "eleven_voice_001")
```

When Java builds a TTS request, it resolves `personaId → voiceId` internally before sending segments to Python. Python only ever sees `voiceId`.

### Persona Data Model (Java)

```json
{
  "id": "persona_abc",
  "userId": "u1",
  "bookId": "b1",
  "name": "Old Wizard",
  "voiceId": "eleven_voice_001"
}
```

---

## Generation Flow

This is the critical path — the sequence that takes a completed persona assignment and produces a playable audiobook.

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
4. Java resolves each persona → voiceId
        ↓
5. Java builds TTS request payload:
   [
     { segmentNumber: 0, text: "...", voiceId: "v1", personaId: "p1", ... },
     { segmentNumber: 1, text: "...", voiceId: "v2", personaId: "p2", ... }
   ]
        ↓
6. Java calls POST /tts/tasks (Python)
        ↓
7. Python returns taskId
        ↓
8. Java stores taskId on the Transformation document
9. Java sets status → GENERATING
        ↓
10. [Background: Java polls Python GET /tts/tasks/{taskId}]
        ↓
11. Python returns COMPLETED with audioUrls
        ↓
12. Java assembles Content object
13. Java persists Content to MongoDB
14. Java sets Transformation status → DONE
```

### Internal Polling (Java → Python)

Java is responsible for polling the Python TTS service internally. The frontend never contacts Python directly.

```
Java Scheduler / Background Thread
    │
    │  GET /tts/tasks/{ttsTaskId}   (polls until COMPLETED)
    ▼
Python TTS Service
    │  Returns status + audioUrls
    ▼
Java
    │  Assembles Content object
    │  Saves to MongoDB
    │  Sets Transformation → DONE
```

**Polling strategy for MVP:** A simple scheduled task or `@Async` method with a sleep loop is sufficient. No external scheduler needed.

---

## Content Model

The `Content` object is the **final, precomputed playback graph** consumed by the frontend player. It is assembled by Java once TTS generation is complete and stored in MongoDB.

```json
{
  "contentId": "uuid",
  "bookId": "b1",
  "transformationId": "t1",
  "items": [
    {
      "sectionId": "s1",
      "text": "It was a dark and stormy night.",
      "audioUri": "http://tts-service/audio/abc123/0.mp3",
      "personaId": "persona_abc"
    },
    {
      "sectionId": "s2",
      "text": "She opened the door slowly.",
      "audioUri": "http://tts-service/audio/abc123/1.mp3",
      "personaId": "persona_xyz"
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `contentId` | Unique content identifier |
| `bookId` | Source book |
| `transformationId` | The transformation this content was generated from |
| `items` | Ordered array of sections with text, audio URL, and persona |

### Access Endpoint

```
GET /api/v1/content/{transformationId}
```

Returns the full `Content` object once the transformation status is `DONE`. The frontend calls this once and then drives the player entirely from the response.

---

## Polling Architecture Decision

The frontend needs to know when generation is complete. Three options were evaluated:

| Option | Decision | Reason |
|--------|----------|--------|
| ✅ Frontend polls Java | **Selected** | Clean, single source of truth, secure, debuggable |
| ❌ Frontend polls Python directly | Rejected | Bypasses orchestration, couples frontend to TTS infrastructure, no security control |
| ❌ Java pushes via WebSockets / Kafka | Rejected | Overengineering for MVP load and team size |

### Selected Flow

```
Frontend
    │
    │  GET /api/v1/transformations/{id}   (polls every N seconds)
    ▼
Java
    │  Returns { status: "GENERATING" }   ← keep polling
    │  Returns { status: "DONE" }         ← stop polling, load content
    ▼
Frontend
    │  GET /api/v1/content/{transformationId}
    ▼
Player starts
```

The frontend only ever talks to Java. Java handles all coordination with Python internally.

---

## Full System Flow

```
1.  SUPERADMIN uploads book
         ↓
    POST /api/v1/books
    Java parses file → stores Book/Sections in MongoDB

2.  User creates transformation
         ↓
    POST /api/v1/transformations
    Java creates Transformation (status: DRAFT)

3.  User assigns personas
         ↓
    PUT /api/v1/transformations/{id}/personas
    Java saves personaMapping (status: PERSONA_ASSIGNMENT)

4.  User triggers generation
         ↓
    POST /api/v1/transformations/{id}/generate
    Java validates → builds TTS payload → calls Python
    Java stores ttsTaskId (status: GENERATING)

5.  Python generates audio
         ↓
    [Java polls GET /tts/tasks/{taskId} internally]
    Python returns COMPLETED + audioUrls

6.  Java assembles Content
         ↓
    Java stores Content in MongoDB
    Java sets Transformation → DONE

7.  Frontend detects DONE
         ↓
    GET /api/v1/transformations/{id}  → status: DONE
    GET /api/v1/content/{transformationId}

8.  Playback begins
         ↓
    Player iterates Content items
    Displays text + persona, plays audio per section
```

---

## Key Design Decisions

### 1. Java is the Single Source of Truth

The frontend never needs to understand the TTS system. It only talks to Java. Java owns the complete state machine and shields the frontend from all backend complexity.

### 2. Polling over Events (for MVP)

A polling model backed by DB state was chosen over WebSockets, Kafka, or server-sent events. The result is a system that is:

- Fully debuggable — job state is always visible in MongoDB
- Stateless between requests — no in-memory session tracking needed
- Simple to reason about — status transitions are explicit and synchronous

### 3. Content is Precomputed

The `Content` object is generated once and stored. The frontend player reads a static, ordered list of sections. There is no live rendering, no on-demand synthesis, and no streaming. Playback is instant because all work is done before the player opens.

### 4. Personas Live in Java, Voices Live in Python

This separation keeps each service focused on its own domain. Python manages the TTS provider abstraction. Java manages the user experience layer (naming, book scoping, persona identity). Neither bleeds into the other's domain.

### 5. State Machine over Ad-Hoc Status Flags

Using a formal `DRAFT → PERSONA_ASSIGNMENT → GENERATING → DONE` state machine prevents invalid transitions, makes the system self-documenting, and gives the frontend a reliable contract for rendering the correct UI phase at each step.

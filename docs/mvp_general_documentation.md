# 📖 Interactive Multi-Persona Book Player — MVP Documentation

> **Version:** 1.0 — MVP  
> **Status:** Architecture & Design Phase  
> **Last Updated:** 2026-04-23

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Frontend (React + TypeScript)](#frontend-react--typescript)
4. [Backend (Java Spring Boot)](#backend-java-spring-boot)
5. [TTS Service (Python + FastAPI)](#tts-service-python--fastapi)
6. [Database (MongoDB)](#database-mongodb)
7. [Key Flows](#key-flows)
8. [Design Decisions](#design-decisions)
9. [MVP Scope & Constraints](#mvp-scope--constraints)

---

## Overview

The **Interactive Multi-Persona Book Player** is a web application that allows users to assign distinct AI-generated voices ("personas") to characters in a structured book, then play back the book as a synchronized audiobook experience — one voice per character.

### Core Product Loop

```
Login → Select Book → Create Transformation → Assign Personas → Generate Audio → Play Audiobook
```

### Goals for MVP

- Demonstrate end-to-end pipeline: text → persona assignment → audio generation → synchronized playback
- Support 10–20 testers via hardcoded user accounts
- Pre-generate all audio before playback (no live TTS streaming)
- Keep UI minimal and focused on the playback experience

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
│  Python TTS Service │  FastAPI — Audio Generation Engine
└────────┬────────────┘
         │
┌────────▼────────────┐
│      MongoDB        │  Document Store — All persistent data
└─────────────────────┘
```

**Responsibilities at a glance:**

| Layer | Role |
|-------|------|
| React | User-facing UI — library, player, transformation builder |
| Spring Boot | Single source of truth — orchestration, auth, business logic |
| Python TTS | Stateless audio generation — accepts tasks, returns audio URLs |
| MongoDB | Persistent storage — books, users, transformations, content |

---

## Frontend (React + TypeScript)

### Pages & Views

#### 1. 🔐 Login Page

- Hardcoded user list (10–20 testers, no self-registration)
- JWT-based session management
- Redirects to Books Library on success

#### 2. 📚 Books Library

- Calls `GET /books`
- Lists 3–5 predefined books (read-only)
- Click a book → opens Book Viewer

#### 3. 📖 Book Viewer (Read Mode)

Displays the full book structure:

```
Book
 └── Chapter
       └── Section (text content)
```

Features:
- Expand / collapse chapters
- View section text content
- No editing capabilities

#### 4. 🎭 Transformation Builder

Allows users to create and manage **Persona Assignment Configurations** for a book.

**Rules:**
- Maximum **5 transformations** per user
- Each transformation is scoped to a `(userId, bookId)` pair

**Workflow:**
1. Select a book
2. Backend detects characters (rule-based parsing)
3. Assign a persona to each character from available voices

**Persona Model:**

```json
{
  "id": "persona_1",
  "name": "Friendly Narrator",
  "voice_id": "eleven_voice_003"
}
```

**CRUD operations:** Create, Read, Update, Delete transformations (up to the 5-persona limit).

#### 5. 🎧 Content Player *(Core MVP Feature)*

The primary product experience.

**UI Elements:**
- Play / Pause button
- Next Section / Previous Section controls
- Current section text display
- Active persona indicator (who is speaking)
- Audio sync indicator per section

**Behavior:**
- Linear playback through sections
- Each section has a pre-generated audio URL
- Audio and text are synchronized

**Section Data Shape:**

```json
{
  "sectionId": "s_001",
  "text": "...",
  "personaId": "persona_1",
  "audioUrl": "https://storage.example.com/audio/s_001.mp3"
}
```

### Frontend Constraints (MVP)

The following are **intentionally excluded** from MVP:

| Excluded Feature | Reason |
|-----------------|--------|
| Waveform visualizer | Complexity, not core |
| Editing tools | Out of scope |
| AI chat / assistant | Out of scope |
| Timeline UI | Not needed for linear playback |
| Multi-track audio mixing | Future feature |

---

## Backend (Java Spring Boot)

Spring Boot is the **orchestrator and single source of truth**. It owns all business logic, data integrity, and communication with the TTS service.

### Modules

#### 1. 🔐 Auth Module

- JWT-based authentication
- Hardcoded users seeded in MongoDB at startup

**Roles:**

| Role | Permissions |
|------|------------|
| `SUPERADMIN` | Full access — can create/delete books |
| `TESTER` | Read books, manage own transformations, play content |

#### 2. 📚 Book Module

**Entities:** `Book`, `Chapter`, `Section`

| Operation | Who |
|-----------|-----|
| Read books | All authenticated users |
| Create / Delete books | `SUPERADMIN` only |
| Upload structured file | `SUPERADMIN` — parsed into MongoDB |

**Upload flow:** Structured file → parser → `Book / Chapter / Section` documents in MongoDB.

#### 3. 🎭 Persona Module

Per-user, per-book persona management (CRUD).

**Persona Entity:**

```json
{
  "id": "persona_abc",
  "bookId": "book_001",
  "userId": "user_007",
  "name": "Old Wizard",
  "voiceId": "v2"
}
```

#### 4. 🧠 Transformation Module *(Core Product State)*

Stores the mapping between sections and personas for a given user and book.

**Transformation Entity:**

```json
{
  "id": "transform_001",
  "userId": "user_007",
  "bookId": "book_001",
  "personaMapping": {
    "section_01": "persona_abc",
    "section_02": "persona_xyz"
  },
  "status": "CREATED | PROCESSING | READY"
}
```

**Status Lifecycle:**

```
CREATED → PROCESSING → READY
```

**Transformation limit:** Max 5 per user.

#### 5. 🎧 Content Module *(Playback-Ready Output)*

After TTS generation is complete, Spring Boot assembles the final `Content` object consumed by the frontend player.

**Content Entity:**

```json
{
  "id": "content_001",
  "transformationId": "transform_001",
  "sections": [
    {
      "sectionId": "s_001",
      "text": "...",
      "personaId": "persona_abc",
      "audioUrl": "https://storage.example.com/audio/s_001.mp3"
    }
  ]
}
```

#### 6. 🔊 TTS Orchestrator (Java Side)

Manages the communication lifecycle with the Python TTS service.

**Responsibilities:**
- Send batch section payloads to Python TTS service
- Track the returned `taskId`
- Poll `GET /tts/task/{taskId}` for status
- On `DONE`: assemble and persist the `Content` object

---

## TTS Service (Python + FastAPI)

The Python service is a **stateless audio generation engine**. It has no ownership of the database and only executes TTS tasks assigned by Spring Boot.

### Endpoints

#### `GET /voices`

Returns the list of available voices.

**Response:**

```json
[
  { "voice_id": "v1", "name": "Male Narrator" },
  { "voice_id": "v2", "name": "Female Calm" },
  { "voice_id": "v3", "name": "Young Hero" }
]
```

---

#### `POST /tts/task`

Submit a batch TTS generation task.

**Request Body:**

```json
{
  "sections": [
    { "text": "It was a dark and stormy night.", "voice_id": "v1" },
    { "text": "She whispered his name.", "voice_id": "v2" }
  ]
}
```

**Response:**

```json
{
  "taskId": "abc123"
}
```

---

#### `GET /tts/task/{taskId}`

Poll the status of a TTS task.

**Possible States:**

| State | Meaning |
|-------|---------|
| `PENDING` | Task queued, not started |
| `PROCESSING` | Audio being generated |
| `DONE` | All audio files ready |

**Response when `DONE`:**

```json
{
  "status": "DONE",
  "results": [
    { "sectionIndex": 0, "audioUrl": "s3://bucket/audio/s_001.mp3" },
    { "sectionIndex": 1, "audioUrl": "s3://bucket/audio/s_002.mp3" }
  ]
}
```

### Internals

- **Queue:** In-memory task queue (sufficient for MVP load)
- **TTS Provider:** ElevenLabs / Azure TTS / equivalent (one provider for MVP)
- **Storage:** Local filesystem or S3-compatible bucket for audio files

---

## Database (MongoDB)

MongoDB is chosen for its flexible document model, which maps naturally to nested book structures and variable persona mappings.

### Collections

#### `users`

```json
{
  "_id": "ObjectId",
  "username": "tester01",
  "passwordHash": "bcrypt_hash",
  "role": "TESTER | SUPERADMIN"
}
```

#### `books`

```json
{
  "_id": "ObjectId",
  "title": "The Great Adventure",
  "chapters": [
    {
      "id": "ch_01",
      "title": "Chapter 1",
      "sections": [
        { "id": "s_001", "text": "Once upon a time..." }
      ]
    }
  ]
}
```

#### `transformations`

```json
{
  "_id": "ObjectId",
  "userId": "user_007",
  "bookId": "book_001",
  "personaMapping": {
    "s_001": "persona_abc",
    "s_002": "persona_xyz"
  },
  "status": "READY"
}
```

#### `personas`

```json
{
  "_id": "ObjectId",
  "userId": "user_007",
  "bookId": "book_001",
  "name": "Mysterious Stranger",
  "voiceId": "v3"
}
```

#### `content`

```json
{
  "_id": "ObjectId",
  "transformationId": "transform_001",
  "sections": [
    {
      "sectionId": "s_001",
      "text": "Once upon a time...",
      "personaId": "persona_abc",
      "audioUrl": "https://storage.example.com/audio/s_001.mp3"
    }
  ]
}
```

#### `tts_tasks`

```json
{
  "_id": "ObjectId",
  "status": "PENDING | PROCESSING | DONE",
  "payload": { "sections": [...] },
  "result": { "results": [...] }
}
```

---

## Key Flows

### Flow A — Book Upload *(SUPERADMIN only)*

```
SUPERADMIN uploads structured file
        ↓
Spring Boot parser
        ↓
Book / Chapter / Section documents stored in MongoDB
```

---

### Flow B — Create Transformation

```
User selects a book
        ↓
Spring Boot extracts characters (rule-based)
        ↓
User assigns a persona to each character
        ↓
Transformation saved to MongoDB (status: CREATED)
```

---

### Flow C — Generate Audio *(Core Pipeline)*

```
Spring Boot → POST /tts/task (Python)
                    ↓
             Returns taskId
                    ↓
Spring Boot polls GET /tts/task/{taskId}
                    ↓
             Status: DONE
                    ↓
Spring Boot receives audio URLs
                    ↓
Content object assembled & saved to MongoDB
                    ↓
Transformation status → READY
```

---

### Flow D — Playback

```
Frontend requests GET /content/{transformationId}
        ↓
Spring Boot returns Content object (sections + audioUrls)
        ↓
Frontend player loads sections linearly
        ↓
User plays: text + persona displayed, audio plays in sync
```

---

## Design Decisions

### 1. Spring Boot is the Orchestrator

Spring Boot is the single brain of the system. Python is never called directly from the frontend. All business rules, validation, and state transitions live in Spring Boot.

### 2. Python TTS Service is Stateless

The Python service has no database. It receives a task, generates audio, and returns results. State tracking (taskId, status, results) is owned by Spring Boot via the `tts_tasks` MongoDB collection.

### 3. MongoDB for Flexibility

| Reason | Detail |
|--------|--------|
| Nested document model | Books naturally embed chapters and sections |
| Flexible persona mappings | `sectionId → personaId` varies per transformation |
| Fast iteration | Schema-less design aids MVP speed |

### 4. Pre-Generated Audio (Not Live Streaming)

All audio is generated **before** playback begins. This ensures:
- Instant, buffer-free playback
- Predictable UX for the player
- Simpler frontend implementation

Live TTS streaming is a post-MVP feature.

### 5. Hardcoded Users

No registration flow in MVP. All 10–20 testers are seeded directly into MongoDB. This removes the need for email verification, password reset flows, and account management UI.

---

## MVP Scope & Constraints

### In Scope

- [x] JWT authentication (hardcoded users)
- [x] Book library (read-only for testers)
- [x] Book viewer (chapter/section browse)
- [x] Transformation builder (up to 5 per user)
- [x] Persona CRUD
- [x] TTS audio generation pipeline
- [x] Synchronized audiobook player

### Out of Scope (Post-MVP)

- [ ] User registration & account management
- [ ] Book editing by testers
- [ ] Live/streaming TTS playback
- [ ] Waveform visualizer
- [ ] AI-driven character detection
- [ ] Multi-track audio mixing
- [ ] Social / sharing features
- [ ] Analytics dashboard

---

## Summary

The MVP delivers a complete, working pipeline: a user logs in, picks a book, assigns AI voices to characters, triggers audio generation, and plays back the result as a synchronized audiobook. The architecture is clean, with clear separation of concerns across four layers — React for experience, Spring Boot for logic, Python for audio, and MongoDB for storage.

> **Next step:** Define the structured book file format for uploads and implement the section-to-character rule-based parser in Spring Boot.

# 🖥️ Frontend Documentation

> **Product:** Interactive Multi-Persona Book Player  
> **Stack:** React · TypeScript · React Query · Zustand · Axios  
> **Version:** MVP 1.0

---

## Table of Contents

1. [Purpose](#purpose)
2. [Tech Stack](#tech-stack)
3. [Application Structure](#application-structure)
4. [Authentication](#authentication)
5. [Pages & User Flows](#pages--user-flows)
   - [Books Library](#51-books-library-page)
   - [Book Viewer](#52-book-viewer-page)
   - [Transformation Builder](#53-transformation-builder)
   - [Player Page](#54-player-page-core-experience)
6. [Polling Behavior](#polling-behavior)
7. [UI Components](#ui-components)
8. [State Management](#state-management)
9. [Error Handling](#error-handling)
10. [MVP Boundaries](#mvp-boundaries)
11. [Full User Flow](#full-user-flow)

---

## Purpose

The frontend is responsible for four things:

| Responsibility | Description |
|---------------|-------------|
| 📚 Book display | Show books and their section structure |
| 🎭 Persona assignment | Allow users to assign voices to sections |
| ⚙️ Generation trigger | Kick off audio generation and track progress |
| 🎧 Playback experience | Play synchronized audio + text — the core product |

### UX North Star

> **"A super simple audiobook player with voice customization."**

Not an editor. Not a dashboard. Not an AI tool.

---

## Tech Stack

| Package | Role |
|---------|------|
| React (with hooks) | UI framework |
| TypeScript | Type safety across components and API contracts |
| React Query / TanStack Query | Server state — fetching, caching, polling |
| Zustand or React Context | Local UI state — playback index, playing flag |
| Axios | HTTP client with JWT interceptor |

---

## Application Structure

```
src/
 ├── api/              # Axios instance, API call functions
 ├── components/       # Reusable UI components (BookCard, PlayerControls, etc.)
 ├── pages/            # Top-level route pages
 ├── features/
 │    ├── auth/        # Login logic, JWT handling
 │    ├── books/       # Book library, book viewer
 │    ├── transformations/  # Transformation builder, persona assignment
 │    └── player/      # Audio player, playback state
 ├── types/            # Shared TypeScript interfaces and enums
 ├── hooks/            # Custom React hooks (usePlayer, useTransformation, etc.)
 └── utils/            # Helpers (formatters, constants, etc.)
```

---

## Authentication

### Scope (MVP)

- Login only — no registration, no password reset
- Predefined users (seeded in backend)
- JWT stored in memory or `localStorage`
- All API requests attach the JWT via an Axios interceptor

### Endpoint

```
POST /api/v1/auth/login
```

**Request:**

```json
{
  "username": "tester01",
  "password": "password"
}
```

**Response:**

```json
{
  "token": "jwt-token",
  "userId": "u1",
  "role": "TESTER"
}
```

### Behavior

- On success → redirect to `/books`
- On failure → display error message inline
- JWT attached to every subsequent API call via Axios interceptor:

```typescript
axios.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## Pages & User Flows

### 5.1 Books Library Page

**Route:** `/books`

**API:**

```
GET /api/v1/books
```

**Features:**
- Lists all available books
- Click a book card → navigates to Book Viewer

**UI Layout:**

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Book 1     │  │   Book 2     │  │   Book 3     │
│              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

### 5.2 Book Viewer Page

**Route:** `/books/:bookId`

**API:**

```
GET /api/v1/books/{bookId}/sections
```

**Features:**
- Displays all sections of the book in reading order
- Read-only — no editing
- Simple vertical scroll layout

**UI Layout:**

```
Chapter 1 — Introduction
  ─────────────────────────────
  Section 1
  "Initial paragraph text."

  Section 2
  "Second paragraph text."

Chapter 2 — The Discovery
  ─────────────────────────────
  Section 3
  "She opened the door slowly."
```

---

### 5.3 Transformation Builder

**Route:** `/transformations/:bookId`

**Purpose:** Assign a persona (voice) to each section of a book, then trigger audio generation.

#### Flow

```
1. Load book sections
        ↓
2. Load available voices
        ↓
3. User assigns a persona per section (dropdown)
        ↓
4. Save persona mapping
        ↓
5. Trigger generation → status moves to GENERATING
        ↓
6. Poll for DONE → redirect to Player
```

#### APIs

| Action | Endpoint |
|--------|----------|
| Get existing transformation | `GET /api/v1/transformations/{id}` |
| Create new transformation | `POST /api/v1/transformations` |
| Save persona mapping | `PUT /api/v1/transformations/{id}/personas` |
| Get available voices | `GET /api/v1/voices` |
| Trigger generation | `POST /api/v1/transformations/{id}/generate` |

#### UI Layout

```
Book: "The Great Adventure"
─────────────────────────────────────────────

Section 1 — Chapter 1 - Introduction
"Initial paragraph text..."
Persona: [ Calm Female ▾ ]

Section 2 — Chapter 1 - The Discovery
"She opened the door slowly..."
Persona: [ Deep Male ▾ ]

─────────────────────────────────────────────
[ Generate Audio ]
```

#### Constraints

- Maximum **5 transformations** per user — show count and disable creation at limit
- All sections must have a persona assigned before generation can be triggered
- The Generate button is disabled until all sections have a selected voice

---

### 5.4 Player Page *(Core Experience)*

**Route:** `/content/:contentId`

**API:**

```
GET /api/v1/content/{contentId}
```

**Response:**

```json
{
  "contentId": "uuid",
  "bookId": "b1",
  "transformationId": "t1",
  "items": [
    {
      "sectionId": "s1",
      "text": "It was a dark and stormy night.",
      "audioUri": "/audio/abc123/0.mp3",
      "personaId": "p1"
    },
    {
      "sectionId": "s2",
      "text": "She opened the door slowly.",
      "audioUri": "/audio/abc123/1.mp3",
      "personaId": "p2"
    }
  ]
}
```

#### Player Features

| Control | Behavior |
|---------|----------|
| ▶️ Play | Start audio for current section |
| ⏸ Pause | Pause current audio |
| ⏭ Next | Move to next section |
| ⏮ Previous | Move to previous section |

#### UI Layout

```
┌─────────────────────────────────────────────┐
│  📖 The Great Adventure                      │
│  🎭 Persona: Calm Female Narrator            │
│                                              │
│  "It was a dark and stormy night. The        │
│   wind howled through the empty streets..."  │
│                                              │
│     ⏮  ⏸  ⏭                               │
│     Section 1 of 12                          │
└─────────────────────────────────────────────┘
```

#### Playback Logic

```
Load content items
        ↓
Set currentIndex = 0
        ↓
Play audio for items[currentIndex].audioUri
        ↓
Audio ends → currentIndex + 1
        ↓
Repeat until last section
```

#### Internal Player State

```typescript
interface PlayerState {
  currentIndex: number;      // Which section is active
  isPlaying: boolean;        // Audio playing flag
  audioRef: HTMLAudioElement; // Native audio element reference
}
```

#### Player Simplification Rules

**Included:**
- Section-based linear playback
- Text display synced to current section
- Persona label per section
- Previous / Next controls

**Explicitly excluded:**
- Waveform visualizer
- Timeline scrubbing
- Multi-track audio
- Subtitle timing / karaoke-style highlighting

---

## Polling Behavior

When a transformation is in `GENERATING` status, the frontend polls Java for status updates. The frontend **never contacts the Python TTS service directly**.

### Polling Strategy

- Interval: every **2–5 seconds**
- Endpoint: `GET /api/v1/transformations/{id}`
- Stop condition: status is `DONE` or `FAILED`

### Status → UI Mapping

| Status | UI Behavior |
|--------|-------------|
| `DRAFT` | Show transformation builder in edit mode |
| `PERSONA_ASSIGNMENT` | Show transformation builder in edit mode |
| `GENERATING` | Show loading indicator, disable editing |
| `DONE` | Enable playback, show link to Player |

### Implementation (React Query)

```typescript
const { data } = useQuery(
  ['transformation', id],
  () => fetchTransformation(id),
  {
    refetchInterval: (data) =>
      data?.status === 'DONE' || data?.status === 'FAILED' ? false : 3000,
  }
);
```

---

## UI Components

| Component | Purpose |
|-----------|---------|
| `BookCard` | Displays a book title and metadata in the library grid |
| `SectionList` | Renders an ordered list of sections with their text content |
| `PersonaSelector` | Dropdown to assign a voice to a section in the transformation builder |
| `PlayerControls` | Play / Pause / Next / Previous button group |
| `TextDisplay` | Renders the currently active section text in the player |
| `StatusBadge` | Displays transformation status with appropriate color and label |
| `GenerateButton` | Disabled until all sections have personas; triggers generation on click |

---

## State Management

### Server State — React Query

All data fetched from the API is managed by React Query:

| Data | Query Key |
|------|-----------|
| Book list | `['books']` |
| Book sections | `['sections', bookId]` |
| Transformation | `['transformation', id]` |
| Content | `['content', contentId]` |
| Voices | `['voices']` |

React Query handles caching, background refetching, and the polling interval for transformation status automatically.

### Local UI State — Zustand / useState

State that is purely presentational and not persisted:

| State | Location |
|-------|----------|
| `currentIndex` | Player feature — Zustand store or `useState` |
| `isPlaying` | Player feature — Zustand store or `useState` |
| `audioRef` | Player feature — `useRef` |

---

## Error Handling

MVP-level error handling covers the three most likely failure modes:

| Failure | UI Response |
|---------|------------|
| API call fails (network / 5xx) | Show inline error message with retry option |
| Generation fails (`FAILED` status) | Show error state in transformation builder with a retry button |
| Audio file missing or unloadable | Skip to next section automatically, log warning |

No crash screens or full-page error boundaries required for MVP — inline messages are sufficient.

---

## MVP Boundaries

### In Scope

- [x] JWT login (predefined users)
- [x] Books library page
- [x] Book viewer (read-only)
- [x] Transformation builder with persona dropdown assignment
- [x] Generation trigger + polling
- [x] Audio player with play/pause/next/prev
- [x] Synchronized text display per section

### Explicitly Out of Scope

| Feature | Status |
|---------|--------|
| User registration | Post-MVP |
| Social features / comments | Post-MVP |
| Book editing by users | Post-MVP |
| AI rewriting / chat | Post-MVP |
| Real-time updates (WebSockets) | Post-MVP |
| Waveform visualizer | Post-MVP |
| Offline mode | Post-MVP |
| Timeline scrubbing | Post-MVP |

---

## Full User Flow

```
1.  Login
        ↓  POST /api/v1/auth/login
        ↓  Store JWT

2.  View Books
        ↓  GET /api/v1/books
        ↓  Select a book

3.  Open Book Viewer
        ↓  GET /api/v1/books/{bookId}/sections
        ↓  Read sections

4.  Create Transformation
        ↓  POST /api/v1/transformations

5.  Assign Personas
        ↓  GET /api/v1/voices
        ↓  Assign voice per section
        ↓  PUT /api/v1/transformations/{id}/personas

6.  Trigger Generation
        ↓  POST /api/v1/transformations/{id}/generate

7.  Wait (Polling)
        ↓  GET /api/v1/transformations/{id}  every 3s
        ↓  Status: GENERATING → show loader
        ↓  Status: DONE → proceed

8.  Playback
        ↓  GET /api/v1/content/{contentId}
        ↓  Player renders sections sequentially
        ↓  Audio + text synchronized
```

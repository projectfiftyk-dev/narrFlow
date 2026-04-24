# Frontend Documentation

> **Product:** Interactive Multi-Persona Book Player
> **Stack:** React · TypeScript · React Query · Zustand · Axios · Vite
> **Port:** 5173 (dev)
> **Version:** MVP 1.0 — implemented

---

## Table of Contents

1. [Purpose](#purpose)
2. [Tech Stack](#tech-stack)
3. [Application Structure](#application-structure)
4. [Authentication](#authentication)
5. [Pages & User Flows](#pages--user-flows)
6. [Polling Behavior](#polling-behavior)
7. [UI Components](#ui-components)
8. [State Management](#state-management)
9. [Error Handling](#error-handling)
10. [External Access](#external-access)
11. [MVP Boundaries](#mvp-boundaries)
12. [Full User Flow](#full-user-flow)

---

## Purpose

The frontend is responsible for four things:

| Responsibility | Description |
|---------------|-------------|
| Book display | Show books and their section structure |
| Persona assignment | Allow users to assign voices to sections |
| Generation trigger | Kick off audio generation and track progress |
| Playback experience | Play synchronized audio + text — the core product |

### UX North Star

> **"A super simple audiobook player with voice customization."**

Not an editor. Not a dashboard. Not an AI tool.

---

## Tech Stack

| Package | Version | Role |
|---------|---------|------|
| React | 19 | UI framework |
| TypeScript | 6 | Type safety across components and API contracts |
| React Router | 7 | Client-side routing |
| TanStack React Query | 5 | Server state — fetching, caching, polling |
| Zustand | 5 | Local UI state — playback index, playing flag |
| Axios | 1 | HTTP client with JWT interceptor |
| Vite | 8 | Build tool and dev server |

---

## Application Structure

```
src/
 ├── api/
 │    ├── axios.ts          # Configured Axios instance (base URL + JWT interceptor)
 │    ├── books.ts
 │    ├── voices.ts
 │    ├── transformations.ts
 │    ├── content.ts
 │    └── personas.ts
 ├── components/
 │    ├── AppLayout.tsx      # Header/footer wrapper
 │    ├── BookCard.tsx       # Book library card
 │    ├── PersonaSelector.tsx # Voice dropdown per section
 │    ├── PlayerControls.tsx  # Play/Pause/Next/Prev
 │    └── StatusBadge.tsx    # Transformation status chip
 ├── pages/
 │    ├── LoginPage.tsx
 │    ├── BooksLibraryPage.tsx
 │    ├── BookViewerPage.tsx
 │    ├── NewTransformationPage.tsx
 │    ├── TransformationsListPage.tsx
 │    ├── TransformationBuilderPage.tsx
 │    └── PlayerPage.tsx
 ├── features/
 │    └── auth/
 │         └── useAuth.ts
 ├── store/
 │    └── useAppStore.ts     # Zustand store
 └── types/
      └── index.ts           # Shared TypeScript interfaces
```

---

## Authentication

### Scope (MVP)

- Login only — no registration, no password reset
- Predefined users seeded in Spring Boot
- JWT stored in `localStorage`
- All API requests attach the JWT via an Axios interceptor

### Endpoint

```
POST /api/v1/auth/login
```

**Request:**

```json
{ "username": "tester01", "password": "password" }
```

**Response:**

```json
{ "token": "jwt-token", "userId": "u1", "role": "TESTER" }
```

### Behavior

- On success → redirect to `/books`
- On failure → display inline error message
- JWT attached to every subsequent request:

```typescript
api.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## Pages & User Flows

### Books Library Page

**Route:** `/books`

**API:** `GET /api/v1/books`

Lists all available books as cards. Click a card to navigate to the Book Viewer.

---

### Book Viewer Page

**Route:** `/books/:bookId`

**API:** `GET /api/v1/books/{bookId}`

Displays all sections of the book in reading order. Read-only. Includes a button to start a new transformation for this book.

---

### New Transformation Page

**Route:** `/new-transformation`

**API:** `POST /api/v1/transformations`

Creates a new transformation (book → voice assignment container). Redirects to the Transformation Builder.

---

### Transformations List Page

**Route:** `/transformations`

**API:** `GET /api/v1/transformations`

Lists all transformations for the current user with status badges. Maximum 5 per user.

---

### Transformation Builder Page

**Route:** `/transformations/:id` (embedded in list page)

**Purpose:** Assign a persona (voice) to each section, then trigger audio generation.

#### Flow

```
1. Load book sections
        ↓
2. Load available voices (GET /api/v1/voices)
        ↓
3. User assigns a persona per section (dropdown)
        ↓
4. Save persona mapping (PUT /api/v1/transformations/{id}/personas)
        ↓
5. Trigger generation (POST /api/v1/transformations/{id}/generate)
        ↓
6. Poll for DONE → redirect to Player
```

#### APIs

| Action | Endpoint |
|--------|----------|
| Get transformation | `GET /api/v1/transformations/{id}` |
| Save persona mapping | `PUT /api/v1/transformations/{id}/personas` |
| Get available voices | `GET /api/v1/voices` |
| Trigger generation | `POST /api/v1/transformations/{id}/generate` |

#### Constraints

- Maximum **5 transformations** per user
- All sections must have a persona assigned before generation can be triggered
- The Generate button is disabled until all sections have a selected voice

---

### Player Page *(Core Experience)*

**Route:** `/player` (with transformation state)

**API:** `GET /api/v1/content/{transformationId}`

#### Player Features

| Control | Behavior |
|---------|----------|
| Play | Start audio for current section |
| Pause | Pause current audio |
| Next | Move to next section |
| Previous | Move to previous section |

#### UI Layout

```
┌─────────────────────────────────────────────┐
│  The Great Adventure                         │
│  Persona: Calm Female Narrator               │
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

#### Player State (Zustand)

```typescript
interface PlayerState {
  currentIndex: number;
  isPlaying: boolean;
}
```

---

## Polling Behavior

When a transformation is in `GENERATING` status, the frontend polls Spring Boot for status updates. The frontend **never contacts the Python TTS service directly**.

### Strategy

- Interval: every **3 seconds**
- Endpoint: `GET /api/v1/transformations/{id}`
- Stop condition: status is `DONE` or `FAILED`

### Status → UI Mapping

| Status | UI Behavior |
|--------|-------------|
| `DRAFT` | Transformation builder in edit mode |
| `PERSONA_ASSIGNMENT` | Transformation builder in edit mode |
| `GENERATING` | Loading indicator, editing disabled |
| `DONE` | Enable "Play" button, show link to Player |

### Implementation (React Query)

```typescript
const { data } = useQuery({
  queryKey: ['transformation', id],
  queryFn: () => fetchTransformation(id),
  refetchInterval: (query) =>
    query.state.data?.status === 'DONE' || query.state.data?.status === 'FAILED'
      ? false
      : 3000,
});
```

---

## UI Components

| Component | Purpose |
|-----------|---------|
| `BookCard` | Book library card — title and metadata |
| `PersonaSelector` | Voice dropdown per section in transformation builder |
| `PlayerControls` | Play / Pause / Next / Previous |
| `StatusBadge` | Color-coded transformation status chip |
| `AppLayout` | Header + main content wrapper |

---

## State Management

### Server State — React Query

| Data | Query Key |
|------|-----------|
| Book list | `['books']` |
| Single book | `['book', bookId]` |
| Transformation | `['transformation', id]` |
| Transformations list | `['transformations']` |
| Content | `['content', transformationId]` |
| Voices | `['voices']` |

### Local UI State — Zustand

| State | Purpose |
|-------|---------|
| `currentIndex` | Which segment is active in the player |
| `isPlaying` | Audio playing flag |

---

## Error Handling

| Failure | UI Response |
|---------|------------|
| API call fails (network / 5xx) | Inline error message |
| Generation fails (`FAILED` status) | Error state in builder with retry option |
| Audio file missing or unloadable | Skip to next section automatically |

---

## External Access

For testing on external devices (phone, remote machine), expose the frontend and backend via Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:5173   # frontend
cloudflared tunnel --url http://localhost:8080   # orchestrator (needed by frontend)
```

Set the orchestrator tunnel URL in `ui/.env.local`:

```
VITE_API_URL=https://<orchestrator-tunnel>.trycloudflare.com
```

The Vite dev server is configured with `host: true` and `allowedHosts: true` to accept requests from tunnel domains.

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
- [x] Max 5 transformations per user

### Explicitly Out of Scope

| Feature | Status |
|---------|--------|
| User registration | Post-MVP |
| Social features / comments | Post-MVP |
| Book editing by users | Post-MVP |
| Real-time updates (WebSockets) | Post-MVP |
| Waveform visualizer | Post-MVP |
| Timeline scrubbing | Post-MVP |
| Offline mode | Post-MVP |

---

## Full User Flow

```
1.  Login
        ↓  POST /api/v1/auth/login → store JWT

2.  View Books
        ↓  GET /api/v1/books → select a book

3.  Open Book Viewer
        ↓  GET /api/v1/books/{bookId}

4.  Create Transformation
        ↓  POST /api/v1/transformations

5.  Assign Personas
        ↓  GET /api/v1/voices
        ↓  PUT /api/v1/transformations/{id}/personas

6.  Trigger Generation
        ↓  POST /api/v1/transformations/{id}/generate

7.  Wait (Polling)
        ↓  GET /api/v1/transformations/{id}  every 3s
        ↓  GENERATING → show loader
        ↓  DONE → enable player

8.  Playback
        ↓  GET /api/v1/content/{transformationId}
        ↓  Player renders sections sequentially
        ↓  Audio + text synchronized
```

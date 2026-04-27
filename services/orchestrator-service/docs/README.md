# Orchestrator Service

The central coordination hub for the narrFlow platform. It manages the full lifecycle of turning a book into a multi-voice audiobook: book ingestion, transformation configuration, TTS generation orchestration, audio content delivery, usage enforcement, and metrics collection.

## What it does

1. **Book management** — Stores books as structured documents with sections and paragraphs, each paragraph tagged with an author/character name.
2. **Transformation workflow** — A transformation represents one rendering of a book with a specific voice-per-character mapping. It progresses through a state machine: `DRAFT → VOICE_ASSIGNMENT → GENERATING → DONE / FAILED`.
3. **TTS orchestration** — Sends segmented text to the audio-renderer service, polls for completion asynchronously, and assembles the resulting audio URIs into a playable content document.
4. **Auth** — Google OAuth2 login only. Issues its own short-lived JWT. Two roles: `ADMIN` (whitelisted by email in config) and `USER`.
5. **Visibility control** — Transformations are `PRIVATE` by default. Owners and admins can flip them to `PUBLIC`. Public transformations are only surfaced when their status is `DONE`.
6. **Daily usage enforcement** — Non-admin users are limited to 1 transformation per calendar day, tracked in a dedicated `user_daily_usage` collection. Exceeding the limit returns `409 Conflict`.
7. **Metrics** — Append-only event log in the `metrics` collection. Four event types are recorded automatically: `TRANSFORMATION_CREATED`, `TRANSFORMATION_COMPLETED`, `TRANSFORMATION_FAILED`, `CONTENT_ACCESSED`.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Java 17 |
| Framework | Spring Boot 3.4.5 |
| Database | MongoDB |
| Auth | Google ID token → internal JWT (JDK HMAC-SHA256 + Jackson) |
| Async | Spring `@Async` thread pool (TTS polling) |
| Docs | SpringDoc OpenAPI (Swagger UI) |

---

## Configuration

All config lives in `src/main/resources/application.yml`. Values that must be set before running in production:

| Key | Description |
|---|---|
| `spring.data.mongodb.uri` | MongoDB connection string |
| `tts.service.base-url` | Base URL of the audio-renderer service |
| `auth.google.client-id` | Google OAuth2 client ID (from Google Cloud Console) |
| `auth.jwt.secret` | Plain string secret, minimum 32 characters |
| `auth.admin-emails` | List of email addresses that receive the `ADMIN` role on first login |

---

## Running locally

### Prerequisites

- Java 17+
- Maven 3.8+
- MongoDB running on `localhost:27000` (or update `spring.data.mongodb.uri`)
- The audio-renderer service running (or update `tts.service.base-url`)

### Dev profile (bypasses Google auth)

The dev profile skips Google token verification and exposes a `/api/v1/auth/dev-login` endpoint that issues a real JWT for any email/role pair you provide.

```bash
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
```

### Production profile

```bash
./mvnw spring-boot:run
```

---

## Data models

### Book

| Field | Type | Notes |
|---|---|---|
| `id` | String | MongoDB ObjectId |
| `title` | String | Required |
| `version` | String | Defaults to `"1.0"` |
| `sections` | BookSection[] | Required, non-empty |
| `createdAt` | DateTime | Set on create |
| `updatedAt` | DateTime | Set on create and update |

**BookSection** (embedded):

| Field | Type |
|---|---|
| `sectionId` | String |
| `sectionName` | String |
| `content` | ContentParagraph[] |

**ContentParagraph** (embedded):

| Field | Type | Notes |
|---|---|---|
| `text` | String | |
| `author` | String | |
| `emotion` | Enum | Optional. `NEUTRAL` / `HAPPY` / `SAD` / `ANGRY` / `FEARFUL` / `SURPRISED`. Omit for no emotion override. |

### Transformation

| Field | Type | Notes |
|---|---|---|
| `id` | String | MongoDB ObjectId |
| `userId` | String | Owner's user ID |
| `bookId` | String | Reference to Book |
| `name` | String | Display name for this transformation |
| `status` | Enum | `DRAFT` / `VOICE_ASSIGNMENT` / `GENERATING` / `DONE` / `FAILED` |
| `visibility` | Enum | `PUBLIC` / `PRIVATE` (default: `PRIVATE`) |
| `voiceMapping` | Map<String,String> | author → voiceId |
| `ttsTaskId` | String | Internal TTS task reference |
| `createdAt` | DateTime | Set on create |
| `updatedAt` | DateTime | Updated on every state change |

> **Visibility rule:** A `PUBLIC` transformation is only visible to users who are not the owner/admin when its `status` is `DONE`. In all other statuses it behaves as if it were `PRIVATE` for external viewers.

### User

| Field | Type | Notes |
|---|---|---|
| `id` | String | MongoDB ObjectId |
| `accountId` | String | Google `sub` claim (unique) |
| `email` | String | Unique |
| `firstName` | String | Synced from Google profile |
| `lastName` | String | Synced from Google profile |
| `role` | Enum | `ADMIN` / `USER` — assigned on first login |
| `createdAt` | DateTime | Set on first login |

### UserDailyUsage (collection: `user_daily_usage`)

Tracks how many transformations each non-admin user has created on a given calendar day.

| Field | Type | Notes |
|---|---|---|
| `id` | String | MongoDB ObjectId |
| `userId` | String | Compound-indexed with `date` |
| `date` | String | ISO-8601 date string, e.g. `"2026-04-27"` |
| `transformationCount` | int | Incremented on each successful creation |

When `transformationCount >= 1`, further creation attempts from a `USER` role return `409 Conflict`.

### MetricEvent (collection: `metrics`)

Append-only event log. Records are never updated or deleted.

| Field | Type | Notes |
|---|---|---|
| `id` | String | MongoDB ObjectId |
| `eventType` | Enum | `TRANSFORMATION_CREATED` / `TRANSFORMATION_COMPLETED` / `TRANSFORMATION_FAILED` / `CONTENT_ACCESSED` |
| `transformationId` | String | Reference to the transformation |
| `userId` | String | User who triggered the event; `null` for anonymous content access |
| `timestamp` | DateTime | UTC time of the event |

**When each event is recorded:**

| Event | Trigger |
|---|---|
| `TRANSFORMATION_CREATED` | Immediately after a new transformation is persisted |
| `TRANSFORMATION_COMPLETED` | When TTS polling receives `COMPLETED` and the content document is saved |
| `TRANSFORMATION_FAILED` | When TTS polling receives `FAILED` or times out |
| `CONTENT_ACCESSED` | When `GET /content/{id}` returns successfully |

---

## API reference

Base path: `/api/v1`

**Pagination response shape** (all list endpoints):
```json
{
  "items": [],
  "page": 0,
  "size": 20,
  "totalElements": 47
}
```

**Common query parameters for list endpoints**:

| Param | Default | Description |
|---|---|---|
| `page` | `0` | Zero-based page number |
| `size` | `20` | Items per page |
| `search` | — | Filter by name/title (case-insensitive contains) |
| `sortBy` | varies | Field to sort by (see per-endpoint table) |
| `sortDir` | `desc` | `asc` or `desc` |

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | None | Exchange Google ID token for service JWT |
| POST | `/auth/dev-login` | None | **Dev profile only** — issue JWT for any `{ email, role }` |

**Login request:**
```json
{ "googleToken": "<google-id-token>" }
```

**Dev login request:**
```json
{ "email": "admin@dev.local", "role": "ADMIN" }
```

**Auth response:**
```json
{
  "token": "<jwt>",
  "userId": "...",
  "email": "user@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "USER"
}
```

### Books

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/books` | ADMIN | Create a book |
| GET | `/books` | Authenticated | List books — sortable by `createdAt`, `updatedAt`, `title` |
| GET | `/books/{id}` | Authenticated | Get book by ID |
| GET | `/books/{id}/sections` | Authenticated | List sections — searchable by section name |
| GET | `/books/{id}/sections/{sectionId}` | Authenticated | Get a single section |

**Create book request:**
```json
{
  "title": "The Great Adventure",
  "version": "1.0",
  "sections": [
    {
      "sectionId": "ch1",
      "sectionName": "Chapter 1",
      "content": [
        { "text": "It was a dark and stormy night.", "author": "Narrator", "emotion": "FEARFUL" },
        { "text": "Who goes there?", "author": "Hero" }
      ]
    }
  ]
}
```

`emotion` is optional per paragraph. When omitted the TTS service uses its default (`NEUTRAL`). Valid values: `NEUTRAL`, `HAPPY`, `SAD`, `ANGRY`, `FEARFUL`, `SURPRISED`.

### Transformations

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/transformations` | USER / ADMIN | Create transformation. USER: 1/day limit enforced; returns `409 Conflict` when exceeded |
| GET | `/transformations` | Optional | Public list (anon, DONE only) / own + public DONE (USER) / all (ADMIN) — sortable by `createdAt`, `updatedAt`, `name` |
| GET | `/transformations/{id}` | Optional | 404 if private and not owner/admin; public only visible when `DONE` |
| PUT | `/transformations/{id}/voices` | Owner / ADMIN | Assign voices to characters |
| PATCH | `/transformations/{id}/visibility` | Owner / ADMIN | Set `PUBLIC` or `PRIVATE` |
| POST | `/transformations/{id}/generate` | Owner / ADMIN | Trigger TTS generation |

**Create transformation request:**
```json
{
  "bookId": "<book-id>",
  "name": "My Production Read"
}
```

**Error response when daily limit reached (409 Conflict):**
```json
{
  "status": 409,
  "error": "Conflict",
  "message": "Daily transformation limit reached. Only 1 transformation allowed per day."
}
```

**Update voices request:**
```json
{
  "voiceMapping": {
    "Narrator": "<voiceId>",
    "Hero": "<voiceId>",
    "Villain": "<voiceId>"
  }
}
```

**Update visibility request:**
```json
{ "visibility": "PUBLIC" }
```

### Content

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/content/{transformationId}` | Owner / ADMIN / public if PUBLIC+DONE | Audio content — only available when transformation status is `DONE` |

- Returns `409 Conflict` if the transformation exists but is still processing.
- Returns `404 Not Found` if the transformation is not accessible to the caller (private, or public but not yet `DONE`).

**Content item shape** (each element in the `items` array):

| Field | Type | Notes |
|---|---|---|
| `sectionId` | String | |
| `sectionName` | String | |
| `author` | String | Character/narrator name |
| `text` | String | Source paragraph text |
| `audioUri` | String | URL to the generated MP3 |
| `voiceId` | String | ElevenLabs voice ID used |
| `emotion` | String | Emotion used for synthesis; omitted when none was set on the source paragraph |

### Voices

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/voices` | Authenticated | List available TTS voices from the audio-renderer |

---

## Transformation state machine

```
DRAFT
  └─► VOICE_ASSIGNMENT   (PUT /voices)
        └─► GENERATING   (POST /generate)
              ├─► DONE
              └─► FAILED
```

Public visibility for non-owners is gated on `DONE`. Setting a transformation to `PUBLIC` while it is in any other status has no external effect until generation completes.

---

## Access matrix

| Endpoint | Anonymous | USER | ADMIN |
|---|---|---|---|
| `POST /auth/login` | ✅ | ✅ | ✅ |
| `POST /books` | ❌ | ❌ | ✅ |
| `GET /books`, `GET /books/{id}` | ❌ 401 | ✅ | ✅ |
| `GET /transformations` | ✅ PUBLIC+DONE only | ✅ own + PUBLIC+DONE | ✅ all |
| `GET /transformations/{id}` | ✅ if PUBLIC+DONE else 404 | ✅ own or PUBLIC+DONE else 404 | ✅ any |
| `POST /transformations` | ❌ 401 | ✅ (1/day — 409 on limit) | ✅ unlimited |
| `PUT /transformations/{id}/voices` | ❌ 401 | ✅ own only | ✅ any |
| `PATCH /transformations/{id}/visibility` | ❌ 401 | ✅ own only | ✅ any |
| `POST /transformations/{id}/generate` | ❌ 401 | ✅ own only | ✅ any |
| `GET /content/{id}` | ✅ if PUBLIC+DONE else 404 | ✅ own or PUBLIC+DONE | ✅ any |
| `GET /voices` | ❌ 401 | ✅ | ✅ |

---

## Swagger UI

When the service is running: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

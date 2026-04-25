# Orchestrator Service

The central coordination hub for the narrFlow platform. It manages the full lifecycle of turning a book into a multi-voice audiobook: book ingestion, transformation configuration, TTS generation orchestration, and audio content delivery.

## What it does

1. **Book management** — Stores books as structured documents with sections and paragraphs, each paragraph tagged with an author/character name.
2. **Transformation workflow** — A transformation represents one rendering of a book with a specific voice-per-character mapping. It progresses through a state machine: `DRAFT → VOICE_ASSIGNMENT → GENERATING → DONE / FAILED`.
3. **TTS orchestration** — Sends segmented text to the audio-renderer service, polls for completion asynchronously, and assembles the resulting audio URIs into a playable content document.
4. **Auth** — Google OAuth2 login only. Issues its own short-lived JWT. Two roles: `ADMIN` (whitelisted by email in config) and `USER`.
5. **Visibility control** — Transformations are `PRIVATE` by default. Owners and admins can flip them to `PUBLIC`, which makes them browsable and playable without authentication.

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

| Field | Type |
|---|---|
| `text` | String |
| `author` | String |

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
        { "text": "It was a dark and stormy night.", "author": "Narrator" },
        { "text": "Who goes there?", "author": "Hero" }
      ]
    }
  ]
}
```

### Transformations

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/transformations` | USER / ADMIN | Create transformation (1/day limit for USER) |
| GET | `/transformations` | Optional | Public list (anon) / own+public (USER) / all (ADMIN) — sortable by `createdAt`, `updatedAt`, `name` |
| GET | `/transformations/{id}` | Optional | 404 if private and not owner/admin |
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
| GET | `/content/{transformationId}` | Owner / ADMIN / public if PUBLIC | Audio content — only available when transformation status is `DONE` |

Returns 409 if the transformation is still processing.

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

---

## Access matrix

| Endpoint | Anonymous | USER | ADMIN |
|---|---|---|---|
| `POST /auth/login` | ✅ | ✅ | ✅ |
| `POST /books` | ❌ | ❌ | ✅ |
| `GET /books`, `GET /books/{id}` | ❌ 401 | ✅ | ✅ |
| `GET /transformations` | ✅ public only | ✅ own + public | ✅ all |
| `GET /transformations/{id}` | ✅ if PUBLIC else 404 | ✅ own or PUBLIC else 404 | ✅ any |
| `POST /transformations` | ❌ 401 | ✅ (1/day limit) | ✅ unlimited |
| `PUT /transformations/{id}/voices` | ❌ 401 | ✅ own only | ✅ any |
| `PATCH /transformations/{id}/visibility` | ❌ 401 | ✅ own only | ✅ any |
| `POST /transformations/{id}/generate` | ❌ 401 | ✅ own only | ✅ any |
| `GET /content/{id}` | ✅ if PUBLIC else 404 | ✅ own or PUBLIC | ✅ any |
| `GET /voices` | ❌ 401 | ✅ | ✅ |

---

## Swagger UI

When the service is running: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

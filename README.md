# MemoryBridge 

The **MemoryBridge**, an AI-assisted memory support system for Alzheimer's / dementia patients. It recognizes visitors from a camera feed, transcribes conversations live, summarizes them into caregiver-friendly notes, tracks patient location for wandering safety, and notifies family members when a recognized visit happens.

Built with **FastAPI**, **PostgreSQL + SQLAlchemy + Alembic**, **Socket.IO**, and a small set of focused AI services (face recognition, live transcription, LLM summarization).

---

## Table of Contents

1. [What the server actually does](#what-the-server-actually-does)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Folder structure](#folder-structure)
5. [Data model](#data-model)
6. [Database migrations](#database-migrations)
7. [Authentication & sessions](#authentication--sessions)
8. [Face recognition pipeline](#face-recognition-pipeline)
9. [Live transcription pipeline](#live-transcription-pipeline)
10. [Live AI summarization](#live-ai-summarization)
11. [Location tracking & geofencing](#location-tracking--geofencing)
12. [Family visit notifications](#family-visit-notifications)
13. [Error handling & response format](#error-handling--response-format)
14. [REST API reference](#rest-api-reference)
15. [Socket.IO events](#socketio-events)
16. [Setup & running locally](#setup--running-locally)
17. [Environment variables](#environment-variables)
18. [Security notes](#security-notes)

---

## What the server actually does

A caregiver creates a **Patient** profile and registers the people around them (**Persons** — family, doctors, friends) by uploading a photo of each. When a camera captures someone's face on the patient's device:

1. The face is detected and converted into a 512-dimensional embedding.
2. The embedding is compared against every stored embedding for that patient (cosine similarity).
3. If it matches a known person above a threshold → the patient is shown who it is and their relation.
4. If it doesn't match anyone → the face is stored as an **unknown face**, which a caregiver can later label.
5. If the recognized person is flagged as family with an email on file, a **visit notification email** is fired off in the background.

Once someone is recognized, the patient (or the app) can start a **live-transcribed conversation**. Speech is streamed to the server, transcribed in real time, and an LLM (Gemini) incrementally maintains a short, structured summary of the conversation as it happens (who's present, medical topics, emotional tone, reminders). The finished summary and full transcript are saved and linked to the recognized person, so the next time that person is recognized, the patient can see what they last talked about.

The system also records the patient's GPS location periodically, computes movement speed, and checks it against a home geofence to flag if the patient has wandered outside a safe radius.

Everything is scoped per-caregiver: a caregiver only ever sees their own patients and data, enforced at the service layer on every request.

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Web framework | **FastAPI** | async, auto-generated OpenAPI docs |
| Real-time transport | **python-socketio** (ASGI) | wrapped around the FastAPI app so HTTP + WebSocket traffic share one server |
| Database | **PostgreSQL** (Neon, serverless) | connection pool tuned for serverless cold-starts |
| ORM | **SQLAlchemy 2.0** | declarative models, session-per-request |
| Migrations | **Alembic** | 8 incremental migrations tracking real schema evolution |
| Vector search | **pgvector** | 512-d face embeddings stored and queried directly in Postgres |
| Auth | **PyJWT** + **passlib (bcrypt)** | access/refresh token pair, hashed refresh tokens at rest |
| Face detection & embedding | **facenet-pytorch** (MTCNN + InceptionResnetV1) | pretrained on VGGFace2 |
| Live transcription | **Deepgram** (async WebSocket client, `nova-2` model) | also supports a client-side Deepgram + REST fallback path |
| LLM summarization | **LangChain + `langchain-google-genai`** (Gemini 2.5 Flash) | stateful, incremental summarizer per conversation |
| Image storage | **Cloudinary** | face photos and live captures |
| Email | **smtplib** (SMTP, Gmail-compatible) | HTML visit-notification emails, sent on background threads |
| Validation | **Pydantic v2** | request/response schemas |

---

## Architecture

The backend follows a conventional layered structure so business logic never leaks into route handlers:

```
Router (HTTP/WS I/O, auth dependency)
   ↓
Service (business rules, ownership checks, orchestration)
   ↓
Model (SQLAlchemy ORM, persistence)
```

Cross-cutting concerns are centralized:

- **`core/`** — a single `ApiError` exception type, a global exception handler that converts it into a consistent JSON error shape, and an `ApiResponse` envelope wrapping every successful response.
- **`dependencies/`** — reusable FastAPI dependencies for JWT verification (`verify_token`, `verify_patient_token`) and file upload (Cloudinary).
- **`config/`** — environment loading, the SQLAlchemy engine/session, and the shared Socket.IO server instance (kept separate to avoid circular imports between `main.py`, the transcription router, and the transcription service).
- **`ai/`** — the two AI pipelines (face recognition, conversation summarization) are isolated from the rest of the app so they can be tested or swapped independently.

---

## Folder structure

```
server/
├── main.py                      # FastAPI app assembly, CORS, router mounting, Socket.IO wrapping
├── config/
│   ├── db.py                    # SQLAlchemy engine, session factory, get_db() dependency
│   ├── env.py                   # loads and validates all environment variables
│   └── socket_server.py         # shared Socket.IO AsyncServer instance
├── core/
│   ├── api_error.py             # ApiError(status_code, message)
│   ├── api_response.py          # ApiResponse envelope (success/message/data)
│   └── exception_handler.py     # converts ApiError -> uniform JSON error response
├── dependencies/
│   ├── auth.py                  # verify_token / verify_patient_token FastAPI dependencies
│   └── uploadFile.py            # Cloudinary upload helper
├── models/                      # SQLAlchemy ORM models (see Data Model below)
│   ├── user.py
│   ├── patient.py
│   ├── person.py                # Person + FaceEmbedding
│   ├── conversation.py          # Conversation + Transcript + Summary
│   └── location.py
├── schemas/                     # Pydantic request/response schemas
│   ├── user.py
│   ├── patient.py
│   ├── face.py
│   └── location.py
├── routers/                     # HTTP + Socket.IO route handlers
│   ├── user.py                  # signup/login/refresh/logout/profile
│   ├── auth.py                  # caregiver -> patient-session switching
│   ├── patient.py               # patient CRUD + person CRUD
│   ├── recognition.py           # face registration + matching
│   ├── transcription.py         # REST + Socket.IO transcription/summary endpoints
│   └── tracking.py              # GPS location logging + geofencing
├── services/                    # business logic, one file per domain
│   ├── user.py                  # password hashing, JWT issuing/rotation
│   ├── auth.py                  # patient-session token minting
│   ├── patient.py               # patient/person CRUD with ownership checks
│   ├── face_service.py          # embedding storage + cosine-similarity matching
│   ├── transcription_service.py # Deepgram session lifecycle
│   └── email_service.py         # SMTP visit-notification emails
├── ai/
│   ├── face_pipeline.py         # MTCNN detection + FaceNet embedding
│   └── summary_pipeline.py      # LangChain + Gemini incremental summarizer
└── alembic/                     # migration environment + 8 versioned migrations
```

---

## Data model

Seven tables, all connected back to a single `Patient` (the core entity — everything belongs to a patient):

**`users`**
Caregiver / doctor / admin accounts. Stores a bcrypt password hash and a bcrypt-hashed refresh token (so the raw refresh token is never stored at rest).

**`patients`**
The Alzheimer's patient profile, owned by a `User`. Has `name`, `age`, `diagnosis_level` (mild / moderate / severe — this level drives a privacy rule described below).

**`persons`**
Anyone the system has ever seen or been told about, linked to a patient. A person starts as either:
- a **known person** (caregiver manually registered them with a name/relation), or
- an **unknown face** (the system saw a face it didn't recognize and created a placeholder record).

Unknown faces can later be converted to known persons. Extra fields support a **patient-suggestion workflow**: the patient can suggest a name/relation for an unrecognized face (`suggested_name`, `suggested_relation`, `pending_verification=True`) for a caregiver to approve later. `is_family` + `family_member_email` control whether a visit from this person triggers an email notification.

**`face_embeddings`**
512-dimensional `pgvector` vectors, one row per stored face image. A person can have multiple embeddings (different angles/lighting) to improve match accuracy — this is why embeddings are a separate table rather than a column on `persons`.

**`conversations`**
One row per recorded conversation session, linked to a `patient` and (optionally) the `person` who was recognized when it started. This `person_id` link is the key design decision that lets the app show "what did we last talk about" the next time that same face is recognized.

**`transcripts`**
Individual sentence-level lines belonging to a conversation, timestamped as they arrive from Deepgram.

**`summaries`**
One-to-one with a conversation — the LLM-generated running summary, updated throughout the call and finalized when it ends.

**`locations`**
Timestamped GPS pings for a patient, used for the path history and geofence check.

```
User ──< Patient ──< Person ──< FaceEmbedding
                 │         │
                 │         └──< Conversation ──< Transcript
                 │                          └── Summary (1:1)
                 └──< Location
```

---

## Database migrations

Schema changes are tracked with Alembic rather than `create_all()`-and-forget. The migration history includes:

- initial schema (users, patients, persons, embeddings, conversations, transcripts, summaries)
- switching timestamp columns to `server_default=func.now()` so Postgres — not the app — owns default timestamps
- adding `refresh_token_hash` to `users` for JWT refresh-token rotation
- adding `image_url` to `persons` so the frontend can render a face's stored photo
- adding the patient-suggestion / verification columns to `persons` (`pending_verification`, `suggested_name`, `suggested_relation`)
- adding `is_family` to `persons`
- adding `family_member_email` to `persons`
- adding the `locations` table for GPS tracking

Each migration is a real, incremental change driven by a feature being added — not a single dump-and-reset schema.

---

## Authentication & sessions

There are **two distinct token types**, because the app has two distinct actors:

### 1. Caregiver auth (standard JWT)

- `POST /users/signup` — creates a user, bcrypt-hashes the password.
- `POST /users/login` — verifies credentials, issues:
  - an **access token** (JWT, 30-day default expiry, contains `user_id`, `role`)
  - an **opaque refresh token** (not a JWT — a random URL-safe string), whose **bcrypt hash** is stored on the user row
- Both tokens are returned in the response body (for `localStorage`) *and* the access token is set as an `httpOnly` cookie as a fallback auth path.
- `POST /users/refresh` — the frontend sends `{ user_id, refresh_token }`; the server verifies the raw token against the stored hash, then **rotates both tokens** (new access + new refresh, old refresh invalidated). If verification fails, the stored hash is cleared — a mismatch is treated as possible token theft.
- `POST /users/logout` — clears the cookie and invalidates the stored refresh token hash.
- Changing password also invalidates the refresh token, forcing re-login everywhere.

The `verify_token` dependency accepts either the `access-token` cookie or an `Authorization: Bearer <token>` header, decodes the JWT, and injects the payload into the route.

### 2. Patient-session tokens

A caregiver can "step into" a patient's view of the app (e.g. handing a tablet to the patient). `POST /auth/patient-session/{patient_id}`:

- Verifies the caregiver actually owns that patient.
- Issues a short-lived, patient-scoped JWT (`role: patient_viewer`, default 8-hour expiry) set as a separate `patient-token` cookie.
- The caregiver's own token is left untouched, so exiting the patient session (`POST /auth/patient-session/exit`) just deletes the patient cookie and returns them to their normal session — no re-login needed.
- Exiting patient mode back to the caregiver dashboard is gated by `POST /users/verify-caregiver`, which re-checks the caregiver's email/password before allowing the switch — a lightweight safeguard so a confused patient can't casually back out of patient mode.

---

## Face recognition pipeline

Two-stage pipeline in `ai/face_pipeline.py`:

1. **Detection (MTCNN)** — finds every face in an uploaded image, returns bounding boxes, detection confidence, and aligned 160×160 crops.
2. **Embedding (FaceNet / InceptionResnetV1, pretrained on VGGFace2)** — each aligned crop is converted into a 512-dimensional, L2-normalized vector (normalizing up front means cosine similarity reduces to a plain dot product at match time).

**Registering a person** (`POST /recognition/store_known_face`): uploads the photo to Cloudinary, runs the pipeline, and stores the `Person` + one or more `FaceEmbedding` rows.

**Matching a live capture** (`POST /recognition/match/{patient_id}`):
- Extracts the embedding of the most confident face detected.
- Compares it via cosine similarity against every stored embedding for that patient (`MATCH_THRESHOLD = 0.75`).
- **Match found** → returns the person's name, relation, similarity score, and image; also fires a background email if they're flagged as family; and — if the patient's `diagnosis_level` is `"severe"` — sets `history_restricted: true` so the frontend withholds past-conversation history from the patient (a privacy safeguard for advanced-stage patients who may be distressed by unexpected reminders).
- **No match** → the face is stored as a new unknown-face `Person` (with its own embedding) so it can be recognized consistently going forward, and the caregiver can label it later.
- **No face detected** → returns a distinct `no_face_detected` error rather than a false negative match.

---

## Live transcription pipeline

Two supported flows, both converging on the same `Conversation` / `Transcript` / `Summary` tables:

**Server-side (Socket.IO + Deepgram async client)** — `routers/transcription.py` + `services/transcription_service.py`:
- Client emits `start_transcription` with `{ patient_id, patient_name, person_id }`.
- Server opens a `Conversation` row (linked to `person_id` if a face was recognized) and an async Deepgram WebSocket connection (`nova-2` model, smart formatting, 400ms endpointing).
- Client streams raw audio via the `audio_data` event; the server relays each chunk to Deepgram.
- On each finalized sentence, the server saves it as a `Transcript` row, emits it back to the client (`transcript_line`), and feeds it to the summarizer, emitting `summary_update`.
- `stop_transcription` (or a socket disconnect) finalizes the Deepgram connection, saves the closing summary, and closes the conversation.

**Client-side (REST fallback)** — used when the browser runs the Deepgram SDK directly and simply POSTs results to the backend: `/transcription/start`, `/transcription/transcript-line`, `/transcription/finish`. Same underlying tables and summarizer, just driven by REST calls instead of socket events.

Conversation history is queryable per-patient (`GET /transcription/conversations/{patient_id}`) or, critically, **per recognized person** (`GET /transcription/person/{person_id}/conversations`) — this is what powers "here's what you last talked about with this person" the moment a face is recognized, with the same severe-diagnosis history restriction applied here as in the recognition flow.

---

## Live AI summarization

`ai/summary_pipeline.py` keeps an in-memory `SummaryState` per active `conversation_id` (sentence buffer + current summary text). Each new final sentence triggers an async call to **Gemini 2.5 Flash** via LangChain (`temperature=0.2` for consistent, factual output) with a system prompt constraining the model to:

- track who's present and their relation,
- track medical topics (medication, symptoms, appointments),
- track emotional tone,
- track reminders/requests,
- and format the answer as 3–6 emoji-prefixed bullet points, written in plain language a patient or caregiver can read directly.

If the LLM call fails, the previous summary is kept rather than the session breaking — summarization is treated as best-effort and never blocks the conversation flow.

---

## Location tracking & geofencing

`routers/tracking.py` — a lightweight but complete geolocation feature:

- `POST /tracking/locations` logs a GPS ping for a patient. It looks up the patient's last known location, computes the **haversine distance** between the two points and the elapsed time to derive a speed estimate (m/s), and separately computes distance from a configured home coordinate to flag a **geofence breach** if the patient has moved outside a safe radius (default 50m).
- `GET /tracking/patients/{patient_id}/locations` returns the full chronological path for mapping.

This is intentionally simple (haversine + a fixed radius) rather than a full geofencing service, but the shape is there to plug in per-patient configurable geofences later.

---

## Family visit notifications

When a recognized match belongs to a person flagged `is_family=True` with an email on file, `services/email_service.py` sends an HTML "someone just visited" email via SMTP (Gmail-compatible, app-password based). Notifications are dispatched on **background daemon threads** from within the request handler so a slow or failing SMTP call never delays or breaks the face-match response — failures are logged, not raised.

---

## Error handling & response format

Every successful response is wrapped in a consistent envelope:

```json
{ "success": true, "message": "...", "data": { ... } }
```

Errors are raised anywhere in the service layer as a single `ApiError(status_code, message)` and converted by a global FastAPI exception handler into:

```json
{ "success": false, "message": "...", "data": null }
```

so the frontend only ever has to handle one error shape, regardless of which endpoint failed.

---

## REST API reference

| Method | Path | Purpose |
|---|---|---|
| POST | `/users/signup` | Create caregiver account |
| POST | `/users/login` | Login, issue access + refresh tokens |
| POST | `/users/refresh` | Rotate access + refresh tokens |
| POST | `/users/verify-caregiver` | Re-verify credentials (patient-mode exit guard) |
| POST | `/users/logout` | Invalidate refresh token, clear cookie |
| GET | `/users/me` | Get logged-in profile |
| PATCH | `/users/me` | Update profile |
| PATCH | `/users/me/change-password` | Change password |
| DELETE | `/users/me` | Delete account |
| POST | `/auth/patient-session/{patient_id}` | Caregiver → patient-mode session token |
| POST | `/auth/patient-session/exit` | Exit patient mode |
| POST / GET / PATCH / DELETE | `/patients`, `/patients/{id}` | Patient CRUD |
| POST / GET / PATCH / DELETE | `/patients/{id}/persons`, `.../{person_id}` | Person CRUD |
| POST | `/recognition/store_known_face` | Register a known person's face |
| POST | `/recognition/store_unknown_face/{patient_id}` | Store an unknown face |
| POST | `/recognition/match/{patient_id}` | Match a live capture against stored faces |
| POST | `/recognition/suggest-identity/{person_id}` | Patient suggests a name/relation |
| GET | `/recognition/known-persons/{patient_id}` | List known persons |
| POST | `/transcription/start` / `/transcript-line` / `/finish` | REST-driven transcription flow |
| GET | `/transcription/conversations/{patient_id}` | All conversations for a patient |
| GET | `/transcription/conversations/{patient_id}/{conversation_id}` | Single conversation, full detail |
| GET | `/transcription/person/{person_id}/conversations` | Conversation history with a specific person |
| POST | `/tracking/locations` | Log a GPS ping |
| GET | `/tracking/patients/{patient_id}/locations` | Full location path |

## Socket.IO events

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `start_transcription` | `{ patient_id, patient_name, person_id? }` |
| Client → Server | `audio_data` | raw audio bytes |
| Client → Server | `stop_transcription` | `{}` |
| Server → Client | `transcription_started` | `{ conversation_id, person_id }` |
| Server → Client | `transcript_line` | `{ text }` |
| Server → Client | `summary_update` | `{ summary }` |
| Server → Client | `transcription_stopped` | `{ conversation_id, summary, person_id }` |
| Server → Client | `transcription_error` | `{ message }` |

---

## Setup & running locally

```bash
cd server

# install deps (uv recommended — matches the committed uv.lock)
uv sync
# or: pip install -e .

# configure environment
cp .env.example .env   # then fill in values, see below

# apply migrations
alembic upgrade head

# run
uvicorn server.main:application --reload
```

Note the entrypoint is `server.main:application` (not `app`) — `application` is the Socket.IO-wrapped ASGI app that serves both HTTP and WebSocket traffic from a single Uvicorn process.

---

## Environment variables

```
DATABASE_URL=postgresql://user:pass@host/db          # Neon/Postgres connection string
SECRET_KEY=your-jwt-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200                     # 30 days
REFRESH_TOKEN_EXPIRE_MINUTES=129600                   # 90 days
PATIENT_SESSION_EXPIRE_MINUTES=480                    # 8 hours

DEEPGRAM_API_KEY=...
GEMINI_API_KEY=...

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM=your-gmail@gmail.com
```

`DATABASE_URL` and `SECRET_KEY` are required — the app fails fast at import time if either is missing.

---

## Security notes

- Passwords are bcrypt-hashed; refresh tokens are opaque random strings whose **hash** (not the raw value) is persisted, so a database leak alone doesn't expose usable tokens.
- Refresh-token verification failure clears the stored hash — a wrong refresh token is treated as a possible theft signal, not just a retry-able error.
- All patient/person data access goes through an ownership check (`_assert_owns_patient`) at the service layer, not just at the router — so a caregiver can never read or modify another caregiver's patient data even if they guess an ID.
- Severe-diagnosis patients have conversation history withheld from the patient-facing view by design, not just by convention — the check happens server-side in both the recognition and transcription endpoints.
- `secure=False` is currently set on cookies for local development — this **must** be switched to `secure=True` (HTTPS-only) before any production deployment.

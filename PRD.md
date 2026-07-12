# Project 1 — Tasks API (Backend Foundation)

> **Goal:** Build the "core" you'll repeat in every later project — clean schema design, real JWT auth with refresh tokens, validation, error handling, logging, and Docker — on a deliberately boring domain so 100% of your focus is on doing the fundamentals *correctly*.

**Stack:** Node.js + Express + `pg` (node-postgres, raw SQL — no ORM) + PostgreSQL + Docker.

**Estimated time:** 4–7 evenings. Don't rush. The point is to do it *right*, not fast.

---

## 1. Learning objectives

By the end you should be able to, without a tutorial:

- Design a normalized Postgres schema with proper constraints, types, and indexes — and explain *why* each choice.
- Write and run versioned, reversible migrations.
- Implement JWT auth with the **full lifecycle**: register, login, short-lived access tokens, long-lived **revocable** refresh tokens, rotation, and logout.
- Hash passwords correctly (never store plaintext, never store reversibly).
- Validate every input at the edge before it touches your logic or DB.
- Return consistent, well-structured error responses with correct HTTP status codes.
- Emit structured JSON logs with request IDs.
- Containerize the app + database with Docker Compose and run it with one command.

---

## 2. Domain

Two entities. That's it. Resist the urge to add more.

- A **user** can register and log in.
- A **task** belongs to exactly one user. A user has many tasks.
- A user can only ever see and modify *their own* tasks. (This ownership check is the single most important security habit in the whole project — get it wrong and any user can read everyone's data.)

---

## 3. Schema design

This is a *core* skill. I'm giving you the target shape and the reasoning, but **you write the actual DDL and migrations yourself.** Treat the reasoning as the "why" you need to internalize.

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK, default `gen_random_uuid()` | See "UUID vs serial" below |
| `email` | `citext` or `text`, **UNIQUE**, NOT NULL | Unique constraint = your defense against duplicate accounts |
| `password_hash` | `text`, NOT NULL | The *hash*, never the password. Naming it `password_hash` not `password` is intentional — it documents intent |
| `created_at` | `timestamptz`, NOT NULL, default `now()` | Always `timestamptz`, never `timestamp` — see below |
| `updated_at` | `timestamptz`, NOT NULL, default `now()` | Update via trigger or in your repository layer |

### `tasks`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK, default `gen_random_uuid()` | |
| `user_id` | `uuid`, NOT NULL, **FK → users(id) ON DELETE CASCADE** | Delete a user → their tasks vanish. Decide if that's what you want and be able to defend it |
| `title` | `text`, NOT NULL, CHECK length 1–200 | Enforce limits at the DB *and* validation layers — defense in depth |
| `description` | `text`, nullable | |
| `status` | `text`, NOT NULL, default `'todo'`, CHECK in (`todo`,`in_progress`,`done`) | See "enum strategy" below |
| `priority` | `text`, NOT NULL, default `'medium'`, CHECK in (`low`,`medium`,`high`) | |
| `due_date` | `timestamptz`, nullable | |
| `created_at` | `timestamptz`, NOT NULL, default `now()` | |
| `updated_at` | `timestamptz`, NOT NULL, default `now()` | |

### Indexes you must add (and be able to justify)

- `users(email)` — already covered by the UNIQUE constraint (it creates an index automatically — know this).
- `tasks(user_id)` — **every** task query filters by `user_id`. Without this index, listing a user's tasks scans the whole table. This is the highest-impact index in the project.
- `tasks(user_id, status)` — composite, for when you filter by status. Think about *column order* in composite indexes and why `user_id` comes first.

### Design decisions you must be able to defend in review

1. **UUID vs serial/bigserial for PKs.** I've specified UUID. Know the tradeoffs: UUIDs don't leak row counts or allow enumeration attacks (`/tasks/1`, `/tasks/2`...), but they're larger and not sequential (index locality). Be ready to argue it.
2. **`timestamptz` vs `timestamp`.** Always `timestamptz`. Know why: `timestamp` stores no timezone and silently corrupts data across servers/zones.
3. **Enum strategy.** I've used `text` + `CHECK` constraint. The three options are: `CHECK` constraint (simple, easy to change), native Postgres `ENUM` type (rigid, painful to alter), or a lookup table (flexible, joins required). Know when you'd reach for each.
4. **`ON DELETE CASCADE` vs `RESTRICT` vs soft-delete.** Why did you pick what you picked?

---

## 4. Migrations

- Use a real migration tool — `node-pg-migrate` is the natural fit since you're on raw `pg`. (Knex also works but it's a query builder; stick to raw SQL for the practice.)
- **Every migration must be reversible** — a working `up` and a working `down`. Test the down migration. A migration you can't roll back is a production liability.
- Migrations are versioned, ordered, and committed to git. Never edit a migration that's already run — write a new one.
- Seed data (a test user, a few tasks) goes in a separate seed script, **not** in a migration.

---

## 5. Authentication design

This is where most of your learning happens. Implement the **full** lifecycle — don't shortcut to just "login returns a token."

### Password hashing
- Use `argon2` (preferred, modern) or `bcrypt` (fine, battle-tested). Never roll your own, never use plain SHA/MD5.
- Know what a *salt* is and why these algorithms include one automatically.
- Know why hashing is deliberately *slow* (work factor / cost) and what that defends against.

### Token model — two tokens, not one

| | Access token | Refresh token |
|---|---|---|
| Lifetime | Short (~15 min) | Long (~7 days) |
| Sent on every request | Yes (Authorization header) | No (only to `/auth/refresh`) |
| Stored server-side? | No (stateless) | **Yes — in a `refresh_tokens` table** |
| Purpose | Authorize requests | Get a new access token without re-login |

**Why store refresh tokens in the DB?** Because a pure-JWT system can't be revoked — once issued, a token is valid until it expires. Storing refresh tokens lets you implement real **logout** and revocation (delete the row → the token is dead). This is the single concept that separates a toy auth system from a real one.

### You'll need a third table

`refresh_tokens`: `id`, `user_id` (FK), `token_hash` (store a *hash* of the token, not the token itself — same reasoning as passwords), `expires_at`, `created_at`, optionally `revoked_at`.

### Token rotation (do this — it's the senior move)
On every `/auth/refresh` call: validate the old refresh token, **delete/revoke it**, and issue a *new* refresh token alongside the new access token. This means a stolen refresh token is only usable once before it's invalidated — and if both the user and attacker try to use it, you can detect the reuse.

### Auth middleware
A middleware that reads the `Authorization: Bearer <token>` header, verifies the access token, and attaches `req.user = { id }`. Every protected route uses it. Know the difference between **401 Unauthorized** (you're not authenticated) and **403 Forbidden** (you're authenticated but not allowed).

---

## 6. API contract

All request/response bodies are JSON. All protected routes require `Authorization: Bearer <accessToken>`.

### Auth

| Method | Path | Auth? | Body | Success |
|---|---|---|---|---|
| POST | `/auth/register` | No | `{ email, password }` | `201` + user (no hash!) + tokens |
| POST | `/auth/login` | No | `{ email, password }` | `200` + tokens |
| POST | `/auth/refresh` | No | `{ refreshToken }` | `200` + new tokens (rotated) |
| POST | `/auth/logout` | Yes | `{ refreshToken }` | `204` (revokes the refresh token) |
| GET | `/auth/me` | Yes | — | `200` + current user |

### Tasks (all require auth, all scoped to `req.user.id`)

| Method | Path | Body | Success | Notes |
|---|---|---|---|---|
| GET | `/tasks` | — | `200` + array | Support `?status=` and `?priority=` filters |
| POST | `/tasks` | `{ title, description?, priority?, dueDate? }` | `201` + task | |
| GET | `/tasks/:id` | — | `200` + task | `404` if not found **or not owned by user** |
| PATCH | `/tasks/:id` | partial task | `200` + task | Only updates provided fields |
| DELETE | `/tasks/:id` | — | `204` | `404` if not found or not owned |

> **Critical ownership rule:** for `GET/PATCH/DELETE /tasks/:id`, never just look up by `id`. Always query `WHERE id = $1 AND user_id = $2`. Returning a `404` (not `403`) for a task that exists but isn't theirs is the right call — don't leak the existence of other users' data.

---

## 7. Validation

- Validate every request body and query param with **Zod** before it reaches your business logic.
- Validation failures return **400** with a structured list of what's wrong (per-field).
- Never trust the client. The DB `CHECK` constraints are your last line; validation is your first.

---

## 8. Error handling

Adopt one consistent error response shape across the *entire* API:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "details": { "email": "Invalid email format" }
  }
}
```

Requirements:
- A custom `AppError` class (with `statusCode` and `code`) that your code throws deliberately.
- A **single global error-handling middleware** at the end of the stack that catches everything, logs it, and formats the response. No `try/catch` scattered everywhere returning ad-hoc JSON.
- Correct status codes: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict (e.g. email already registered), `500` unexpected.
- A `500` must **never** leak a stack trace or internal detail to the client. Log it fully server-side; return a generic message.

---

## 9. Logging

- Use **pino** for structured JSON logs.
- Generate a **request ID** per request (middleware), attach it to every log line for that request. This is how you trace a single request through your logs in production.
- Log levels: `info` for requests, `warn` for handled problems, `error` for `500`s. No `console.log` anywhere in the final code.

---

## 10. Config & secrets

- All config (DB URL, JWT secrets, token lifetimes, port) comes from environment variables via `dotenv`.
- A committed `.env.example` documents every required variable. The real `.env` is **gitignored**.
- Separate secrets for signing access vs refresh tokens.
- The app should **fail loudly on startup** if a required env var is missing — don't discover it at request time.

---

## 11. Docker

- A `Dockerfile` for the app (multi-stage is a nice-to-have, not required for P1).
- A `docker-compose.yml` that brings up **both** the app and a Postgres container, wired together, with one command: `docker compose up`.
- Postgres data persisted to a named volume (so it survives restarts).
- The app waits for / retries the DB connection on startup (don't assume the DB is ready the instant the container starts).

---

## 12. Health checks

- `GET /health` — liveness. Returns `200` if the process is up. No dependencies checked.
- `GET /health/ready` — readiness. Returns `200` only if it can successfully query the DB (`SELECT 1`), else `503`. Know the difference between liveness and readiness and why both exist.
- Implement **graceful shutdown**: on `SIGTERM`/`SIGINT`, stop accepting new requests, finish in-flight ones, close the DB pool, then exit.

---

## 13. Suggested folder structure

Layered, with a repository pattern (separating SQL from business logic is a senior habit you'll thank yourself for):

```
src/
  config/          env loading + validation
  db/
    pool.js        the pg Pool (singleton)
    migrations/    node-pg-migrate files
    seeds/
  middleware/
    auth.js        verifies access token, sets req.user
    requestId.js
    errorHandler.js
  modules/
    auth/
      auth.routes.js
      auth.controller.js   HTTP layer (req/res)
      auth.service.js      business logic (no req/res, no SQL)
      auth.repository.js   SQL only
      auth.schema.js       Zod schemas
    tasks/
      tasks.routes.js
      tasks.controller.js
      tasks.service.js
      tasks.repository.js
      tasks.schema.js
  utils/
    AppError.js
    logger.js
  app.js           builds the Express app (no listen)
  server.js        imports app, listens, handles shutdown
```

> **Why split `app.js` and `server.js`?** So you can import `app` into tests without it binding a port. Small thing, real senior habit.

> **Why the controller → service → repository split?** Each layer has one job. Controllers know about HTTP. Services know business rules. Repositories know SQL. You can test the service without a web server, swap the DB without touching business logic, and read any file knowing exactly what it's responsible for.

---

## 14. Definition of done (acceptance criteria)

Build against this list. Don't send it to me for review until every box is honestly checked.

**Schema & DB**
- [ ] All tables created via reversible migrations (both `up` and `down` tested)
- [ ] Constraints in place: PKs, FK with a deliberate `ON DELETE` rule, UNIQUE on email, NOT NULLs, CHECKs
- [ ] `tasks(user_id)` and `tasks(user_id, status)` indexes exist
- [ ] Seed script creates a test user + sample tasks

**Auth**
- [ ] Register hashes the password (argon2/bcrypt); plaintext never stored or logged
- [ ] Login returns access + refresh tokens
- [ ] Access token expires (~15 min); refresh token expires (~7 days)
- [ ] Refresh tokens are stored hashed in the DB
- [ ] `/auth/refresh` rotates the refresh token (old one is invalidated)
- [ ] `/auth/logout` revokes the refresh token
- [ ] Auth middleware protects all task routes
- [ ] No endpoint ever returns `password_hash`

**Tasks**
- [ ] Full CRUD works
- [ ] Every task query is scoped to the authenticated user
- [ ] Accessing another user's task returns `404`, not their data
- [ ] `GET /tasks` supports `?status=` and `?priority=` filters

**Cross-cutting**
- [ ] Every input validated with Zod; failures return structured `400`
- [ ] One consistent error response shape everywhere
- [ ] Single global error middleware; correct status codes throughout
- [ ] No stack traces or internal details leak in `500` responses
- [ ] Structured JSON logging with per-request request IDs; zero `console.log`
- [ ] All config via env vars; `.env.example` committed; `.env` gitignored; startup fails on missing vars
- [ ] `docker compose up` brings up app + Postgres and the API works
- [ ] `/health` and `/health/ready` behave correctly
- [ ] Graceful shutdown on SIGTERM/SIGINT

---

## 15. Stretch goals (optional — only if the core is rock solid)

- **Tags** (many-to-many): a `tags` table + `task_tags` join table. Great extra DB-design rep — you'll do M2M for real in later projects.
- **Soft delete** on tasks (`deleted_at` instead of hard delete) — and the query implications.
- **Basic pagination** on `GET /tasks` (`?limit=&offset=`) — you'll do this properly in P3, but a preview is fine.
- **Tests** for the auth service and one task flow (you don't need full coverage yet).

---

## 16. What I'll scrutinize in review

When you send the code, I'll review it like a real PR. Expect pointed questions on:

1. **Ownership checks** — the #1 security bug in CRUD APIs. I'll try to read another user's task.
2. **Token handling** — is rotation real? Are refresh tokens actually revocable? Is anything sensitive logged?
3. **The service/repository boundary** — is SQL leaking into controllers? Is HTTP leaking into services?
4. **Error consistency** — one shape everywhere, correct codes, no leaks.
5. **Schema choices** — I'll ask you to defend UUID, `timestamptz`, your enum strategy, and your `ON DELETE` rule.
6. **Migrations** — do the `down` migrations actually work?
7. **"Why" answers** — for any non-obvious choice, I'll ask why. "It was in the tutorial" isn't an answer; "I chose X over Y because Z" is.

---

**Start with the schema and migrations.** Get the data model right first — everything else hangs off it. Then auth, then the task CRUD, then wrap it all in Docker. Ping me whenever you're stuck or want to sanity-check a decision before you build on top of it.

Let's go. 🚀
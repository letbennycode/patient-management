# Patient Management Dashboard

A healthcare dashboard for a medical practice: browse, search, create, edit and delete patients, attach clinical notes, and view a generated patient summary. React + TypeScript frontend, FastAPI backend, PostgreSQL.

All data is fake (Faker, fixed seed). No real names or records are used anywhere.

## Quick start

Requires Docker.

```bash
cp .env.example .env
docker compose up --build
```

| Service  | URL                                   |
| -------- | ------------------------------------- |
| Frontend | http://localhost:5173                 |
| API      | http://localhost:8000                 |
| API docs | http://localhost:8000/docs            |

On first start the backend runs migrations and seeds **120 patients** (with notes). Seeding only happens when the patients table is empty, so restarts don't duplicate data.

Reset the database and reseed:

```bash
docker compose down -v && docker compose up --build
```

If port 5432 is already in use (e.g. a local Postgres), set `DB_HOST_PORT=5433` in `.env`. pytest reads `TEST_DATABASE_URL` from your shell, not from `.env`, so also run `export TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5433/patients_test`; otherwise the tests hit whatever is on 5432.

If you already have a `pgdata` volume from before, the test database won't exist; run `docker compose down -v` once (or `createdb patients_test`).

Source is bind-mounted into the containers, so backend and frontend both hot reload. After pulling changes to a Dockerfile or `package.json`, run `docker compose up --build -V` so the frontend gets a fresh `node_modules` volume (a plain rebuild reuses the old one, which can have the wrong owner or stale packages).

## Tests and lint

Tests run against a separate Postgres database (`patients_test`, created automatically by the `db` container on a fresh volume), never SQLite.

```bash
# Backend (needs the db running: docker compose up -d db)
cd backend
python -m venv .venv && source .venv/bin/activate && pip install -r requirements-dev.txt
pytest
ruff check .

# Frontend
cd frontend
npm ci
npm test            # vitest run
npm run lint        # oxlint
npm run typecheck
```

`TEST_DATABASE_URL` (see `.env.example`) selects the test database; it defaults to `postgresql+psycopg://postgres:postgres@localhost:5432/patients_test`.

## Environment variables

Defined in `.env.example`.

| Variable                                   | Purpose                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `POSTGRES_USER/PASSWORD/DB`                | Credentials for the `db` container                                          |
| `DATABASE_URL`                             | Backend connection string (host is `db` inside compose)                     |
| `DB_HOST_PORT` (optional)                  | Host port for the db container (default `5432`); set it if 5432 is taken    |
| `TEST_DATABASE_URL`                        | Database used by pytest (export it in your shell; `.env` is not read)       |
| `SEED_ON_STARTUP`                          | `true` seeds an empty database on startup; tests set `false`                |
| `CORS_ORIGINS`                             | Comma-separated allowed origins (default `http://localhost:5173`)           |
| `LLM_SUMMARY_ENABLED`                      | `false` by default. The LLM summary runs only when this is `true` **and** a key is set |
| `LLM_API_KEY` (optional)                   | Anthropic API key (ignored unless `LLM_SUMMARY_ENABLED=true`)               |
| `LLM_MODEL` (optional)                     | Model used for LLM summaries                                                |
| `VITE_API_URL`                             | API base URL used by the frontend (default `http://localhost:8000`)         |

## Features by part of the assignment

- **Foundation:** Vite + React + strict TypeScript; Tailwind + shadcn/ui; React Router; TanStack Query; Zustand; oxlint + Prettier; FastAPI with `GET /health`; Alembic migrations; idempotent seed.
- **Dashboard:** responsive layout (header, sidebar that becomes a drawer on small screens, main area); dashboard home with patient counts per status and a status distribution bar; patient list with name/age/last visit/status, debounced non-blocking search, status filter, sorting, pagination; patient detail page; 404 page.
- **Notes and summary:** add, list and delete timestamped notes; `GET /patients/{id}/summary` returns identifiers, a narrative built from the notes, conditions and allergies.
- **Forms:** one create/edit form with Zod validation mirroring the server rules, server 422 errors mapped onto fields, and a clear message on network failure (input is preserved).
- **Containerization:** `docker compose up` starts db, backend and frontend.

### Stretch goals completed

- Advanced backend: sort/filter/search query params, Alembic migrations, request logging middleware (request ID, route template, status, duration; never query strings or patient data).
- Testing and quality: pytest API/service tests and Vitest component tests.
- Developer experience: hot reload in Docker for both services; GitHub Actions CI (`.github/workflows/ci.yml`) running ruff and pytest (against Postgres 16) plus lint, typecheck, tests and build for the frontend.
- UI/UX and performance: dark/light/system theme toggle (persisted, no flash on load); TanStack Virtual windowing when a page shows more than 50 rows (page size 100); route-level code splitting with `React.lazy`; a dependency-free status chart on the dashboard.

## API

| Method & path                           | Notes                                                       |
| --------------------------------------- | ----------------------------------------------------------- |
| `GET /health`                           | `{"status": "ok"}`                                          |
| `GET /patients`                         | Paginated list, see below                                   |
| `POST /patients`                        | 201 with the created patient                                |
| `GET/PUT/DELETE /patients/{id}`         | PUT replaces the whole record; DELETE returns 204           |
| `GET/POST /patients/{id}/notes`         | List returns `{items, total}` (all notes, newest first)     |
| `DELETE /patients/{id}/notes/{note_id}` | 204                                                         |
| `GET /patients/{id}/summary`            | Template summary, or LLM when enabled (see below)           |

List query params: `page` (default 1), `page_size` (1–100, default 20), `search` (name substring, case-insensitive), `status` (`active|inactive|critical`), `sort` (`name|age|last_visit|status|created_at`), `order` (`asc|desc`). The response is `{ items, total, page, page_size }`.

Errors use FastAPI's `{"detail": ...}` body: 404 for missing resources, 422 for validation (field-level `detail` array).

## Decisions

- **Server state vs UI state:** TanStack Query owns everything fetched from the API (caching, invalidation, retries); Zustand holds only UI state (the theme). List view state (filter, sort, page) lives in the URL so it is shareable and survives back/forward. The search term is the exception: names are PHI, so it lives in the list's router history state, not the URL. Back/forward restores it, but it never appears in the address bar, bookmarks or shared links, and opening the list from the sidebar or a dashboard card starts with no search. (The API request itself is still `GET /patients?search=`, so the term is visible in browser devtools; fine here, but a real system would use a POST body or keep it off any shared proxy logs.)
- **100+ patients:** pagination, search, sort and filter all happen in SQL (`LIMIT/OFFSET` + `COUNT`). The UI only ever holds one page; very large pages are windowed with TanStack Virtual.
- **Non-blocking search:** the input is local state, the debounced (300 ms) value drives the query, and previous results stay visible while the next page loads.
- **Validation twice, same rules:** Pydantic on the server, Zod on the client. Server errors are mapped back onto form fields.
- **Summary:** template-first so it works offline and deterministically; the LLM is optional and any failure or timeout falls back to the template. Identifiers, conditions and allergies always come from the database, not the model.
- **LLM privacy:** off unless `LLM_SUMMARY_ENABLED=true` and a key is set. Text sent to the model is redacted first (`services/redaction.py`): no name, no dates, age capped at 90+, the patient's own identifiers masked wherever they appear in notes, and emails, phones, SSNs, dates, addresses, ZIPs, IDs, URLs, IPs and titled names masked by pattern. Redaction is best-effort, not a guarantee (free text can hold identifiers no pattern recognises), so still use it only with fake data or under a BAA.
- **Privacy:** seed data is fake; logs never contain patient fields, note contents, search terms or path IDs (uvicorn's access log, which includes query strings, is disabled in the container). The tab title never shows a patient's name, `GET /patients` returns only the fields the list shows (the full record is `GET /patients/{id}`), and a caller's `X-Request-ID` is only reused if it is a UUID.
- **Containers:** both run as a non-root user.
- **IDs and ages:** UUID primary keys; `age` is derived at read time rather than stored.

## Assumptions

- Patient fields: first/last name, DOB, optional email/phone, flat address, blood type, allergies/conditions (Postgres `text[]`), status (`active|inactive|critical`), editable `last_visit` date.
- Hard delete, with notes deleted along with the patient.
- Notes are immutable, have no author (there are no users yet) and are not paginated.
- Offset pagination rather than infinite scroll.

## Not ready for real patient data

This is a take-home demo and **must not be used with real PHI as it stands**. It has no authentication or authorization, no audit log of who read what, no rate limiting (every summary request can be a paid third-party LLM call when the LLM is enabled), no TLS or encryption at rest, and no data retention or deletion policy. Redaction before the LLM is best-effort.

## What I'd do next

Authentication and roles, an audit log for PHI access, rate limiting, soft delete/archive, note editing with authorship, real-time updates, and end-to-end tests.

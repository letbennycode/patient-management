# Patient Management Dashboard

Take-home interview project: a healthcare dashboard built with React (TypeScript), FastAPI and PostgreSQL. The time budget is 2–4 hours, so favor clear, idiomatic code over clever abstractions, and don't build anything the spec doesn't ask for.

- Assignment: `docs/take-home.md` (the source of truth for requirements; gitignored)
- Per-feature specs: `docs/specs/NN-name.md` (written by the `spec-creator` agent)

## Stack
- **Frontend:** Vite + React + TypeScript (strict), React Router, TanStack Query (server state), Zustand (UI-only state, e.g. theme), React Hook Form + Zod, Tailwind + shadcn/ui, TanStack Virtual for long lists
- **Backend:** FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic migrations, PostgreSQL 16
- **Tooling:** oxlint + Prettier, Ruff; tests with Vitest + React Testing Library + MSW, and pytest + httpx
- **Runtime:** docker-compose (db, backend, frontend) with hot reload

## Layout
```
backend/app/     main.py, api/ (routers), models/, schemas/, services/, db/
backend/alembic/ migrations
backend/tests/   api/, services/, conftest.py (mirrors app/)
frontend/src/    pages/, features/patients/, components/, api/, lib/, test/ (setup, render helper, MSW handlers)
docs/specs/      feature specs
```
Frontend tests are colocated with the code they test: `PatientList.test.tsx` next to `PatientList.tsx`.

## Commands
- Run everything: `docker compose up --build`
- Reset DB and reseed: `docker compose down -v && docker compose up --build`. Seeding runs on startup and only inserts when the patients table is empty
- Backend tests / lint: `cd backend && pytest` · `ruff check .`
- Frontend tests / lint: `cd frontend && npm test` (script is `vitest run`, never watch mode; use `npm run test:watch` locally) · `npm run lint` · `npm run typecheck`

## API conventions
- REST routes as defined in the spec: `/health`, `/patients`, `/patients/{id}`, `/patients/{id}/notes`, `/patients/{id}/summary`
- List responses use the shape `{ items, total, page, page_size }`, with sort, filter and search as query params
- Validate everything with Pydantic. Status codes: 201 create, 204 delete, 404 missing, 422 validation
- Error body: `{ "detail": ... }` (FastAPI default); the frontend surfaces it to the user
- Summary endpoint: template-based by default; LLM only if an API key is set, with the template as fallback

## Backend conventions
- Thin routers → services (business logic) → SQLAlchemy models. Pydantic schemas are separate from ORM models
- Seeding: `SEED_ON_STARTUP` (default `true`, tests set `false`); idempotent, Faker with a fixed seed
- Tests use a separate Postgres database via `TEST_DATABASE_URL`, never SQLite

## Frontend conventions
- All server calls go through `src/api/` and TanStack Query hooks. Never call `fetch` directly in components
- Search is debounced and non-blocking (`useDeferredValue` / debounce + query params)
- Every page handles loading, empty and error states. Layout must work down to ~360px wide
- Zod schemas mirror the backend validation rules

## Patient data rules
- Seed data is fake only (Faker). Never use real names or records
- Never log patient fields or note contents; log request IDs, routes and status codes only
- Secrets come from env vars; keep `.env.example` in sync and never commit `.env`

## Agent workflow
`spec-creator` → `architect` → implement (developer) → `pytest-writer` / `vitest-writer` → `reviewer` → `security-privacy-reviewer` for anything touching patient data, config or the LLM. The architect, the two reviewers and spec-creator never write app code.

## Definition of done
Lint, typecheck and tests pass; `docker compose up` works from a clean clone; README updated if setup changed.

# 01: Project foundation

**Source:** take-home Part 1 (frontend tasks 1–3, backend task 1), Part 5 (+ stretch: Developer Experience, hot reload in Docker)

## Goal
A clean clone runs `docker compose up --build` and gets a Postgres DB, a FastAPI backend answering `GET /health`, and a Vite React app reachable in the browser, with lint, typecheck and test commands working on both sides.

## Backend
- FastAPI app under `backend/app/` per the `CLAUDE.md` layout. Settings come from env vars via one settings object (`DATABASE_URL`, `TEST_DATABASE_URL`, `SEED_ON_STARTUP`, `CORS_ORIGINS`, `LLM_API_KEY` (optional, used in 09)).
- SQLAlchemy 2.0 engine/session setup and Alembic initialised (no tables yet; first migration lands in 02).
- CORS allows the frontend origin from `CORS_ORIGINS` (default `http://localhost:5173`).
- Ruff configured; pytest + httpx configured, with a `conftest.py` providing an app client.

## API
`GET /health` → `200 {"status": "ok"}`. No DB dependency (liveness only).

## Frontend
- Vite + React + TypeScript with `strict: true`.
- Installed and wired: React Router, TanStack Query (one `QueryClient` provider), Zustand, React Hook Form + Zod, Tailwind + shadcn/ui (init plus Button as a smoke test), TanStack Virtual (installed only).
- `src/api/` contains a single HTTP client used by all later chunks:
  - base URL from `VITE_API_URL` (default `http://localhost:8000`);
  - non-2xx responses throw an `ApiError` carrying `status` and the parsed `detail`;
  - network failures (fetch rejects) throw a distinguishable network error type.
- oxlint + Prettier configured (`.oxlintrc.json` with the react and typescript plugins); scripts `lint`, `typecheck`, `test` (`vitest run`), `test:watch`.
- Vitest + React Testing Library + MSW set up in `src/test/` (setup file, render helper wrapping Router + QueryClient, MSW server with an empty handler list).
- Placeholder `App` rendering a heading is enough; layout comes in 04.

## Containerization
- `backend/Dockerfile`, `frontend/Dockerfile` (dev server, bind-mounted source, hot reload).
- `docker-compose.yml` services: `db` (postgres:16, named volume, healthcheck), `backend` (waits for db healthy, runs `alembic upgrade head` then uvicorn with `--reload`), `frontend` (Vite dev server on 5173, `--host`).
- Ports: frontend 5173, backend 8000, db 5432.
- `.env.example` lists every variable used by compose and both apps with safe placeholder values. `.env` is gitignored.

## Acceptance criteria
- [ ] Frontend initialised with Vite, React, TypeScript strict.
- [ ] UI library, state management, routing and styling dependencies installed and configured (shadcn/ui + Tailwind, TanStack Query + Zustand, React Router).
- [ ] `npm run lint`, `npm run typecheck`, `npm test` pass; Prettier config present.
- [ ] `GET /health` returns 200 with exactly `{"status": "ok"}`.
- [ ] `ruff check .` and `pytest` pass in `backend/`.
- [ ] Backend and frontend each have a Dockerfile.
- [ ] `docker compose up --build` from a clean clone starts db, backend and frontend; the frontend loads at `http://localhost:5173` and `http://localhost:8000/health` responds.
- [ ] Editing a backend or frontend source file reloads without rebuilding the image.
- [ ] `.env.example` exists and covers all env vars; `.env` is gitignored.

## Test plan
- **pytest:** `GET /health` returns 200 and `{"status": "ok"}`.
- **vitest:** App renders its heading using the shared render helper (proves Router/QueryClient/MSW setup). API client: non-2xx response throws `ApiError` with status and detail; network rejection throws the network error type.

## Assumptions & open questions
- Frontend container runs the Vite dev server (hot reload) rather than a production nginx build. A production build is out of scope for the take-home.
- Health check does not touch the DB.

## Out of scope
Tables, seed data, any patient endpoints or UI, CI pipeline.

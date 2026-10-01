# 10: README + submission check

**Source:** take-home Submission Requirements, Part 5 (verification), Evaluation "Documentation and ease of local setup"

## Goal
A succinct README that lets a reviewer run the project in one command and understand the key decisions, plus a final clean-clone verification.

## README contents
- One-paragraph overview and screenshot-free feature list mapped to Parts 1–5.
- **Quick start:** prerequisites (Docker), `cp .env.example .env`, `docker compose up --build`, URLs (frontend 5173, API 8000, API docs `/docs`).
- Reset/reseed command; seed size and that data is fake.
- Running tests and lint for backend and frontend (inside or outside Docker).
- Environment variables table (from `.env.example`), noting `LLM_API_KEY` is optional.
- **Architecture & decisions:** stack and why (TanStack Query for server state vs Zustand for UI state, shadcn/ui, RHF + Zod mirroring Pydantic, Alembic, server-side pagination/search for 100+ patients, debounced non-blocking search, template-first summary with LLM fallback).
- API overview: endpoint list, list query params, error shape.
- **Stretch goals completed** (from 00-roadmap) and any optional stretch chunks done.
- Assumptions (from specs) and "what I'd do next" (auth/roles, audit log, soft delete, real-time, CI, E2E).

## Acceptance criteria
- [ ] `README.md` exists at repo root with quick start, tests, env vars, decisions, assumptions.
- [ ] From a fresh clone: `cp .env.example .env && docker compose up --build` brings up all three services with seeded data, no manual steps.
- [ ] Every command in the README works as written.
- [ ] Backend and frontend lint, typecheck and tests pass.
- [ ] No `.env`, secrets or real patient data committed.

## Test plan
Manual: fresh clone in a temp dir, run quick start, open `/patients`, create/edit/delete a patient, add/delete a note, view summary, visit an unknown route. Run both test suites.

## Out of scope
CI pipeline, deployment.

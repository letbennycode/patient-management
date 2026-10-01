# 00: Roadmap

Build order for the take-home (`docs/take-home.md`). Each chunk is sized for one sitting: implement, test, review. Estimates include writing tests. Target total for required chunks is about 3h35m, inside the 2–4h budget; if time runs short, trim UI polish in 05–07 before cutting any acceptance criterion.

| # | Chunk | Goal | Covers | Depends on | Est. |
|---|-------|------|--------|-----------|------|
| 01 | [Project foundation](01-project-foundation.md) | Backend + frontend scaffolds, tooling, `/health`, Dockerfiles, docker-compose, `.env.example` | Part 1, Part 5 | none | 25m |
| 02 | [Patient model + seed](02-patient-model-seed.md) | `patients` table via Alembic, idempotent Faker seed on startup, test DB fixture | Part 1 | 01 | 15m |
| 03 | [Patients CRUD API](03-patients-api.md) | `GET/POST/PUT/DELETE /patients`, pagination, search, sort, filter, validation | Part 2 | 02 | 30m |
| 04 | [App shell + routing](04-app-shell-routing.md) | Header, sidebar, main area, routes `/`, `/patients`, `/patients/:id`, 404, dashboard home | Part 2 | 01 (03 for home stats) | 15m |
| 05 | [Patient list UI](05-patient-list.md) | List with name/age/last visit/status, non-blocking search, filter, sort, pagination, responsive | Part 2 | 03, 04 | 30m |
| 06 | [Patient detail view](06-patient-detail.md) | `/patients/:id` profile view with delete, slots for notes and summary | Part 2 | 03, 04 | 15m |
| 07 | [Patient form](07-patient-form.md) | Create/edit form with client + server validation, network/validation error handling | Part 4 | 03, 06 | 30m |
| 08 | [Patient notes](08-patient-notes.md) | Notes table, `POST/GET/DELETE /patients/{id}/notes`, notes section in detail view | Part 3 | 03, 06 | 25m |
| 09 | [Patient summary](09-patient-summary.md) | `GET /patients/{id}/summary` (template, optional LLM) and summary view | Part 3 | 08 | 20m |
| 10 | [README + submission check](10-readme-submission.md) | README with setup and decisions, clean-clone `docker compose up` check | Submission reqs, Part 5 | all | 10m |

**Required total: ~3h35m.** Optional stretch chunks below add ~45m and should only be started if required chunks finish early.

## Stretch goals already delivered by the core stack
The take-home asks for 1–2 stretch features. These fall out of `CLAUDE.md` choices at no extra chunk cost; the README should call them out:
- **Advanced Backend:** sorting/filtering query params on the list endpoint (chunk 03), Alembic migrations (chunk 02).
- **Testing & Quality:** pytest API tests and Vitest component tests in every chunk.
- **Developer Experience:** hot reload in Docker for both services (chunk 01).

## Optional stretch chunks (only if time remains, in this order)
| # | Chunk | Goal | Depends on | Est. |
|---|-------|------|-----------|------|
| 11 | [STRETCH: Theme switching](11-stretch-theme.md) | Dark/light toggle in header, persisted | 04 | 15m |
| 12 | [STRETCH: Virtualized list](12-stretch-virtualized-list.md) | TanStack Virtual for large page sizes | 05 | 20m |
| 13 | [STRETCH: Request logging middleware](13-stretch-request-logging.md) | Request ID + route/status/duration logs, no patient data | 01 | 10m |

## Cross-cutting decisions pending confirmation
See "Assumptions & open questions" in 02, 03, 08 and 09. The ones that change the data model or API contract:
patient field set (names, address, contact shape), status values, `last_visit` source, ID type, delete cascade, note timestamp rules, notes list shape, seed size, LLM provider.

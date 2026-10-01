# 02: Patient model + seed

**Source:** take-home Part 1 (backend tasks 2–3) (+ stretch: Advanced Backend, Alembic migrations)

## Goal
A `patients` table created by an Alembic migration, seeded with realistic fake data on startup, and a test database fixture that later chunks reuse.

## Data model: `patients`
| Field | Type | Required | Constraints |
|---|---|---|---|
| `id` | UUID | yes | PK, server-generated |
| `first_name` | varchar(100) | yes | trimmed, 1–100 chars |
| `last_name` | varchar(100) | yes | trimmed, 1–100 chars |
| `date_of_birth` | date | yes | not in the future, not before 1900-01-01 |
| `email` | varchar(254) | no | valid email |
| `phone` | varchar(32) | no | 7–32 chars of digits, spaces, `+ - ( ) .` |
| `address_line1` | varchar(200) | no | |
| `address_line2` | varchar(200) | no | |
| `city` | varchar(100) | no | |
| `state` | varchar(100) | no | |
| `postal_code` | varchar(20) | no | |
| `blood_type` | enum | no | `A+ A- B+ B- AB+ AB- O+ O-`; null means unknown |
| `allergies` | text[] | yes, may be empty | default `{}`; each item 1–100 chars; max 50 items |
| `conditions` | text[] | yes, may be empty | same rules as allergies |
| `status` | enum | yes | `active`, `inactive`, `critical`; default `active` |
| `last_visit` | date | no | not in the future, not before `date_of_birth` |
| `created_at` | timestamptz | yes | server default now |
| `updated_at` | timestamptz | yes | server default now, updated on change |

Indexes: `(last_name, first_name)`, `status`, `last_visit`. Optional trigram/lower index for name search is not required.

`age` is **not stored**; it is derived (whole years from `date_of_birth` to today, UTC) in the API layer (chunk 03).

## Seed
- Runs on backend startup when `SEED_ON_STARTUP=true` (default) and the `patients` table is empty; otherwise does nothing. Safe to run repeatedly.
- Inserts **120 patients** using Faker with a fixed seed (deterministic). Exceeds the 15–20 minimum and exercises the "100+ patients" list requirement.
- Realistic values: ages spread 0–95, mix of all statuses (mostly `active`), ~15% null blood type, 0–3 allergies and 0–4 conditions drawn from small fixed lists (e.g. "Penicillin", "Peanuts"; "Hypertension", "Type 2 diabetes"), `last_visit` within the last 2 years or null for ~10%.
- All data is fake. Seed logs only the count inserted, never field values.
- Notes seeding is added in chunk 08.

## Test infrastructure
- `conftest.py` creates the schema in the Postgres DB at `TEST_DATABASE_URL` (via Alembic or metadata) and isolates each test (transaction rollback or truncate). Tests set `SEED_ON_STARTUP=false`.
- A factory/helper to create patients in tests.

## Acceptance criteria
- [ ] `alembic upgrade head` on an empty DB creates `patients` with the fields and constraints above; `alembic downgrade base` removes it.
- [ ] On first `docker compose up`, the DB contains 120 patients; restarting does not add more.
- [ ] With `SEED_ON_STARTUP=false`, nothing is inserted.
- [ ] Seed output is identical across fresh resets (fixed Faker seed).
- [ ] Another developer can recreate the DB with `docker compose down -v && docker compose up --build`.
- [ ] Tests run against Postgres via `TEST_DATABASE_URL`, never SQLite.

## Test plan
- **pytest (services):** seed inserts 120 rows into an empty table; running it a second time inserts 0; all seeded rows satisfy the enum and date constraints (DOB ≤ today, last_visit ≥ DOB).
- Migration upgrade/downgrade runs cleanly (can be a single smoke test).

## Assumptions & open questions
1. **Name split into `first_name` / `last_name`** (not a single `name`). Enables sorting by last name. Displayed as "First Last".
2. **Status values `active | inactive | critical`.** The assignment doesn't define them. Alternative: `active | inactive | discharged`.
3. **`last_visit` is a stored, editable date** on the patient, not derived from notes. Adding a note does not change it. Alternative: derive from the most recent note timestamp (would drop the column and make seed depend on notes).
4. **Address is flat optional columns** (line1, line2, city, state, postal_code), no country.
5. **Contact = optional email + optional phone.** Neither is required.
6. **UUID primary keys** (avoid enumerable IDs for patient records).
7. **Allergies/conditions as Postgres `text[]`**, not separate tables or free text.
8. **Seed 120 patients** to demonstrate the 100+ requirement.

## Out of scope
API endpoints, notes table (chunk 08), soft delete, audit history.

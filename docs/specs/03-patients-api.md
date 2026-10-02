# 03: Patients CRUD API

**Source:** take-home Part 2 (task 1, requirements: 100+ efficiently, validation, status codes) (+ stretch: Advanced Backend, sorting/filtering query params)

## Goal
REST endpoints to list, read, create, update and delete patients, with server-side pagination, search, sort and filter, and strict validation.

## Patient resource (response)
All fields from 02 plus derived `age`:
```json
{
  "id": "uuid", "first_name": "Ada", "last_name": "Lovelace",
  "date_of_birth": "1985-04-12", "age": 40,
  "email": "ada@example.com", "phone": "+1 555 0100",
  "address_line1": "1 Main St", "address_line2": null, "city": "Springfield", "state": "IL", "postal_code": "62701",
  "blood_type": "O+", "allergies": ["Penicillin"], "conditions": ["Hypertension"],
  "status": "active", "last_visit": "2026-08-01",
  "created_at": "2026-09-30T12:00:00Z", "updated_at": "2026-09-30T12:00:00Z"
}
```
List items (`GET /patients`) use a slimmer shape, `PatientListItem`: `id`, `first_name`, `last_name`, `age`, `status`, `last_visit`. Contact and clinical fields are only returned by `GET /patients/{id}` and the write endpoints.

## Patient input (POST and PUT body)
Required: `first_name`, `last_name`, `date_of_birth`. Optional with defaults: `status` (`active`), `allergies` (`[]`), `conditions` (`[]`); all other fields optional/nullable. `id`, `age`, `created_at`, `updated_at` are not accepted (ignored or rejected as extra fields; reject with 422 preferred: `extra="forbid"`).

**PUT is a full replacement**: omitted optional fields become null/default. No PATCH.

## Endpoints
### `GET /patients`
Query params:
| Param | Type | Default | Rules |
|---|---|---|---|
| `page` | int | 1 | ≥ 1 |
| `page_size` | int | 20 | 1–100 |
| `search` | string | none | trimmed; ≤ 100 chars; empty means no filter |
| `status` | enum | none | one of the status values |
| `sort` | enum | `name` | `name`, `age`, `last_visit`, `status`, `created_at` |
| `order` | enum | `asc` | `asc`, `desc` |

- `search`: case-insensitive substring match on first name, last name, or "first last" full name.
- `sort=name` orders by last name, then first name. `sort=age` orders by age (i.e. reverse `date_of_birth`). `last_visit` nulls always last. Every sort adds `id` as tiebreaker so pages are stable.
- Response `200 { items: PatientListItem[], total, page, page_size }`. `total` counts all matches. A page past the end returns `items: []` with the correct `total`.
- Invalid params → `422`.

### `GET /patients/{id}`
`200 Patient`; `404 {"detail": "Patient not found"}`; malformed UUID → `422`.

### `POST /patients`
`201 Patient` (includes server-generated `id`). Invalid body → `422`.

### `PUT /patients/{id}`
`200 Patient`; `404` if missing; `422` invalid body. Updates `updated_at`.

### `DELETE /patients/{id}`
`204` no body; `404` if missing. Deletes the patient's notes too (cascade, see 08).

## Validation
Server-side via Pydantic (rules in 02), mirrored by Zod in 07:
- Strings trimmed; whitespace-only required fields rejected.
- `date_of_birth`: not in future, ≥ 1900-01-01. `last_visit`: not in future, ≥ `date_of_birth`.
- `email`: valid email. `phone`: 7–32 chars of digits, spaces, `+ - ( ) .`.
- `blood_type`, `status`: enum values only.
- `allergies`/`conditions`: ≤ 50 items, each trimmed 1–100 chars, case-insensitive duplicates removed.
- 422 body is FastAPI's default `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}`; `msg` must be human-readable (custom messages for date and phone rules, e.g. "Date of birth cannot be in the future").

## Acceptance criteria
- [ ] All five endpoints exist at the paths above with the listed status codes.
- [ ] `GET /patients` is paginated and returns `{ items, total, page, page_size }`.
- [ ] Search, status filter, and each sort field/order work and combine.
- [ ] Listing is done in SQL (LIMIT/OFFSET + COUNT), never by loading all rows; listing 120+ patients stays fast.
- [ ] `age` is present and correct for each patient, including birthdays later this year.
- [ ] Invalid input returns 422 with field-level `detail`; missing patient returns 404 with `{"detail": "Patient not found"}`.
- [ ] Routers stay thin; logic in services; no patient fields logged.

## Test plan (pytest)
- List: default page/page_size; `page_size` 101 → 422; `page=0` → 422; page past end → empty items, correct total.
- Search: matches first, last, full name, case-insensitive; no match → empty; combined with status filter.
- Sort: each field asc/desc; `last_visit` nulls last; invalid `sort` → 422; stable ordering across pages.
- Get: found; unknown UUID → 404; `abc` → 422.
- Create: minimal valid body → 201 with defaults; full body → 201; missing first_name → 422; future DOB → 422; last_visit before DOB → 422; bad email, bad phone, bad blood type → 422; extra field `id` → 422; allergies deduped/trimmed.
- Update: full replace clears omitted optional fields; 404 unknown; 422 invalid; `updated_at` changes.
- Delete: 204, then GET → 404; delete unknown → 404.
- Age: DOB today minus N years exactly → N; birthday tomorrow → N-1.

## Assumptions & open questions
1. **Hard delete with cascade to notes** (no soft delete/archive). Alternative: soft delete via an `archived` flag, which would change list filtering.
2. **Search matches name only** (not email, phone, conditions). Advanced multi-field search is stretch.
3. **Single `status` filter** value per request.
4. Offset pagination (not cursor/infinite scroll).
5. PUT is a full replacement; no PATCH.

## Out of scope
Auth, PATCH, bulk operations, multi-field advanced filters, a stats endpoint.

# 08: Patient notes

**Source:** take-home Part 3 (backend task 1, frontend task 1)

## Goal
Clinicians can add, view and delete timestamped notes on a patient, via API and in the patient detail view.

## Data model: `patient_notes`
| Field | Type | Required | Constraints |
|---|---|---|---|
| `id` | UUID | yes | PK |
| `patient_id` | UUID | yes | FK → `patients.id`, `ON DELETE CASCADE`, indexed |
| `timestamp` | timestamptz | yes | client-supplied; not more than 5 minutes in the future |
| `content` | text | yes | trimmed, 1–5000 chars |
| `created_at` | timestamptz | yes | server default now |

Index `(patient_id, timestamp DESC)`. New Alembic migration.

**Seed update:** the seed (02) also inserts 0–5 notes per patient from a small set of fake clinical templates (e.g. "Follow-up for hypertension; BP 132/84, continue lisinopril."), timestamps within the last 2 years. Still only when the patients table is empty.

## API
Note resource: `{ "id", "patient_id", "timestamp", "content", "created_at" }` (ISO 8601 with timezone).

### `POST /patients/{id}/notes`
Body: `{ "timestamp": "2026-09-30T10:15:00Z", "content": "..." }`. Both required; extra fields → 422.
`201 Note`; `404 {"detail": "Patient not found"}`; `422` invalid body (empty/whitespace content, > 5000 chars, timestamp without timezone, future timestamp).

### `GET /patients/{id}/notes`
`200 { "items": Note[], "total": n }`, all notes, newest `timestamp` first (tiebreak `created_at` desc). `404` if patient missing.

### `DELETE /patients/{id}/notes/{note_id}`
`204`; `404 {"detail": "Note not found"}` if the note doesn't exist **or belongs to a different patient**; `404 "Patient not found"` if the patient doesn't exist.

## UI (Notes section on `/patients/:id`)
- List of notes, newest first: formatted timestamp (local time, e.g. "30 Sep 2026, 10:15") and content (preserves line breaks; plain text, never rendered as HTML). Delete button per note with a confirm step.
- Add form above the list: textarea (required, max 5000, live character counter) and datetime-local input pre-filled with now (editable for backdating). Submit disabled while saving; on success the form clears and the list updates.
- Validation messages: "Note can't be empty", "Note must be 5000 characters or fewer", "Time can't be in the future". Server 422 and network errors shown inline like 07.
- States: loading skeleton; empty "No notes yet"; error with Retry.
- After add/delete, invalidate the notes query and the summary query (09).

## Acceptance criteria
- [ ] POST accepts timestamp + text content and returns 201 with the note.
- [ ] GET returns all notes for the patient, newest first.
- [ ] DELETE removes a note (204); cross-patient or unknown note → 404.
- [ ] Deleting a patient deletes their notes.
- [ ] Detail view shows notes with timestamps, lets the user add and delete notes.
- [ ] Loading, empty and error states; note content never logged.

## Test plan
- **pytest:** create note → 201 and appears in list; list ordering newest first; list for unknown patient → 404; POST to unknown patient → 404; empty / whitespace / 5001-char content → 422; naive timestamp → 422; future timestamp → 422; delete → 204 then gone; delete note via another patient's URL → 404; delete patient cascades notes; seed creates notes.
- **vitest:** renders notes with formatted timestamps; empty state; add note posts correct body and clears form; empty submit shows message without request; delete confirm sends DELETE and removes note; server 422 and network error messages.

## Assumptions & open questions
1. **Notes list is not paginated**: returns `{ items, total }` with all notes ("list all notes"), a deliberate deviation from the `{ items, total, page, page_size }` list convention. Alternative: paginate with the full convention.
2. **Timestamp is required in the body**, timezone-aware, may be backdated, may not be in the future (5 min skew allowance). UI defaults it to now.
3. **Notes are immutable** (no edit endpoint), matching the assignment.
4. **Cascade delete** with the patient (see 03 assumption 1).
5. No author field (no users/auth yet).

## Out of scope
Editing notes, note authors, attachments, rich text.

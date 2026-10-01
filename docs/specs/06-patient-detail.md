# 06: Patient detail view

**Source:** take-home Part 2 (task 4: individual patient view; task 1 DELETE from the UI)

## Goal
`/patients/:id` shows the full patient profile, with Edit and Delete actions, and reserves sections for notes (08) and summary (09).

## UI
- Data from `GET /patients/{id}` via a query hook.
- **Header area:** full name, status badge, age and DOB, Edit button (→ `/patients/:id/edit`), Delete button, back link to `/patients` (preserving the list's query string if navigated from it).
- **Sections:**
  - Contact: email, phone, address (lines joined; "Not provided" for missing).
  - Medical: blood type ("Unknown" if null), allergies and conditions as chips ("None recorded" if empty), last visit ("Never" if null).
  - Notes (placeholder container, filled by 08).
  - Summary (placeholder container, filled by 09).
- **Delete:** confirmation dialog ("Delete <name>? This also deletes their notes and can't be undone."). On confirm calls `DELETE /patients/{id}`; on 204 invalidates patient list queries, shows a success toast and navigates to `/patients`. On error shows the error in the dialog/toast and stays.
- **States:** loading skeleton; 404 or malformed id (422) → "Patient not found" with link to the list; other errors → message + Retry.
- Single column on mobile; two columns on wide screens.

## Acceptance criteria
- [ ] `/patients/:id` displays all patient fields from the API.
- [ ] Unknown or malformed id shows "Patient not found" (not a crash or blank page).
- [ ] Delete requires confirmation, removes the patient, and returns to the list, which no longer shows them.
- [ ] Edit navigates to the edit form.
- [ ] Loading and error states with Retry.

## Test plan (vitest + MSW)
- Renders fields, "Unknown" blood type, "None recorded" allergies, "Never" last visit.
- 404 response → not-found message.
- Delete: cancel does nothing; confirm sends DELETE and navigates to `/patients`; 500 on delete keeps user on page and shows error.

## Assumptions & open questions
- Delete lives on the detail page only (not in list rows).

## Out of scope
Notes and summary content (08, 09), the form (07).

# 07: Patient form (create + edit)

**Source:** take-home Part 4 (all tasks); Part 2 (POST/PUT from the UI)

## Goal
One form used at `/patients/new` (POST) and `/patients/:id/edit` (PUT), with client-side Zod validation mirroring the server, server 422 errors mapped onto fields, and clear handling of network failures.

## UI
- **Personal information:** first name*, last name*, date of birth*, email, phone, address line 1, address line 2, city, state, postal code.
- **Medical information:** blood type (select incl. "Unknown"), status* (select, default Active), allergies, conditions (tag input: type + Enter/comma to add, × to remove), last visit (date).
- `*` marks required fields.
- Edit mode pre-fills from `GET /patients/{id}`; shows loading skeleton, and "Patient not found" on 404.
- Buttons: Save (disabled + spinner while submitting), Cancel (back to detail or list). Warn before leaving with unsaved changes is optional.
- On success: invalidate list and that patient's query, toast "Patient created/updated", navigate to `/patients/:id`.
- Single column on mobile, two columns on wide screens.

## Validation
Zod schema mirrors 03 exactly (same limits and enum values). Errors show inline under the field on blur and on submit; focus moves to the first invalid field. Messages the user sees:
| Rule | Message |
|---|---|
| required name | "First name is required" / "Last name is required" |
| name > 100 | "Must be 100 characters or fewer" |
| DOB missing | "Date of birth is required" |
| DOB future | "Date of birth cannot be in the future" |
| DOB < 1900 | "Date of birth must be after 1900" |
| email | "Enter a valid email address" |
| phone | "Enter a valid phone number" |
| last visit future | "Last visit cannot be in the future" |
| last visit < DOB | "Last visit cannot be before date of birth" |
| list item > 100 / > 50 items | "Each entry must be 100 characters or fewer" / "Up to 50 entries" |

Empty optional inputs are sent as `null` (not `""`).

## Error handling
- **Server 422:** map each `detail[].loc` (e.g. `["body", "email"]`) to the matching field via `setError`, showing the server `msg`. Errors without a matching field go to a form-level alert.
- **Server 404 on PUT** (patient deleted meanwhile): form-level alert "This patient no longer exists" with link to the list.
- **Other 4xx/5xx:** form-level alert with `detail` text, or "Something went wrong. Please try again." if none.
- **Network failure:** form-level alert "Can't reach the server. Check your connection and try again."; form values are kept; Save can be retried.

## Acceptance criteria
- [ ] Form has personal (name, DOB, contact, address) and medical (allergies, conditions, blood type, status) fields.
- [ ] Creating a patient POSTs and lands on the new patient's detail page; editing PUTs and shows updated values.
- [ ] Client-side validation blocks submit and shows the messages above.
- [ ] Server-side 422 errors appear on the right fields when client validation is bypassed or differs.
- [ ] Network failure shows a meaningful message and preserves input.
- [ ] Zod rules match Pydantic rules (same lengths, enums, date rules).

## Test plan (vitest + MSW)
- Submit empty → required messages, no request sent.
- Future DOB, invalid email, invalid phone, last visit before DOB → messages.
- Valid create → POST body correct (nulls for empty optionals, arrays for tags) → navigates to detail.
- Edit mode pre-fills; PUT sent with changed values.
- MSW 422 with `loc: ["body","email"]` → message under email.
- MSW 422 with unknown loc → form-level alert.
- MSW network error → connection message, values retained, retry succeeds.
- Tag input adds on Enter, removes on ×, ignores duplicates and blanks.
- Backend cases are covered by 03's tests.

## Assumptions & open questions
- Same component for create and edit, separate routes.
- `last_visit` is editable in the form (follows from 02 assumption 3).

## Out of scope
Autosave, optimistic updates, address autocomplete.

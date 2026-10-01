# 09: Patient summary

**Source:** take-home Part 3 (backend task 2, frontend task 2)

## Goal
`GET /patients/{id}/summary` returns a human-readable summary built from the profile and notes (template by default, LLM when configured), and the detail view displays it.

## API
### `GET /patients/{id}/summary`
`200`:
```json
{
  "patient_id": "uuid",
  "name": "Ada Lovelace",
  "age": 40,
  "blood_type": "O+",
  "conditions": ["Hypertension"],
  "allergies": ["Penicillin"],
  "narrative": "Ada Lovelace is a 40-year-old patient (blood type O+) with an active status...",
  "note_count": 3,
  "source": "template",
  "generated_at": "2026-09-30T12:00:00Z"
}
```
`404 {"detail": "Patient not found"}`; malformed id → 422. Never 5xx because of the LLM.

- `blood_type` null → narrative says "unknown blood type".
- `source` is `"template"` or `"llm"`.

## Generation rules
- **Template (default, always available):** deterministic text from profile + notes:
  1. Identity sentence: name, age, blood type, status, last visit (or "no recorded visits").
  2. Clinical sentence: conditions and allergies, or "No known conditions" / "No known allergies".
  3. Notes narrative: count and date range of notes, then the most recent 3 notes in chronological order, each as "On <date>: <first sentence of note, max ~200 chars>". No notes → "No clinical notes have been recorded."
- **LLM (optional):** used only when `LLM_API_KEY` is set. Sends profile fields and note contents (fake seed data only in this project) with an instruction to write a concise 3–5 sentence clinical summary without inventing facts. Timeout 10s. Any error, timeout or empty output → template result with `source: "template"`. Identifiers, conditions and allergies in the response always come from the DB, not the LLM.
- Neither path logs patient fields, note content, prompts or LLM output.
- Generated on request; no caching required.

## UI (Summary section on `/patients/:id`)
- Card showing name, age, blood type, conditions and allergies chips, and the narrative paragraph. Small caption "Generated <time> · template" or "· AI-generated" depending on `source`.
- "Regenerate" button refetches. Summary query is invalidated when notes change (08).
- States: loading skeleton; error message with Retry (error in summary must not break the rest of the detail page).
- On mobile the card stacks below the profile.

## Acceptance criteria
- [ ] Summary includes name, age and blood type.
- [ ] Summary includes a coherent narrative built from the notes (and handles zero notes).
- [ ] Summary includes conditions and allergies.
- [ ] Works with no API key (template); with a key uses the LLM and falls back to template on failure.
- [ ] Detail view displays the summary with loading/error states and updates after notes change.
- [ ] `.env.example` documents `LLM_API_KEY` (and `LLM_MODEL` if used) as optional.

## Test plan
- **pytest:** unknown patient → 404; template output contains name, age, blood type, each condition and allergy; zero notes → "No clinical notes" sentence; null blood type → "unknown"; only latest 3 notes summarized, in chronological order; with key set and LLM client mocked to raise/timeout → 200 with `source: "template"`; with mocked LLM success → `source: "llm"` and DB-sourced identifiers.
- **vitest:** renders fields and narrative from mocked response; shows source caption; Regenerate refetches; 500 shows error with Retry while rest of page still renders.

## Assumptions & open questions
1. **LLM provider: Anthropic** via `LLM_API_KEY` (+ optional `LLM_MODEL`), off by default. Alternative: OpenAI or provider-agnostic. Sending patient data to a third party needs `security-privacy-reviewer` sign-off; acceptable here only because all data is fake.
2. Summary is computed on each request (no storage/caching).
3. Template summarizes the latest 3 notes.

## Out of scope
Streaming responses, storing summaries, summary history, PDF export.

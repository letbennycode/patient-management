# AI Usage

I built this with Claude Code. This page covers how I used it, what I decided myself, and where I think the AI got things wrong or over-built.

## How I worked

I set up a small pipeline of Claude Code subagents (definitions in [`.claude/agents/`](.claude/agents/)) and one set of rules ([`CLAUDE.md`](CLAUDE.md)) that every agent reads first.

| Step | Agent | What it does | Can it write app code? |
| ---- | ----- | ------------ | ---------------------- |
| 1. Spec | `spec-creator` | Turns a part of the assignment into a spec in [`docs/specs/`](docs/specs/) (API contract, UI behavior, acceptance criteria, test plan) | No |
| 2. Design | `architect` | Advises on where code should live and trade-offs | No |
| 3. Build | Claude Code, directed by me | Implements one spec chunk at a time | Yes |
| 4. Tests | `pytest-writer`, `vitest-writer` | Write tests under `backend/tests/` and next to frontend code | Tests only |
| 5. Review | `reviewer`, `security-privacy-reviewer` | Report findings; I decide what to fix | No |

The agents that review don't write code, so the thing that wrote the code isn't also grading it. The commit history shows the review loop (`Address security and privacy review findings`, `Fix stale search term and apply second review findings`).

The roadmap ([`docs/specs/00-roadmap.md`](docs/specs/00-roadmap.md)) splits the work into chunks sized for one sitting, with time estimates against the 2–4 hour budget.

## Decisions I made

<!-- Edit this section so it's in your own words. Keep only the ones that are true for you. -->

- **Stack and conventions** (`CLAUDE.md`): I picked the stack and the rules before any code was written. Examples: all server calls go through `src/api/` and TanStack Query, Zustand only for UI state, Pydantic schemas separate from ORM models, a separate Postgres database for tests (never SQLite).
- **Patient data rules:** fake data only, and never log patient fields or note contents. I wrote these into `CLAUDE.md` so every agent had to follow them, and ran the security reviewer over anything that touched patient data.
- **Search term kept out of the URL.** Names are PHI, so the search term lives in router history state instead of the query string. Sort, filter and page are in the URL.
- **Template summary first, LLM optional.** The summary works offline and deterministically. The LLM only runs if `LLM_SUMMARY_ENABLED=true` and a key is set, and any failure falls back to the template.
- **Derived `age`, UUID primary keys, hard delete.** Listed under Assumptions in the README.
- **Scope:** I chose a few of the stretch items like light/dark mode that are easily enabled by packages. Using an LLM also helped with guiding the pipeline creation that was deployed to GitHub actions.

## Where I think the AI over-built

- **`services/redaction.py`.** The regex PHI scrubber for the optional LLM path is more than this task needs but I asked for this specifically since in a production use case, what you feed AI is still important.


## What I'd do differently

Use fewer, smaller specs and keep the first commit smaller so the history shows the work in steps.
I followed the 4 hour build time, so some of this may have become more verbose then I'd like because I really wanted to hit the stretch goals. While I was continuously in the loop, ran all tests and code, reviewed files manually, this is an agentic build, so in a 4 hour time crunch I'm sure there can be some gaps when you try to hit most of the boxes.

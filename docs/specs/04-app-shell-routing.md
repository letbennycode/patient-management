# 04: App shell + routing

**Source:** take-home Part 2 (tasks 2 and 4, responsive requirement)

## Goal
A responsive layout (header, sidebar, main content) and all top-level routes, including a simple dashboard home and a 404 page.

## Routes
| Path | Screen | Built in |
|---|---|---|
| `/` | Dashboard home | this chunk |
| `/patients` | Patient list | 05 (placeholder here) |
| `/patients/new` | Create patient form | 07 (placeholder here) |
| `/patients/:id` | Patient detail | 06 (placeholder here) |
| `/patients/:id/edit` | Edit patient form | 07 (placeholder here) |
| `*` | 404 Not found | this chunk |

`/patients/new` must be matched before `/patients/:id`.

## UI
- **Header:** app name (links to `/`), primary nav links (Dashboard, Patients), "New patient" button. Active link is visually indicated.
- **Sidebar:** same nav links. On widths ≥ `md` (768px) it is always visible; below that it is hidden and opened from a header menu button as a drawer/sheet, closing on navigation or outside click/Escape.
- **Main content:** renders the current route; scrolls independently; has a page title per route (also set as `document.title`).
- **Dashboard home (`/`):** total patient count and count per status as cards (each links to `/patients?status=<value>`), plus a link to the full list. Data comes from `GET /patients?page_size=1` (total) and `GET /patients?status=<s>&page_size=1` per status via TanStack Query hooks in `src/api/`. Loading: skeleton cards. Error: message with Retry. Empty (total 0): "No patients yet" with link to create one.
- **404 page:** "Page not found" message and link back to `/`. Rendered inside the layout.
- Layout works at 360px wide with no horizontal scroll.
- Optional: route-level `React.lazy` code splitting (stretch, Performance).

## Acceptance criteria
- [ ] Header with navigation, sidebar and main content area are present on every route.
- [ ] Routes `/`, `/patients`, `/patients/:id` and a catch-all 404 exist.
- [ ] At 360px the sidebar collapses into a toggleable drawer and nothing overflows horizontally.
- [ ] Dashboard home shows total and per-status counts with loading, empty and error states.
- [ ] Unknown paths render the 404 page.

## Test plan (vitest + MSW)
- Navigating to `/` renders dashboard counts from mocked responses; loading skeleton before data; error state with Retry on 500 and retry refetches.
- Unknown route renders 404 with link home.
- Clicking "Patients" nav link navigates to `/patients` and marks it active.
- Mobile: menu button opens the sidebar drawer; selecting a link closes it.

## Assumptions & open questions
- Dashboard home content is not defined by the assignment; status counts are a cheap, useful default using the existing list endpoint (no new stats endpoint).
- Header and sidebar duplicating nav is accepted; the header carries the mobile menu toggle and global actions.

## Out of scope
Theme toggle (stretch 11), status chart visualisation, auth/user menu.

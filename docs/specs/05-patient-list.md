# 05: Patient list UI

**Source:** take-home Part 2 (task 3; requirements: 100+ efficiently, non-blocking search, responsive)

## Goal
The `/patients` page lists patients from `GET /patients` with search, status filter, sorting and pagination, staying smooth with 100+ patients and on small screens.

## UI
- **Columns/fields per patient:** name ("First Last"), age, last visit (formatted date, "Never" if null), status (colored badge). Each row/card links to `/patients/:id`.
- **Layout:** table on ≥ `md`; stacked cards below `md` (360px friendly).
- **Controls:**
  - Search input (placeholder "Search by name"). Input stays responsive while typing; the query fires after a ~300ms debounce. Previous results stay visible (`placeholderData: keepPreviousData`) with a subtle "updating" indicator instead of a blocking spinner.
  - Status filter select: All, Active, Inactive, Critical.
  - Sort: clickable column headers on table (toggle asc/desc, with indicator) and a sort select on mobile. Fields: name, age, last visit, status.
  - Pagination: Previous/Next, "Page X of Y", "Showing a–b of total", page size select (10, 20, 50).
- **URL state:** `status`, `sort`, `order`, `page`, `page_size` live in the query string so the view is shareable and survives back/forward. `search` is PHI (names), so it is **not** in the URL: it lives in the list entry's router history state (restored by back/forward and by the detail page's back link, empty for any fresh navigation to the list). Changing search, filter, sort or page size resets `page` to 1. Invalid URL values fall back to defaults.
- **States:**
  - Loading (first load): skeleton rows.
  - Empty, no filters: "No patients yet" + "New patient" button.
  - Empty with filters/search: "No patients match your search" + "Clear filters".
  - Error: message from `ApiError.detail` or "Can't reach the server" for network errors, with Retry.
- "New patient" button links to `/patients/new`.

## Performance
- Server-side pagination means the DOM only holds one page (max 100 rows).
- Row component memoized; search input state is local, the debounced value drives the query.
- Virtualization is stretch 12.

## Acceptance criteria
- [ ] Each patient shows name, age, last visit and status.
- [ ] Search filters by name, is debounced and never blocks typing; old results stay visible while loading.
- [ ] Status filter works and combines with search.
- [ ] Sorting by name, age, last visit and status in both directions works.
- [ ] Pagination works through all 120 seeded patients; totals are correct.
- [ ] Filter/sort/page state is in the URL; reload restores it.
- [ ] Loading, empty, no-results and error states render as described.
- [ ] Usable at 360px wide (cards, no horizontal scroll).
- [ ] All requests go through `src/api/` hooks.

## Test plan (vitest + MSW)
- Renders rows from mocked page; shows "Never" for null last visit; status badge text.
- Typing in search: input updates immediately; only one request after debounce (fake timers) with `search` param; previous rows remain during the fetch.
- Status filter sends `status` and resets page to 1.
- Clicking the name header toggles `order` asc/desc.
- Next/Previous change `page`; Previous disabled on page 1, Next disabled on last page.
- Initial URL `?status=critical&page=2` is reflected in controls and the request.
- Empty states (with and without filters), 500 error state with Retry, network error message.

## Assumptions & open questions
- Pagination (not infinite scroll), default page size 20.
- Debounce 300ms.

## Out of scope
Virtualization (stretch 12), multi-field advanced filters, bulk actions.

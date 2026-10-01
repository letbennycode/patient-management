# 12: STRETCH: Virtualized patient list

**Source:** take-home stretch: Performance Optimization, virtualization for large lists

Only build if required chunks 01–10 are done.

## Goal
Keep the patient list smooth when many rows are rendered at once, using TanStack Virtual.

## Behaviour
- Add page size option 100 (the API max) to the list (05).
- Rows (table) and cards (mobile) render through TanStack Virtual inside a fixed-height scroll container; only visible rows plus a small overscan are in the DOM.
- Keyboard navigation and links still work; table header stays sticky; screen readers get correct row count (`aria-rowcount`).
- All other list behaviour (search, sort, filter, URL state, states) unchanged.

## Acceptance criteria
- [ ] With page size 100, the DOM holds far fewer than 100 row elements at any time.
- [ ] Scrolling through all rows shows every patient in order.
- [ ] Existing 05 tests still pass.

## Test plan (vitest)
- With 100 mocked patients and a mocked container size, fewer than 100 rows are rendered; first row visible. (jsdom lacks layout; mock element sizes or `getBoundingClientRect`.)

## Assumptions
- Virtualization is applied within a page, not as infinite scroll across the API.

## Out of scope
Infinite scroll, cursor pagination.

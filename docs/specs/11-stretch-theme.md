# 11: STRETCH: Theme switching

**Source:** take-home stretch: Advanced UI/UX, dark/light theme switching

Only build if required chunks 01–10 are done.

## Goal
Users can switch between light, dark and system themes from the header.

## UI
- Header toggle with three options: Light, Dark, System. Default System (follows `prefers-color-scheme`, reacts to OS changes).
- Choice stored in a Zustand store persisted to `localStorage`; applied as the `dark` class on `<html>` before first paint to avoid a flash.
- All shadcn/ui components and status badges are legible in both themes (WCAG AA contrast for text).

## Acceptance criteria
- [ ] Toggle switches theme immediately on every page.
- [ ] Choice persists across reloads; System follows OS setting.
- [ ] No flash of the wrong theme on load.

## Test plan (vitest)
- Selecting Dark adds `dark` class to `document.documentElement` and writes to localStorage; Light removes it.
- System with mocked `matchMedia` dark → `dark` class applied.

## Out of scope
Custom color themes, per-user server-side preference.

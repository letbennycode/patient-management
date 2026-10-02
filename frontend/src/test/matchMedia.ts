import { vi } from 'vitest'

interface MediaState {
  width: number
  prefersDark: boolean
}

/**
 * jsdom has no `window.matchMedia`. This stub evaluates `min-width` / `max-width` and
 * `prefers-color-scheme` queries against a fake viewport, and `set()` fires `change`
 * listeners so code subscribed to the query re-renders.
 * Installed with desktop defaults before every test (setup.ts); call again to override.
 */
export function mockMatchMedia(initial: Partial<MediaState> = {}) {
  const state: MediaState = { width: 1024, prefersDark: false, ...initial }
  const lists = new Set<{ query: string; last: boolean; listeners: Set<() => void> }>()

  const evaluate = (query: string): boolean => {
    let recognised = false
    let result = true
    for (const [, kind, px] of query.matchAll(/\((min|max)-width:\s*(\d+)px\)/g)) {
      recognised = true
      result &&= kind === 'min' ? state.width >= Number(px) : state.width <= Number(px)
    }
    const scheme = /prefers-color-scheme:\s*(dark|light)/.exec(query)
    if (scheme) {
      recognised = true
      result &&= (scheme[1] === 'dark') === state.prefersDark
    }
    return recognised && result
  }

  vi.stubGlobal('matchMedia', (query: string) => {
    const entry = { query, last: evaluate(query), listeners: new Set<() => void>() }
    lists.add(entry)
    return {
      media: query,
      get matches() {
        return evaluate(query)
      },
      onchange: null,
      addEventListener: (_: string, cb: () => void) => entry.listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => entry.listeners.delete(cb),
      addListener: (cb: () => void) => entry.listeners.add(cb),
      removeListener: (cb: () => void) => entry.listeners.delete(cb),
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  })

  return {
    set(next: Partial<MediaState>) {
      Object.assign(state, next)
      for (const entry of lists) {
        const now = evaluate(entry.query)
        if (now === entry.last) continue
        entry.last = now
        entry.listeners.forEach((cb) => cb())
      }
    },
  }
}

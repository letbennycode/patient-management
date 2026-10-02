import { useSyncExternalStore } from 'react'

/** Subscribes to a CSS media query. Uses `fallback` where matchMedia is missing (jsdom). */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia?.(query)
      mql?.addEventListener('change', onChange)
      return () => mql?.removeEventListener('change', onChange)
    },
    () => window.matchMedia?.(query).matches ?? fallback,
    () => fallback,
  )
}

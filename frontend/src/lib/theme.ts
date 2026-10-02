import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'theme' },
  ),
)

const prefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

export function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && prefersDark())
  document.documentElement.classList.toggle('dark', dark)
}

/** Applies the stored theme now and keeps it in sync with store and OS changes. */
export function initTheme() {
  applyTheme(useThemeStore.getState().theme)
  useThemeStore.subscribe((state) => applyTheme(state.theme))
  window
    .matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener('change', () => applyTheme(useThemeStore.getState().theme))
}

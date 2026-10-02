import './storage' // must stay first: fixes localStorage before app modules load
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { useThemeStore } from '@/lib/theme'
import { mockMatchMedia } from './matchMedia'
import { server } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// jsdom has no matchMedia (sonner and useMediaQuery need it): default to a light desktop.
beforeEach(() => {
  mockMatchMedia()
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  server.events.removeAllListeners()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  useThemeStore.setState({ theme: 'system' })
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

afterAll(() => server.close())

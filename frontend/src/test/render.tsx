import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import {
  type InitialEntry,
  type Location,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'

interface Options {
  /** Initial URL, e.g. `/patients?status=critical`, or `{ pathname, state }`. */
  route?: InitialEntry
  /** Route pattern for `ui`, e.g. `/patients/:id`, so `useParams` works. Omit for <App />. */
  path?: string
}

function LocationProbe({ onChange }: { onChange: (location: Location) => void }) {
  onChange(useLocation())
  return null
}

/**
 * Renders `ui` inside a fresh QueryClient (no retries, so error tests settle immediately)
 * and a MemoryRouter. `location()` returns the current router location, so tests can
 * assert on navigation and query strings without rendering destination pages.
 */
export function renderWithProviders(ui: ReactElement, { route = '/', path }: Options = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let current: Location | undefined
  const tree = path ? (
    <Routes>
      <Route path={path} element={ui} />
      <Route path="*" element={null} />
    </Routes>
  ) : (
    ui
  )

  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {tree}
        <LocationProbe onChange={(location) => (current = location)} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...result, queryClient, location: () => current! }
}

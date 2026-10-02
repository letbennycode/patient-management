import { screen } from '@testing-library/react'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { renderWithProviders } from '@/test/render'

function Boom(): never {
  throw new Error('chunk failed')
}

describe('RouteErrorBoundary', () => {
  it('shows an error with a reload button instead of a blank screen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderWithProviders(
      <RouteErrorBoundary>
        <Boom />
      </RouteErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})

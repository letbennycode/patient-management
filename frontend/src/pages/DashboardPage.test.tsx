import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { makePage } from '@/test/fixtures'
import { API } from '@/test/handlers'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'
import DashboardPage from './DashboardPage'

const COUNTS: Record<string, number> = { all: 120, active: 70, inactive: 38, critical: 12 }

/** Answers `GET /patients?page_size=1[&status=x]` with only the total, like the real API. */
function useCounts(counts = COUNTS) {
  server.use(
    http.get(`${API}/patients`, ({ request }) => {
      const status = new URL(request.url).searchParams.get('status') ?? 'all'
      return HttpResponse.json(makePage([], { total: counts[status], page_size: 1 }))
    }),
  )
}

const countFor = (label: string) => screen.getByRole('link', { name: `${label} patients` })

describe('DashboardPage', () => {
  it('shows skeletons while loading, then total and per-status counts', async () => {
    useCounts()
    renderWithProviders(<DashboardPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getAllByTestId('count-skeleton')).toHaveLength(4)

    await waitFor(() => expect(screen.queryByTestId('count-skeleton')).not.toBeInTheDocument())
    expect(countFor('Total')).toHaveTextContent('120')
    expect(countFor('Active')).toHaveTextContent('70')
    expect(countFor('Inactive')).toHaveTextContent('38')
    expect(countFor('Critical')).toHaveTextContent('12')
  })

  it('shows a status distribution chart with percentages', async () => {
    useCounts()
    renderWithProviders(<DashboardPage />)

    expect(
      await screen.findByRole('img', { name: /active: 70, inactive: 38, critical: 12/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('70 (58%)')).toBeInTheDocument()
  })

  it('links each card to the list filtered by its status', async () => {
    useCounts()
    renderWithProviders(<DashboardPage />)
    await screen.findByText('120')

    expect(countFor('Total')).toHaveAttribute('href', '/patients')
    expect(countFor('Critical')).toHaveAttribute('href', '/patients?status=critical')
    expect(screen.getByRole('link', { name: 'View all patients' })).toHaveAttribute(
      'href',
      '/patients',
    )
  })

  it('shows an empty state with a create link when there are no patients', async () => {
    useCounts({ all: 0, active: 0, inactive: 0, critical: 0 })
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('No patients yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create the first patient' })).toHaveAttribute(
      'href',
      '/patients/new',
    )
  })

  it('shows the error with Retry on 500, and Retry refetches', async () => {
    const user = userEvent.setup()
    // Several count requests fire in parallel, so fail by flag rather than `{ once: true }`.
    let failing = true
    server.use(
      http.get(`${API}/patients`, ({ request }) => {
        if (failing) return HttpResponse.json({ detail: 'Database unavailable' }, { status: 500 })
        const status = new URL(request.url).searchParams.get('status') ?? 'all'
        return HttpResponse.json(makePage([], { total: COUNTS[status], page_size: 1 }))
      }),
    )
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
    failing = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(countFor('Total')).toHaveTextContent('120'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

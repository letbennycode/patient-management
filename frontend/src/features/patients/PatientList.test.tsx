import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { Patient } from '@/api/types'
import { NETWORK_MESSAGE } from '@/lib/errors'
import { makePage, makePatient, makePatients } from '@/test/fixtures'
import { API } from '@/test/handlers'
import { mockMatchMedia } from '@/test/matchMedia'
import { renderWithProviders } from '@/test/render'
import { recordRequests, server } from '@/test/server'
import { PatientList } from './PatientList'

/** Serves `patients` with server-side search, status filter and pagination, like the API. */
function serve(patients: Patient[]) {
  server.use(
    http.get(`${API}/patients`, ({ request }) => {
      const sp = new URL(request.url).searchParams
      const search = sp.get('search')?.toLowerCase()
      const status = sp.get('status')
      const page = Number(sp.get('page') ?? 1)
      const pageSize = Number(sp.get('page_size') ?? 20)
      const matches = patients.filter(
        (p) =>
          (!search || `${p.first_name} ${p.last_name}`.toLowerCase().includes(search)) &&
          (!status || p.status === status),
      )
      const items = matches.slice((page - 1) * pageSize, page * pageSize)
      return HttpResponse.json(
        makePage(items, { total: matches.length, page, page_size: pageSize }),
      )
    }),
  )
}

const listRequests = (requests: ReturnType<typeof recordRequests>) =>
  requests.filter((r) => r.method === 'GET' && r.url.pathname === '/patients')
const lastParams = (requests: ReturnType<typeof recordRequests>) =>
  listRequests(requests).at(-1)!.url.searchParams

function renderList(route = '/patients') {
  return renderWithProviders(<PatientList />, { route, path: '/patients' })
}

const alpha = makePatient({ first_name: 'Alpha', last_name: 'Tester', age: 34, status: 'active' })
const bravo = makePatient({
  first_name: 'Bravo',
  last_name: 'Tester',
  age: 71,
  status: 'critical',
  last_visit: null,
})

describe('PatientList', () => {
  it('shows a skeleton, then a row per patient with name link, age, last visit and status', async () => {
    serve([alpha, bravo])
    renderList()

    expect(screen.getByTestId('list-skeleton')).toBeInTheDocument()
    const link = await screen.findByRole('link', { name: 'Alpha Tester' })
    expect(link).toHaveAttribute('href', `/patients/${alpha.id}`)

    const alphaRow = link.closest('tr')!
    expect(within(alphaRow).getByText('34')).toBeInTheDocument()
    expect(within(alphaRow).getByText('5 Mar 2026')).toBeInTheDocument()
    expect(within(alphaRow).getByText('Active')).toBeInTheDocument()

    const bravoRow = screen.getByRole('link', { name: 'Bravo Tester' }).closest('tr')!
    expect(within(bravoRow).getByText('Never')).toBeInTheDocument()
    expect(within(bravoRow).getByText('Critical')).toBeInTheDocument()
  })

  it('requests the first page sorted by name ascending by default', async () => {
    serve([alpha])
    const requests = recordRequests()
    renderList()
    await screen.findByRole('link', { name: 'Alpha Tester' })

    expect(Object.fromEntries(lastParams(requests))).toEqual({
      page: '1',
      page_size: '20',
      sort: 'name',
      order: 'asc',
    })
  })

  describe('search', () => {
    it('updates the input immediately, sends one debounced request and keeps old rows meanwhile', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      serve([alpha, bravo])
      // Hold the search response so we can observe the in-between state.
      let release!: () => void
      const held = new Promise<void>((resolve) => (release = resolve))
      server.use(
        http.get(`${API}/patients`, async ({ request }) => {
          if (!new URL(request.url).searchParams.has('search')) return undefined // fall through
          await held
          return HttpResponse.json(makePage([bravo]))
        }),
      )
      const requests = recordRequests()
      const { location } = renderList()
      await screen.findByRole('link', { name: 'Alpha Tester' })

      const input = screen.getByRole('searchbox', { name: 'Search patients' })
      await user.type(input, 'bra')
      expect(input).toHaveValue('bra')
      const searched = () => listRequests(requests).filter((r) => r.url.searchParams.has('search'))
      expect(searched()).toHaveLength(0)

      await act(() => vi.advanceTimersByTime(300))
      await waitFor(() => expect(searched()).toHaveLength(1))
      expect(searched()[0].url.searchParams.get('search')).toBe('bra')
      expect(searched()[0].url.searchParams.get('page')).toBe('1')
      expect(location().search).toBe('?search=bra')

      // Previous results stay visible with a non-blocking indicator.
      expect(screen.getByRole('link', { name: 'Alpha Tester' })).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('Updating…')

      release()
      await waitFor(() =>
        expect(screen.queryByRole('link', { name: 'Alpha Tester' })).not.toBeInTheDocument(),
      )
      expect(screen.getByRole('link', { name: 'Bravo Tester' })).toBeInTheDocument()
      expect(searched()).toHaveLength(1)
    })
  })

  it('status filter sends `status` and resets to page 1', async () => {
    const user = userEvent.setup()
    serve([...makePatients(60), ...makePatients(3, { status: 'critical', first_name: 'Crit' })])
    const requests = recordRequests()
    const { location } = renderList('/patients?page=3')
    await screen.findByText('Page 3 of 4')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'critical')

    await screen.findByText('Page 1 of 1')
    expect(lastParams(requests).get('status')).toBe('critical')
    expect(lastParams(requests).get('page')).toBe('1')
    expect(location().search).toBe('?status=critical')
    expect(screen.getAllByRole('link', { name: /^Crit / })).toHaveLength(3)
  })

  it('clicking a column header sorts by it, and clicking again toggles the order', async () => {
    const user = userEvent.setup()
    serve([alpha, bravo])
    const requests = recordRequests()
    renderList()
    await screen.findByRole('link', { name: 'Alpha Tester' })

    const nameHeader = screen.getByRole('columnheader', { name: 'Name' })
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')

    await user.click(within(nameHeader).getByRole('button', { name: 'Name' }))
    await waitFor(() => expect(lastParams(requests).get('order')).toBe('desc'))
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'descending',
    )

    await user.click(screen.getByRole('button', { name: 'Name' }))
    await waitFor(() => expect(lastParams(requests).get('order')).toBe('asc'))

    await user.click(screen.getByRole('button', { name: 'Age' }))
    await waitFor(() => expect(lastParams(requests).get('sort')).toBe('age'))
    expect(lastParams(requests).get('order')).toBe('asc')
    expect(screen.getByRole('columnheader', { name: 'Age' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
  })

  describe('pagination', () => {
    it('Next/Previous change the page and are disabled at the ends', async () => {
      const user = userEvent.setup()
      serve(makePatients(45))
      const requests = recordRequests()
      renderList()

      await screen.findByText('Showing 1–20 of 45')
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: 'Next' }))
      await screen.findByText('Page 2 of 3')
      expect(lastParams(requests).get('page')).toBe('2')
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()

      await user.click(screen.getByRole('button', { name: 'Next' }))
      await screen.findByText('Showing 41–45 of 45')
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: 'Previous' }))
      await screen.findByText('Page 2 of 3')
      expect(lastParams(requests).get('page')).toBe('2')
    })

    it('changing the page size requests it and resets to page 1', async () => {
      const user = userEvent.setup()
      serve(makePatients(45))
      const requests = recordRequests()
      const { location } = renderList('/patients?page=2')
      await screen.findByText('Page 2 of 3')

      await user.selectOptions(screen.getByLabelText('Per page'), '50')

      await screen.findByText('Page 1 of 1')
      expect(lastParams(requests).get('page_size')).toBe('50')
      expect(lastParams(requests).get('page')).toBe('1')
      expect(location().search).toBe('?page_size=50')
    })
  })

  it('reflects an initial ?status=critical&page=2 URL in the controls and the request', async () => {
    serve(makePatients(30, { status: 'critical' }))
    const requests = recordRequests()
    renderList('/patients?status=critical&page=2')

    await screen.findByText('Page 2 of 2')
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toHaveValue('critical')
    expect(listRequests(requests)[0].url.searchParams.get('status')).toBe('critical')
    expect(listRequests(requests)[0].url.searchParams.get('page')).toBe('2')
    expect(screen.getByText('Showing 21–30 of 30')).toBeInTheDocument()
  })

  it('falls back to defaults for invalid URL values', async () => {
    serve([alpha])
    const requests = recordRequests()
    renderList('/patients?page=-4&page_size=7&sort=bogus&order=sideways&status=zombie')
    await screen.findByRole('link', { name: 'Alpha Tester' })

    expect(Object.fromEntries(listRequests(requests)[0].url.searchParams)).toEqual({
      page: '1',
      page_size: '20',
      sort: 'name',
      order: 'asc',
    })
  })

  describe('empty states', () => {
    it('without filters shows "No patients yet" and a create link', async () => {
      serve([])
      renderList()
      expect(await screen.findByText('No patients yet')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'New patient' })).toHaveAttribute(
        'href',
        '/patients/new',
      )
      expect(screen.queryByText(/^Showing/)).not.toBeInTheDocument()
    })

    it('with filters shows "No patients match" and Clear filters resets them', async () => {
      const user = userEvent.setup()
      serve([alpha, bravo])
      const requests = recordRequests()
      const { location } = renderList('/patients?search=zzz&status=inactive')

      expect(await screen.findByText('No patients match your search')).toBeInTheDocument()
      expect(screen.getByRole('searchbox', { name: 'Search patients' })).toHaveValue('zzz')

      await user.click(screen.getByRole('button', { name: 'Clear filters' }))

      expect(await screen.findByRole('link', { name: 'Alpha Tester' })).toBeInTheDocument()
      expect(location().search).toBe('')
      expect(lastParams(requests).has('search')).toBe(false)
      expect(lastParams(requests).has('status')).toBe(false)
      expect(screen.getByRole('searchbox', { name: 'Search patients' })).toHaveValue('')
      expect(screen.getByRole('combobox', { name: 'Filter by status' })).toHaveValue('')
    })
  })

  describe('errors', () => {
    it('shows the API detail on 500 and Retry refetches', async () => {
      const user = userEvent.setup()
      serve([alpha])
      server.use(
        http.get(
          `${API}/patients`,
          () => HttpResponse.json({ detail: 'Database unavailable' }, { status: 500 }),
          { once: true },
        ),
      )
      renderList()

      expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
      await user.click(screen.getByRole('button', { name: 'Retry' }))

      expect(await screen.findByRole('link', { name: 'Alpha Tester' })).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('shows a connection message on network failure', async () => {
      server.use(http.get(`${API}/patients`, () => HttpResponse.error()))
      renderList()
      expect(await screen.findByRole('alert')).toHaveTextContent(NETWORK_MESSAGE)
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })
  })

  describe('narrow screens', () => {
    beforeEach(() => {
      mockMatchMedia({ width: 360 })
    })

    it('renders cards instead of a table', async () => {
      serve([alpha, bravo])
      renderList()

      const card = await screen.findByRole('link', { name: /Alpha Tester/ })
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(card).toHaveAttribute('href', `/patients/${alpha.id}`)
      expect(card).toHaveTextContent('34 years · Last visit: 5 Mar 2026')
      expect(card).toHaveTextContent('Active')
      expect(screen.getByRole('link', { name: /Bravo Tester/ })).toHaveTextContent(
        'Last visit: Never',
      )
    })

    it('sorts with the sort select and order button', async () => {
      const user = userEvent.setup()
      serve([alpha, bravo])
      const requests = recordRequests()
      renderList()
      await screen.findByRole('link', { name: /Alpha Tester/ })

      await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'last_visit')
      await waitFor(() => expect(lastParams(requests).get('sort')).toBe('last_visit'))

      await user.click(screen.getByRole('button', { name: 'Ascending' }))
      await waitFor(() => expect(lastParams(requests).get('order')).toBe('desc'))
      expect(screen.getByRole('button', { name: 'Descending' })).toBeInTheDocument()
    })

    it('switches layout live when the viewport crosses the breakpoint', async () => {
      const media = mockMatchMedia({ width: 360 })
      serve([alpha])
      renderList()
      await screen.findByRole('link', { name: /Alpha Tester/ })
      expect(screen.queryByRole('table')).not.toBeInTheDocument()

      act(() => media.set({ width: 1024 }))
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
  })

  describe('virtualization (page size 100)', () => {
    const ROW_HEIGHT = 56
    const VIEWPORT = 560 // room for ~10 rows

    beforeEach(() => {
      // jsdom has no layout: give rows (they carry data-index) and the scroll box real sizes.
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.dataset.index !== undefined ? ROW_HEIGHT : VIEWPORT
      })
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1024)
    })

    it('renders far fewer than 100 rows, starting with the first patient', async () => {
      serve(makePatients(100))
      renderList('/patients?page_size=100')

      expect(await screen.findByRole('link', { name: 'Row Number1' })).toBeInTheDocument()
      const table = screen.getByRole('table')
      // Screen readers still get the full count.
      expect(table).toHaveAttribute('aria-rowcount', '101')

      const dataRows = within(table)
        .getAllByRole('row')
        .filter((row) => row.hasAttribute('data-index'))
      expect(dataRows.length).toBeGreaterThan(0)
      expect(dataRows.length).toBeLessThan(30)
      expect(screen.queryByRole('link', { name: 'Row Number100' })).not.toBeInTheDocument()
    })

    it('renders every row when the page is small enough not to virtualize', async () => {
      serve(makePatients(50))
      renderList('/patients?page_size=50')

      await screen.findByRole('link', { name: 'Row Number1' })
      expect(screen.getByRole('link', { name: 'Row Number50' })).toBeInTheDocument()
    })
  })
})

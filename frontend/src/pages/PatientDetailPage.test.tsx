import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { Patient } from '@/api/types'
import { makePatient } from '@/test/fixtures'
import { API } from '@/test/handlers'
import { renderWithProviders } from '@/test/render'
import { recordRequests, server } from '@/test/server'
import PatientDetailPage from './PatientDetailPage'

const full = makePatient({
  first_name: 'Delta',
  last_name: 'Fixture',
  date_of_birth: '1980-04-12',
  age: 46,
  status: 'critical',
  email: 'delta@example.test',
  phone: '+1 555 0199',
  address_line1: '9 Mock Street',
  address_line2: 'Unit 4',
  city: 'Testville',
  state: 'TS',
  postal_code: '99999',
  blood_type: 'AB-',
  allergies: ['Latex', 'Peanuts'],
  conditions: ['Asthma'],
  last_visit: '2026-03-05',
})

const sparse = makePatient({
  first_name: 'Echo',
  last_name: 'Fixture',
  email: null,
  phone: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  postal_code: null,
  blood_type: null,
  allergies: [],
  conditions: [],
  last_visit: null,
})

function servePatient(patient: Patient) {
  server.use(http.get(`${API}/patients/${patient.id}`, () => HttpResponse.json(patient)))
}

function renderDetail(id: string, state?: unknown) {
  return renderWithProviders(<PatientDetailPage />, {
    route: { pathname: `/patients/${id}`, state },
    path: '/patients/:id',
  })
}

/** The <dd> paired with a <dt> label in the profile cards. */
function fieldValue(card: HTMLElement, label: string) {
  return within(card).getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement
}

const card = (title: string) => screen.getByText(title).closest('[data-slot="card"]') as HTMLElement

describe('PatientDetailPage', () => {
  it('shows a skeleton, then the full profile', async () => {
    servePatient(full)
    renderDetail(full.id)

    expect(screen.getByTestId('detail-skeleton')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Delta Fixture' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Delta Fixture · Patient Management')
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('46 years old')).toBeInTheDocument()
    expect(screen.getByText('Born 12 Apr 1980')).toBeInTheDocument()

    const contact = card('Contact')
    expect(fieldValue(contact, 'Email')).toHaveTextContent('delta@example.test')
    expect(fieldValue(contact, 'Phone')).toHaveTextContent('+1 555 0199')
    expect(fieldValue(contact, 'Address')).toHaveTextContent(
      '9 Mock StreetUnit 4Testville, TS, 99999',
    )

    const medical = card('Medical')
    expect(fieldValue(medical, 'Blood type')).toHaveTextContent('AB-')
    expect(
      within(fieldValue(medical, 'Allergies'))
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Latex', 'Peanuts'])
    expect(fieldValue(medical, 'Conditions')).toHaveTextContent('Asthma')
    expect(fieldValue(medical, 'Last visit')).toHaveTextContent('5 Mar 2026')
  })

  it('shows fallbacks for missing data: Unknown, None recorded, Never, Not provided', async () => {
    servePatient(sparse)
    renderDetail(sparse.id)
    await screen.findByRole('heading', { level: 1, name: 'Echo Fixture' })

    const contact = card('Contact')
    expect(fieldValue(contact, 'Email')).toHaveTextContent('Not provided')
    expect(fieldValue(contact, 'Phone')).toHaveTextContent('Not provided')
    expect(fieldValue(contact, 'Address')).toHaveTextContent('Not provided')

    const medical = card('Medical')
    expect(fieldValue(medical, 'Blood type')).toHaveTextContent('Unknown')
    expect(fieldValue(medical, 'Allergies')).toHaveTextContent('None recorded')
    expect(fieldValue(medical, 'Conditions')).toHaveTextContent('None recorded')
    expect(fieldValue(medical, 'Last visit')).toHaveTextContent('Never')
  })

  it.each([
    [404, 'Patient not found'],
    [422, [{ loc: ['path', 'id'], msg: 'Input should be a valid UUID' }]],
  ])('shows "Patient not found" on %i', async (status, detail) => {
    server.use(http.get(`${API}/patients/:id`, () => HttpResponse.json({ detail }, { status })))
    renderDetail('not-a-uuid')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Patient not found' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to patients' })).toHaveAttribute(
      'href',
      '/patients',
    )
  })

  it('shows other errors with Retry, which refetches', async () => {
    const user = userEvent.setup()
    servePatient(full)
    server.use(
      http.get(
        `${API}/patients/:id`,
        () => HttpResponse.json({ detail: 'Boom' }, { status: 500 }),
        {
          once: true,
        },
      ),
    )
    renderDetail(full.id)

    expect(await screen.findByRole('alert')).toHaveTextContent('Boom')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Delta Fixture' }),
    ).toBeInTheDocument()
  })

  it('links back to the list preserving its query string, and to the edit form', async () => {
    servePatient(full)
    renderDetail(full.id, { from: '?status=critical&page=2' })
    await screen.findByRole('heading', { level: 1, name: 'Delta Fixture' })

    expect(screen.getByRole('link', { name: 'Back to patients' })).toHaveAttribute(
      'href',
      '/patients?status=critical&page=2',
    )
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/patients/${full.id}/edit`,
    )
  })

  it('keeps the profile visible when the summary fails', async () => {
    servePatient(full)
    server.use(
      http.get(`${API}/patients/:id/summary`, () =>
        HttpResponse.json({ detail: 'Summary failed' }, { status: 500 }),
      ),
    )
    renderDetail(full.id)

    await screen.findByRole('heading', { level: 1, name: 'Delta Fixture' })
    expect(await screen.findByText('Summary failed')).toBeInTheDocument()
    expect(card('Contact')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'New note' })).toBeInTheDocument()
  })

  describe('delete', () => {
    async function openDialog() {
      const user = userEvent.setup()
      servePatient(full)
      const requests = recordRequests()
      const utils = renderDetail(full.id)
      await screen.findByRole('heading', { level: 1, name: 'Delta Fixture' })
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      const dialog = await screen.findByRole('dialog', { name: 'Delete patient' })
      const deletes = () => requests.filter((r) => r.method === 'DELETE')
      return { user, dialog, deletes, ...utils }
    }

    it('asks for confirmation, and Cancel does nothing', async () => {
      const { user, dialog, deletes, location } = await openDialog()

      expect(dialog).toHaveTextContent(
        "Delete Delta Fixture? This also deletes their notes and can't be undone.",
      )
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Delete patient' })).not.toBeInTheDocument(),
      )
      expect(deletes()).toHaveLength(0)
      expect(location().pathname).toBe(`/patients/${full.id}`)
    })

    it('confirm sends DELETE and navigates to /patients', async () => {
      server.use(http.delete(`${API}/patients/:id`, () => new HttpResponse(null, { status: 204 })))
      const { user, dialog, deletes, location } = await openDialog()

      await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

      await waitFor(() => expect(location().pathname).toBe('/patients'))
      expect(deletes()).toHaveLength(1)
      expect(deletes()[0].url.pathname).toBe(`/patients/${full.id}`)
    })

    it('a failed DELETE keeps the user on the page and shows the error', async () => {
      server.use(
        http.delete(`${API}/patients/:id`, () =>
          HttpResponse.json({ detail: 'Could not delete patient' }, { status: 500 }),
        ),
      )
      const { user, dialog, location } = await openDialog()

      await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

      expect(await within(dialog).findByText('Could not delete patient')).toBeInTheDocument()
      expect(location().pathname).toBe(`/patients/${full.id}`)
      expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeEnabled()
    })
  })
})

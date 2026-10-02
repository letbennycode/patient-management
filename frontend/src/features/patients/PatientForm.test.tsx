import { screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { PatientInput } from '@/api/types'
import { GENERIC_MESSAGE, NETWORK_MESSAGE } from '@/lib/errors'
import { makePatient } from '@/test/fixtures'
import { API } from '@/test/handlers'
import { renderWithProviders } from '@/test/render'
import { recordRequests, server } from '@/test/server'
import { PatientForm } from './PatientForm'

const NEW_ID = '00000000-0000-4000-8000-00000000abcd'
const FUTURE = `${new Date().getUTCFullYear() + 1}-01-01`

function renderCreate() {
  const requests = recordRequests()
  const utils = renderWithProviders(<PatientForm />, {
    route: '/patients/new',
    path: '/patients/new',
  })
  const writes = () => requests.filter((r) => r.method === 'POST' || r.method === 'PUT')
  return { ...utils, writes }
}

function acceptCreate() {
  server.use(
    http.post(`${API}/patients`, async ({ request }) => {
      const body = (await request.json()) as PatientInput
      return HttpResponse.json(makePatient({ ...body, id: NEW_ID }), { status: 201 })
    }),
  )
}

const input = (label: string | RegExp) => screen.getByLabelText(label)

async function fillRequired(user: UserEvent) {
  await user.type(input(/first name/i), 'Foxtrot')
  await user.type(input(/last name/i), 'Sample')
  await user.type(input(/date of birth/i), '1990-05-01')
}

const save = (user: UserEvent) => user.click(screen.getByRole('button', { name: 'Save' }))

describe('PatientForm (create)', () => {
  it('submitting empty shows required messages, focuses the first field and sends nothing', async () => {
    const user = userEvent.setup()
    const { writes } = renderCreate()

    await save(user)

    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
    expect(screen.getByText('Date of birth is required')).toBeInTheDocument()
    expect(input(/first name/i)).toHaveFocus()
    expect(input(/first name/i)).toHaveAccessibleDescription('First name is required')
    expect(input(/first name/i)).toBeInvalid()
    expect(writes()).toHaveLength(0)
  })

  it.each([
    ['Date of birth', FUTURE, 'Date of birth cannot be in the future'],
    ['Date of birth', '1899-12-31', 'Date of birth must be after 1900'],
    ['Email', 'not-an-email', 'Enter a valid email address'],
    ['Phone', 'call me', 'Enter a valid phone number'],
    ['Last visit', FUTURE, 'Last visit cannot be in the future'],
  ])('%s "%s" shows "%s" on blur', async (label, value, message) => {
    const user = userEvent.setup()
    renderCreate()

    await user.type(input(new RegExp(`^${label}`)), value)
    await user.tab()

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(input(new RegExp(`^${label}`))).toHaveAccessibleDescription(message)
  })

  it('rejects a last visit before the date of birth', async () => {
    const user = userEvent.setup()
    const { writes } = renderCreate()
    await fillRequired(user)
    await user.type(input(/last visit/i), '1985-01-01')

    await save(user)

    expect(await screen.findByText('Last visit cannot be before date of birth')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('valid create POSTs nulls for empty optionals and arrays for tags, then navigates', async () => {
    const user = userEvent.setup()
    acceptCreate()
    const { writes, location } = renderCreate()

    await fillRequired(user)
    await user.type(input(/^email/i), '  fox@example.test ')
    await user.selectOptions(input(/blood type/i), 'B+')
    await user.selectOptions(input(/^status/i), 'critical')
    await user.type(input(/allergies/i), 'Latex{Enter}Dust,')
    await save(user)

    await waitFor(() => expect(location().pathname).toBe(`/patients/${NEW_ID}`))
    expect(writes()).toHaveLength(1)
    expect(writes()[0].method).toBe('POST')
    expect(writes()[0].body).toEqual({
      first_name: 'Foxtrot',
      last_name: 'Sample',
      date_of_birth: '1990-05-01',
      email: 'fox@example.test',
      phone: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      postal_code: null,
      blood_type: 'B+',
      status: 'critical',
      allergies: ['Latex', 'Dust'],
      conditions: [],
      last_visit: null,
    })
  })

  it('disables Save while the request is in flight', async () => {
    const user = userEvent.setup()
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.post(`${API}/patients`, async () => {
        await held
        return HttpResponse.json(makePatient({ id: NEW_ID }), { status: 201 })
      }),
    )
    const { location } = renderCreate()
    await fillRequired(user)
    await save(user)

    expect(await screen.findByRole('button', { name: /saving/i })).toBeDisabled()
    release()
    await waitFor(() => expect(location().pathname).toBe(`/patients/${NEW_ID}`))
  })

  describe('server errors', () => {
    it('maps a 422 on `email` to the email field', async () => {
      const user = userEvent.setup()
      server.use(
        http.post(`${API}/patients`, () =>
          HttpResponse.json(
            {
              detail: [
                { loc: ['body', 'email'], msg: 'Email domain is not allowed', type: 'value_error' },
              ],
            },
            { status: 422 },
          ),
        ),
      )
      const { location } = renderCreate()
      await fillRequired(user)
      await user.type(input(/^email/i), 'fox@example.test')
      await save(user)

      expect(await screen.findByText('Email domain is not allowed')).toBeInTheDocument()
      expect(input(/^email/i)).toHaveAccessibleDescription('Email domain is not allowed')
      expect(location().pathname).toBe('/patients/new')
    })

    it('shows a 422 with an unknown field as a form-level alert', async () => {
      const user = userEvent.setup()
      server.use(
        http.post(`${API}/patients`, () =>
          HttpResponse.json(
            { detail: [{ loc: ['body', 'nickname'], msg: 'Extra inputs are not permitted' }] },
            { status: 422 },
          ),
        ),
      )
      renderCreate()
      await fillRequired(user)
      await save(user)

      expect(await screen.findByRole('alert')).toHaveTextContent('Extra inputs are not permitted')
    })

    it('shows a generic message for a 500 without detail', async () => {
      const user = userEvent.setup()
      server.use(http.post(`${API}/patients`, () => new HttpResponse(null, { status: 500 })))
      renderCreate()
      await fillRequired(user)
      await save(user)

      expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_MESSAGE)
    })

    it('on network failure shows a connection message, keeps values, and retry succeeds', async () => {
      const user = userEvent.setup()
      acceptCreate()
      server.use(http.post(`${API}/patients`, () => HttpResponse.error(), { once: true }))
      const { location, writes } = renderCreate()
      await fillRequired(user)
      await save(user)

      expect(await screen.findByRole('alert')).toHaveTextContent(NETWORK_MESSAGE)
      expect(input(/first name/i)).toHaveValue('Foxtrot')
      expect(input(/date of birth/i)).toHaveValue('1990-05-01')

      await save(user)
      await waitFor(() => expect(location().pathname).toBe(`/patients/${NEW_ID}`))
      expect(writes()).toHaveLength(2)
    })
  })

  describe('tag input', () => {
    it('adds on Enter or comma and ignores blanks and case-insensitive duplicates', async () => {
      const user = userEvent.setup()
      renderCreate()
      const conditions = input(/conditions/i)

      await user.type(conditions, 'Asthma{Enter}   {Enter}asthma{Enter}Gout,')

      expect(screen.getByRole('button', { name: 'Remove Asthma' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove Gout' })).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(2)
      expect(conditions).toHaveValue('')
    })

    it('removes a tag with its × button and the last tag with Backspace', async () => {
      const user = userEvent.setup()
      renderCreate()
      const allergies = input(/allergies/i)
      await user.type(allergies, 'Latex{Enter}Dust{Enter}Pollen{Enter}')

      await user.click(screen.getByRole('button', { name: 'Remove Latex' }))
      expect(screen.queryByRole('button', { name: 'Remove Latex' })).not.toBeInTheDocument()

      await user.type(allergies, '{Backspace}')
      expect(screen.queryByRole('button', { name: 'Remove Pollen' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove Dust' })).toBeInTheDocument()
    })
  })

  it('Cancel goes back to the list', () => {
    renderCreate()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/patients')
  })
})

describe('PatientForm (edit)', () => {
  const patient = makePatient({
    first_name: 'Golf',
    last_name: 'Sample',
    date_of_birth: '1975-07-20',
    email: null,
    phone: '+1 555 0123',
    blood_type: 'A-',
    allergies: ['Latex'],
    conditions: [],
    status: 'inactive',
    last_visit: '2026-02-01',
  })

  function renderEdit() {
    const requests = recordRequests()
    const utils = renderWithProviders(<PatientForm patient={patient} />, {
      route: `/patients/${patient.id}/edit`,
      path: '/patients/:id/edit',
    })
    return { ...utils, writes: () => requests.filter((r) => r.method === 'PUT') }
  }

  it('pre-fills the form from the patient', () => {
    renderEdit()
    expect(input(/first name/i)).toHaveValue('Golf')
    expect(input(/date of birth/i)).toHaveValue('1975-07-20')
    expect(input(/^email/i)).toHaveValue('')
    expect(input(/^phone/i)).toHaveValue('+1 555 0123')
    expect(input(/blood type/i)).toHaveValue('A-')
    expect(input(/^status/i)).toHaveValue('inactive')
    expect(input(/last visit/i)).toHaveValue('2026-02-01')
    expect(screen.getByRole('button', { name: 'Remove Latex' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      `/patients/${patient.id}`,
    )
  })

  it('PUTs the changed values and navigates to the detail page', async () => {
    const user = userEvent.setup()
    server.use(
      http.put(`${API}/patients/:id`, async ({ request }) =>
        HttpResponse.json({ ...patient, ...((await request.json()) as PatientInput) }),
      ),
    )
    const { writes, location } = renderEdit()

    await user.clear(input(/^phone/i))
    await user.selectOptions(input(/^status/i), 'active')
    await user.click(screen.getByRole('button', { name: 'Remove Latex' }))
    await save(user)

    await waitFor(() => expect(location().pathname).toBe(`/patients/${patient.id}`))
    expect(writes()).toHaveLength(1)
    expect(writes()[0].url.pathname).toBe(`/patients/${patient.id}`)
    expect(writes()[0].body).toMatchObject({
      first_name: 'Golf',
      date_of_birth: '1975-07-20',
      email: null,
      phone: null,
      blood_type: 'A-',
      status: 'active',
      allergies: [],
      last_visit: '2026-02-01',
    })
  })

  it('a 404 on save says the patient no longer exists, with a link to the list', async () => {
    const user = userEvent.setup()
    server.use(
      http.put(`${API}/patients/:id`, () =>
        HttpResponse.json({ detail: 'Patient not found' }, { status: 404 }),
      ),
    )
    renderEdit()
    await save(user)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('This patient no longer exists')
    expect(screen.getByRole('link', { name: 'Back to patients' })).toHaveAttribute(
      'href',
      '/patients',
    )
  })
})

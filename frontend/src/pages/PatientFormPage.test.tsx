import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { API, defaultPatients } from '@/test/handlers'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'
import PatientFormPage from './PatientFormPage'

const renderEdit = (id: string) =>
  renderWithProviders(<PatientFormPage />, {
    route: `/patients/${id}/edit`,
    path: '/patients/:id/edit',
  })

describe('PatientFormPage', () => {
  it('renders an empty create form at /patients/new', () => {
    renderWithProviders(<PatientFormPage />, { route: '/patients/new', path: '/patients/new' })
    expect(screen.getByRole('heading', { level: 1, name: 'New patient' })).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toHaveValue('')
    expect(screen.getByLabelText(/^status/i)).toHaveValue('active')
  })

  it('shows a skeleton, then the edit form pre-filled from GET /patients/:id', async () => {
    const [patient] = defaultPatients
    renderEdit(patient.id)

    expect(screen.getByTestId('form-skeleton')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit patient' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toHaveValue(patient.first_name)
  })

  it('shows "Patient not found" on 404', async () => {
    renderEdit('00000000-0000-4000-8000-0000deadbeef')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Patient not found' }),
    ).toBeInTheDocument()
  })

  it('shows other load errors with Retry', async () => {
    const user = userEvent.setup()
    const [patient] = defaultPatients
    server.use(
      http.get(
        `${API}/patients/:id`,
        () => HttpResponse.json({ detail: 'Boom' }, { status: 500 }),
        {
          once: true,
        },
      ),
    )
    renderEdit(patient.id)

    expect(await screen.findByRole('alert')).toHaveTextContent('Boom')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit patient' }),
    ).toBeInTheDocument()
  })
})

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { defaultPatients } from '@/test/handlers'
import { renderWithProviders } from '@/test/render'

describe('App routes', () => {
  it.each([
    ['/', 'Dashboard'],
    ['/patients', 'Patients'],
    ['/patients/new', 'New patient'],
  ])('%s renders the %s page', async (route, heading) => {
    renderWithProviders(<App />, { route })
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(document.title).toBe(`${heading} · Patient Management`)
  })

  it('/patients/:id renders the patient detail page', async () => {
    const [patient] = defaultPatients
    renderWithProviders(<App />, { route: `/patients/${patient.id}` })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Alpha Tester' }),
    ).toBeInTheDocument()
  })

  it('/patients/:id/edit renders the edit form', async () => {
    const [patient] = defaultPatients
    renderWithProviders(<App />, { route: `/patients/${patient.id}/edit` })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit patient' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toHaveValue('Alpha')
  })

  it('renders the 404 page inside the layout for unknown routes, with a link home', async () => {
    const user = userEvent.setup()
    const { location } = renderWithProviders(<App />, { route: '/no/such/page' })

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    // Still inside the app shell.
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Back to dashboard' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(location().pathname).toBe('/')
  })
})

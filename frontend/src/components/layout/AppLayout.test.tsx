import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { AppLayout } from './AppLayout'

function renderLayout(route = '/') {
  return renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<h1>Home content</h1>} />
        <Route path="patients" element={<h1>Patients content</h1>} />
        <Route path="patients/new" element={<h1>New patient content</h1>} />
      </Route>
    </Routes>,
    { route },
  )
}

describe('AppLayout', () => {
  it('renders logo, nav and the current route in main', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: 'Patient Management' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('heading')).toHaveTextContent('Home content')
  })

  it('navigates via the Patients link and marks it active', async () => {
    const user = userEvent.setup()
    const { location } = renderLayout()
    const primary = screen.getByRole('navigation', { name: 'Primary' })

    expect(within(primary).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await user.click(within(primary).getByRole('link', { name: 'Patients' }))

    expect(screen.getByRole('heading', { name: 'Patients content' })).toBeInTheDocument()
    expect(location().pathname).toBe('/patients')
    expect(within(primary).getByRole('link', { name: 'Patients' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(primary).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('"New patient" header button links to the create form', async () => {
    const user = userEvent.setup()
    renderLayout()
    // jsdom loads no CSS, so both the responsive label and its sr-only twin are in the name.
    await user.click(screen.getByRole('link', { name: /new patient/i }))
    expect(screen.getByRole('heading', { name: 'New patient content' })).toBeInTheDocument()
  })

  describe('mobile menu', () => {
    it('opens the drawer from the menu button and closes it on navigation', async () => {
      const user = userEvent.setup()
      const { location } = renderLayout()

      expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Open menu' }))

      const drawer = await screen.findByRole('dialog', { name: 'Menu' })
      await user.click(within(drawer).getByRole('link', { name: 'Patients' }))

      expect(location().pathname).toBe('/patients')
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument(),
      )
    })

    it('closes on Escape', async () => {
      const user = userEvent.setup()
      renderLayout()
      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      await screen.findByRole('dialog', { name: 'Menu' })

      await user.keyboard('{Escape}')
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument(),
      )
    })
  })
})

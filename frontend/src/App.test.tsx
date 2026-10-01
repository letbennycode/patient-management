import { screen } from '@testing-library/react'
import App from './App'
import { renderWithProviders } from '@/test/render'

it('renders the heading', () => {
  renderWithProviders(<App />)
  expect(screen.getByRole('heading', { name: /patient management/i })).toBeInTheDocument()
})

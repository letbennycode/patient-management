import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { initTheme } from '@/lib/theme'
import { mockMatchMedia } from '@/test/matchMedia'
import { ThemeToggle } from './ThemeToggle'

const isDark = () => document.documentElement.classList.contains('dark')
const stored = () => JSON.parse(localStorage.getItem('theme') ?? 'null')?.state?.theme

describe('ThemeToggle', () => {
  it('starts on System and marks the current option as pressed', () => {
    initTheme() // as main.tsx does
    render(<ThemeToggle />)
    const group = screen.getByRole('group', { name: 'Theme' })
    expect(within(group).getByRole('button', { name: 'System' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(group).getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('Dark adds the dark class and persists; Light removes it', async () => {
    const user = userEvent.setup()
    initTheme()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Dark' }))
    expect(isDark()).toBe(true)
    expect(stored()).toBe('dark')
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Light' }))
    expect(isDark()).toBe(false)
    expect(stored()).toBe('light')
  })

  it('System follows an OS dark preference', async () => {
    const user = userEvent.setup()
    mockMatchMedia({ prefersDark: true })
    initTheme()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Light' }))
    expect(isDark()).toBe(false)
    await user.click(screen.getByRole('button', { name: 'System' }))
    expect(isDark()).toBe(true)
  })
})

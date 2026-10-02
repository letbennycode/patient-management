import { act } from '@testing-library/react'
import { mockMatchMedia } from '@/test/matchMedia'
import { applyTheme, initTheme, useThemeStore } from './theme'

const isDark = () => document.documentElement.classList.contains('dark')
const stored = () => JSON.parse(localStorage.getItem('theme') ?? 'null')?.state?.theme

describe('applyTheme', () => {
  it('adds the dark class for dark and removes it for light', () => {
    applyTheme('dark')
    expect(isDark()).toBe(true)
    applyTheme('light')
    expect(isDark()).toBe(false)
  })

  it.each([
    [true, true],
    [false, false],
  ])('system follows prefers-color-scheme (OS dark=%s)', (prefersDark, expected) => {
    mockMatchMedia({ prefersDark })
    applyTheme('system')
    expect(isDark()).toBe(expected)
  })
})

describe('theme store + initTheme', () => {
  it('defaults to system', () => {
    expect(useThemeStore.getState().theme).toBe('system')
  })

  it('applies changes immediately and persists them to localStorage', () => {
    initTheme()
    act(() => useThemeStore.getState().setTheme('dark'))
    expect(isDark()).toBe(true)
    expect(stored()).toBe('dark')

    act(() => useThemeStore.getState().setTheme('light'))
    expect(isDark()).toBe(false)
    expect(stored()).toBe('light')
  })

  it('applies a stored choice on start-up', async () => {
    localStorage.setItem('theme', JSON.stringify({ state: { theme: 'dark' }, version: 0 }))
    await useThemeStore.persist.rehydrate()
    initTheme()
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(isDark()).toBe(true)
  })

  it('in system mode reacts to OS changes; explicit choices ignore them', () => {
    const media = mockMatchMedia({ prefersDark: false })
    initTheme()
    expect(isDark()).toBe(false)

    media.set({ prefersDark: true })
    expect(isDark()).toBe(true)

    act(() => useThemeStore.getState().setTheme('light'))
    media.set({ prefersDark: false })
    media.set({ prefersDark: true })
    expect(isDark()).toBe(false)
  })
})

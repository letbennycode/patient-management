import { noteSchema, toLocalInputValue } from './noteSchema'

const NOW = new Date(2026, 2, 30, 12, 0)

function errorsFor(values: { content?: string; timestamp?: string }) {
  const result = noteSchema.safeParse({
    content: 'Stable.',
    timestamp: toLocalInputValue(NOW),
    ...values,
  })
  if (result.success) return {}
  // First message per field, which is what zodResolver shows the user.
  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) errors[issue.path.join('.')] ??= issue.message
  return errors
}

describe('noteSchema', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  it('accepts a note and trims its content', () => {
    const result = noteSchema.parse({ content: '  Stable.  ', timestamp: toLocalInputValue(NOW) })
    expect(result.content).toBe('Stable.')
  })

  it.each(['', '   \n\t '])('rejects empty content %j', (content) => {
    expect(errorsFor({ content })).toEqual({ content: "Note can't be empty" })
  })

  it('allows up to 5000 characters', () => {
    expect(errorsFor({ content: 'x'.repeat(5000) })).toEqual({})
    expect(errorsFor({ content: 'x'.repeat(5001) })).toEqual({
      content: 'Note must be 5000 characters or fewer',
    })
  })

  it('requires a time', () => {
    expect(errorsFor({ timestamp: '' })).toEqual({ timestamp: 'Time is required' })
  })

  it('allows backdating and up to 5 minutes of clock skew, but not the future', () => {
    const at = (minutesFromNow: number) =>
      toLocalInputValue(new Date(NOW.getTime() + minutesFromNow * 60_000))
    expect(errorsFor({ timestamp: at(-60 * 24 * 365) })).toEqual({})
    expect(errorsFor({ timestamp: at(4) })).toEqual({})
    expect(errorsFor({ timestamp: at(6) })).toEqual({ timestamp: "Time can't be in the future" })
  })
})

describe('toLocalInputValue', () => {
  it('formats a Date as local YYYY-MM-DDTHH:mm with zero padding', () => {
    expect(toLocalInputValue(new Date(2026, 0, 5, 7, 3))).toBe('2026-01-05T07:03')
    expect(toLocalInputValue(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31T23:59')
  })
})

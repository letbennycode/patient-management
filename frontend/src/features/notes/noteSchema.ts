import { z } from 'zod'

const FUTURE_SKEW_MS = 5 * 60 * 1000

export const noteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Note can't be empty")
    .max(5000, 'Note must be 5000 characters or fewer'),
  timestamp: z
    .string()
    .min(1, 'Time is required')
    .refine(
      (v) => new Date(v).getTime() <= Date.now() + FUTURE_SKEW_MS,
      "Time can't be in the future",
    ),
})

export type NoteFormValues = z.infer<typeof noteSchema>

/** Formats a Date for <input type="datetime-local"> in local time. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

import type { Patient } from '@/api/types'

export const fullName = (p: Pick<Patient, 'first_name' | 'last_name'>) =>
  `${p.first_name} ${p.last_name}`

/** Formats a `YYYY-MM-DD` date without timezone shifting. */
export function formatDate(value: string | null, fallback = 'Never'): string {
  if (!value) return fallback
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Formats an ISO timestamp in local time, e.g. "30 Sep 2026, 10:15". */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

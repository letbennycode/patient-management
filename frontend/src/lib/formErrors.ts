import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'
import { getErrorMessage, getFieldErrors } from './errors'

/**
 * Maps a failed request onto a form: 422 field errors are attached to their inputs, and
 * anything else (network, 5xx, unknown field) is returned as a form-level message.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): string | null {
  const unmatched: string[] = []
  for (const { field, message } of getFieldErrors(error)) {
    // `allergies.0` style paths attach to their parent input.
    const root = field.split('.')[0]
    if (fields.includes(root)) setError(root as FieldPath<T>, { type: 'server', message })
    else unmatched.push(message)
  }
  if (unmatched.length) return unmatched.join(' ')
  return getFieldErrors(error).length ? null : getErrorMessage(error)
}

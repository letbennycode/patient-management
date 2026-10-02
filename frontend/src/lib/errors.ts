import { ApiError, NetworkError } from '@/api/client'

export const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again."
export const GENERIC_MESSAGE = 'Something went wrong. Please try again.'

/** Turns any thrown value into a message that is safe to show the user. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) return NETWORK_MESSAGE
  if (error instanceof ApiError && typeof error.detail === 'string') return error.detail
  return GENERIC_MESSAGE
}

export function isNotFound(error: unknown): boolean {
  // A malformed UUID in the URL comes back as 422 and is treated as "not found" too.
  return error instanceof ApiError && (error.status === 404 || error.status === 422)
}

export interface FieldError {
  field: string
  message: string
}

/** Extracts field-level messages from a FastAPI 422 `detail` array. */
export function getFieldErrors(error: unknown): FieldError[] {
  if (!(error instanceof ApiError) || error.status !== 422 || !Array.isArray(error.detail)) {
    return []
  }
  return error.detail.flatMap((item: { loc?: unknown[]; msg?: string }) => {
    const path = (item.loc ?? []).filter((part) => part !== 'body')
    if (!item.msg) return []
    return [{ field: path.map(String).join('.'), message: item.msg }]
  })
}

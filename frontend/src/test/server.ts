import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

export interface RecordedRequest {
  method: string
  url: URL
  body: unknown
}

/**
 * Records every request MSW sees (listeners are removed after each test in setup.ts).
 * Use it to assert on query params, bodies and request counts without replacing handlers.
 */
export function recordRequests() {
  const requests: RecordedRequest[] = []
  server.events.on('request:start', async ({ request }) => {
    // Push synchronously so the order matches the order requests were sent.
    const entry: RecordedRequest = { method: request.method, url: new URL(request.url), body: null }
    requests.push(entry)
    const text = await request.clone().text()
    if (text) entry.body = JSON.parse(text)
  })
  return requests
}

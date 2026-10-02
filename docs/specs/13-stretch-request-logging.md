# 13: STRETCH: Request logging middleware

**Source:** take-home stretch: Advanced Backend, request logging middleware

Only build if required chunks 01–10 are done.

## Goal
Every backend request produces one structured log line with a request ID, without ever logging patient data.

## Behaviour
- Middleware assigns a request ID: reuses an incoming `X-Request-ID` header only if it parses as a UUID (so callers cannot write free text into logs), otherwise generates a UUID. Returned in the `X-Request-ID` response header.
- On completion logs: request ID, method, route **template** (e.g. `/patients/{id}`, not the concrete path or query string), status code, duration ms. Unhandled exceptions log the same fields with status 500 and the exception type only.
- Never logs query strings (search terms are names), bodies, headers other than the request ID, or path parameters.
- `/health` may be logged at debug level to reduce noise.

## Acceptance criteria
- [ ] Every response carries `X-Request-ID`.
- [ ] One log line per request with the fields above.
- [ ] Logs contain no patient fields, note content, search terms or IDs from the path.

## Test plan (pytest)
- Response has `X-Request-ID`; incoming valid ID is echoed; invalid one is replaced.
- With `caplog`, a `GET /patients?search=Smith` and a POST with a name produce a log line containing the route template and status, and not containing "Smith", the posted name or the patient UUID.

## Out of scope
Log shipping, tracing, metrics.

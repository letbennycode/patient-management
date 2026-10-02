import logging
import re
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("app.request")

REQUEST_ID_HEADER = "X-Request-ID"
SAFE_ID = re.compile(r"^[A-Za-z0-9-]{1,64}$")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """One log line per request: id, method, route template, status, duration.

    Never logs query strings, bodies, path parameters or other headers (they can hold PHI).
    """

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        incoming = request.headers.get(REQUEST_ID_HEADER, "")
        request_id = incoming if SAFE_ID.match(incoming) else str(uuid.uuid4())
        start = time.perf_counter()
        status_code = 500
        error: str | None = None
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as exc:
            # Only the exception type is logged: messages can contain patient data.
            error = type(exc).__name__
            response = JSONResponse(status_code=500, content={"detail": "Internal Server Error"})
        route = request.scope.get("route")
        template = getattr(route, "path", "unmatched")
        duration_ms = (time.perf_counter() - start) * 1000
        level = logging.DEBUG if template == "/health" else logging.INFO
        logger.log(
            level,
            "request_id=%s method=%s route=%s status=%s duration_ms=%.1f%s",
            request_id,
            request.method,
            template,
            status_code,
            duration_ms,
            f" error={error}" if error else "",
        )
        response.headers[REQUEST_ID_HEADER] = request_id
        return response

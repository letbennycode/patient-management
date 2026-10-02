import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import health, notes, patients, summary
from app.config import get_settings
from app.db.seed import seed_if_empty
from app.db.session import SessionLocal
from app.errors import NotFoundError
from app.middleware import RequestLoggingMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    if settings.seed_on_startup:
        with SessionLocal() as db:
            seed_if_empty(db)
    yield


app = FastAPI(title="Patient Management API", lifespan=lifespan)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


@app.exception_handler(NotFoundError)
async def not_found_handler(_: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": exc.detail})


app.include_router(health.router)
app.include_router(patients.router)
app.include_router(notes.router)
app.include_router(summary.router)

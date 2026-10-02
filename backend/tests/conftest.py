import os
from collections.abc import Callable, Iterator
from pathlib import Path

# Must be set before app modules import settings. Tests always run against the test database
# (never the dev one, even if DATABASE_URL is set in the environment) and never seed.
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/patients_test",
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["SEED_ON_STARTUP"] = "false"
os.environ["LLM_API_KEY"] = ""

from datetime import UTC, date, datetime  # noqa: E402

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from faker import Faker  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Patient, PatientNote  # noqa: E402

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"

# A fixed "today" for tests that depend on the calendar (age, future-date validation).
FROZEN_TODAY = date(2026, 6, 15)


def alembic_config() -> Config:
    return Config(str(ALEMBIC_INI))


@pytest.fixture(scope="session", autouse=True)
def _schema() -> Iterator[None]:
    cfg = alembic_config()
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def _clean_tables(_schema: None) -> Iterator[None]:
    yield
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE patients CASCADE"))


@pytest.fixture
def db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def frozen_today(monkeypatch: pytest.MonkeyPatch) -> date:
    """Pin the date used for age and date-of-birth/last-visit validation to FROZEN_TODAY."""
    monkeypatch.setattr("app.schemas.patient.today_utc", lambda: FROZEN_TODAY)
    return FROZEN_TODAY


@pytest.fixture
def fake() -> Faker:
    faker = Faker("en_US")
    faker.seed_instance(1234)
    return faker


@pytest.fixture
def make_patient(db: Session, fake: Faker) -> Callable[..., Patient]:
    """Insert a valid patient; pass only the fields the test cares about."""

    def _make(**overrides: object) -> Patient:
        fields: dict[str, object] = {
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "date_of_birth": date(1980, 5, 17),
        }
        fields.update(overrides)
        patient = Patient(**fields)
        db.add(patient)
        db.commit()
        db.refresh(patient)
        return patient

    return _make


@pytest.fixture
def make_note(db: Session) -> Callable[..., PatientNote]:
    """Insert a note for `patient` with a fixed past timestamp unless overridden."""

    def _make(patient: Patient, **overrides: object) -> PatientNote:
        fields: dict[str, object] = {
            "timestamp": datetime(2026, 1, 15, 9, 30, tzinfo=UTC),
            "content": "Routine check-up. Vitals within normal limits.",
        }
        fields.update(overrides)
        note = PatientNote(patient_id=patient.id, **fields)
        db.add(note)
        db.commit()
        db.refresh(note)
        return note

    return _make

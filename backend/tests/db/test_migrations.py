from collections.abc import Iterator

import pytest
from alembic import command
from sqlalchemy import inspect, text

from app.db.session import engine
from tests.conftest import alembic_config

PATIENT_COLUMNS = {
    "id", "first_name", "last_name", "date_of_birth", "email", "phone", "address_line1",
    "address_line2", "city", "state", "postal_code", "blood_type", "allergies", "conditions",
    "status", "last_visit", "created_at", "updated_at",
}  # fmt: skip
NOTE_COLUMNS = {"id", "patient_id", "timestamp", "content", "created_at"}


def _enum_types() -> set[str]:
    with engine.connect() as conn:
        return set(conn.scalars(text("SELECT typname FROM pg_type WHERE typtype = 'e'")))


@pytest.fixture
def restore_head() -> Iterator[None]:
    """Whatever the test does to the schema, leave the DB at head for the rest of the suite."""
    yield
    engine.dispose()  # drop pooled connections that may hold stale type info
    command.upgrade(alembic_config(), "head")


@pytest.mark.usefixtures("restore_head")
def test_migrations_downgrade_to_base_and_upgrade_to_head() -> None:
    cfg = alembic_config()

    command.downgrade(cfg, "base")
    tables_at_base = set(inspect(engine).get_table_names())
    enums_at_base = _enum_types()
    command.upgrade(cfg, "head")
    inspector = inspect(engine)

    assert {"patients", "patient_notes"}.isdisjoint(tables_at_base)
    assert {"blood_type", "patient_status"}.isdisjoint(enums_at_base)
    assert {c["name"] for c in inspector.get_columns("patients")} == PATIENT_COLUMNS
    assert {c["name"] for c in inspector.get_columns("patient_notes")} == NOTE_COLUMNS
    assert {"blood_type", "patient_status"} <= _enum_types()
    [fk] = inspector.get_foreign_keys("patient_notes")
    assert fk["referred_table"] == "patients"
    assert fk["options"].get("ondelete") == "CASCADE"
    index_names = {i["name"] for i in inspector.get_indexes("patients")}
    assert {"ix_patients_name", "ix_patients_status", "ix_patients_last_visit"} <= index_names


@pytest.mark.usefixtures("restore_head")
def test_notes_migration_downgrades_independently() -> None:
    cfg = alembic_config()

    command.downgrade(cfg, "0001")

    tables = set(inspect(engine).get_table_names())
    assert "patients" in tables
    assert "patient_notes" not in tables

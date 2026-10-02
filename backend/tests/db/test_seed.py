import logging
from collections.abc import Callable
from datetime import UTC, date, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

import app.main as main_module
from app.db.seed import ALLERGIES, CONDITIONS, NOTE_TEMPLATES, PATIENT_COUNT, seed_if_empty
from app.db.session import engine
from app.models import Patient, PatientNote, PatientStatus
from app.schemas.patient import PatientIn

MakePatient = Callable[..., Patient]

# The seed spreads ages 0-95 back from the real "today", so its date checks use the real date.
TODAY = datetime.now(UTC).date()


def _count(db: Session, model: type) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


def _snapshot(db: Session) -> list[tuple]:
    rows = db.scalars(
        select(Patient).order_by(Patient.last_name, Patient.first_name, Patient.email)
    )
    return [
        (p.first_name, p.last_name, p.date_of_birth, p.email, p.phone, p.blood_type, p.status,
         tuple(p.allergies), tuple(p.conditions), p.last_visit)
        for p in rows
    ]  # fmt: skip


def test_seed_inserts_120_patients_into_empty_table(db: Session) -> None:
    inserted = seed_if_empty(db)

    assert inserted == PATIENT_COUNT == 120
    assert _count(db, Patient) == 120


def test_seed_second_run_inserts_nothing(db: Session) -> None:
    seed_if_empty(db)
    notes_before = _count(db, PatientNote)

    inserted = seed_if_empty(db)

    assert inserted == 0
    assert _count(db, Patient) == 120
    assert _count(db, PatientNote) == notes_before


def test_seed_does_nothing_when_patients_already_exist(
    db: Session, make_patient: MakePatient
) -> None:
    make_patient()

    inserted = seed_if_empty(db)

    assert inserted == 0
    assert _count(db, Patient) == 1
    assert _count(db, PatientNote) == 0


def test_seed_is_deterministic_across_fresh_resets(db: Session) -> None:
    seed_if_empty(db)
    first = _snapshot(db)
    db.rollback()  # end the read transaction so TRUNCATE isn't blocked by our own session
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE patients CASCADE"))

    seed_if_empty(db)

    assert _snapshot(db) == first


def test_seeded_patients_satisfy_model_constraints(db: Session) -> None:
    seed_if_empty(db)

    patients = db.scalars(select(Patient)).all()

    for p in patients:
        assert date(1900, 1, 1) <= p.date_of_birth <= TODAY
        if p.last_visit is not None:
            assert p.date_of_birth <= p.last_visit <= TODAY
        assert p.status in set(PatientStatus)
        assert set(p.allergies) <= set(ALLERGIES) and len(p.allergies) <= 3
        assert set(p.conditions) <= set(CONDITIONS) and len(p.conditions) <= 4


def test_seeded_patients_pass_api_validation(db: Session) -> None:
    seed_if_empty(db)
    fields = set(PatientIn.model_fields)

    patients = db.scalars(select(Patient)).all()

    for p in patients:
        PatientIn.model_validate({f: getattr(p, f) for f in fields})


def test_seeded_data_has_a_realistic_mix(db: Session) -> None:
    seed_if_empty(db)

    patients = db.scalars(select(Patient)).all()

    assert {p.status for p in patients} == set(PatientStatus)
    assert any(p.blood_type is None for p in patients)
    assert any(p.last_visit is None for p in patients)


def test_seed_creates_up_to_five_past_notes_per_patient(db: Session) -> None:
    seed_if_empty(db)
    now = datetime.now(UTC)

    notes = db.scalars(select(PatientNote)).all()

    assert notes
    per_patient: dict = {}
    for n in notes:
        per_patient[n.patient_id] = per_patient.get(n.patient_id, 0) + 1
        assert n.timestamp <= now
        assert n.content in NOTE_TEMPLATES
    assert max(per_patient.values()) <= 5


def test_seed_logs_counts_but_no_patient_fields(
    db: Session, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO, logger="app.db.seed")

    seed_if_empty(db)

    messages = [r.getMessage() for r in caplog.records if r.name == "app.db.seed"]
    assert len(messages) == 1
    assert "120 patients" in messages[0]
    some = db.scalars(select(Patient).limit(5)).all()
    for p in some:
        assert p.last_name not in messages[0]
        assert p.first_name not in messages[0]


def test_startup_does_not_seed_when_disabled(db: Session) -> None:
    # conftest sets SEED_ON_STARTUP=false before the app is imported.
    assert main_module.settings.seed_on_startup is False

    with TestClient(main_module.app):
        pass

    assert _count(db, Patient) == 0


def test_startup_seeds_when_enabled(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main_module.settings, "seed_on_startup", True)

    with TestClient(main_module.app):
        pass

    assert _count(db, Patient) == 120

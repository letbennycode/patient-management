"""build_summary() called directly (no HTTP) for template wording details."""

import uuid
from collections.abc import Callable
from datetime import UTC, datetime

import pytest
from sqlalchemy.orm import Session

from app.errors import NotFoundError
from app.models import Patient, PatientNote
from app.services.summary import build_summary

MakePatient = Callable[..., Patient]
MakeNote = Callable[..., PatientNote]


def test_build_summary_raises_not_found_for_unknown_patient(db: Session) -> None:
    with pytest.raises(NotFoundError, match="Patient not found"):
        build_summary(db, uuid.uuid4())


def test_single_note_uses_singular_wording_and_its_date(
    db: Session, make_patient: MakePatient, make_note: MakeNote
) -> None:
    patient = make_patient()
    make_note(patient, timestamp=datetime(2026, 2, 3, 9, 0, tzinfo=UTC), content="All good.")

    summary = build_summary(db, patient.id)

    assert "1 clinical note was recorded on 3 Feb 2026." in summary.narrative
    assert "On 3 Feb 2026: All good." in summary.narrative


def test_notes_on_same_day_report_a_single_date(
    db: Session, make_patient: MakePatient, make_note: MakeNote
) -> None:
    patient = make_patient()
    make_note(patient, timestamp=datetime(2026, 2, 3, 9, 0, tzinfo=UTC))
    make_note(patient, timestamp=datetime(2026, 2, 3, 15, 0, tzinfo=UTC))

    summary = build_summary(db, patient.id)

    assert "2 clinical notes were recorded on 3 Feb 2026." in summary.narrative


def test_long_first_sentence_is_truncated_to_200_chars(
    db: Session, make_patient: MakePatient, make_note: MakeNote
) -> None:
    patient = make_patient()
    make_note(patient, content="word " * 100)

    summary = build_summary(db, patient.id)

    snippet = summary.narrative.split(": ", 1)[1]
    assert snippet.endswith("…")
    assert len(snippet) <= 200


def test_note_without_sentence_end_is_used_whole_with_whitespace_collapsed(
    db: Session, make_patient: MakePatient, make_note: MakeNote
) -> None:
    patient = make_patient()
    make_note(patient, content="BP 120/80\n\n  no complaints")

    summary = build_summary(db, patient.id)

    assert summary.narrative.endswith(": BP 120/80 no complaints")

import uuid
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Patient, PatientNote
from tests.factories import note_body

MakePatient = Callable[..., Patient]
MakeNote = Callable[..., PatientNote]

NOTE_KEYS = {"id", "patient_id", "timestamp", "content", "created_at"}


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


# ---------------------------------------------------------------- create


def test_create_note_returns_201_with_note(client: TestClient, make_patient: MakePatient) -> None:
    patient = make_patient()

    response = client.post(f"/patients/{patient.id}/notes", json=note_body())

    assert response.status_code == 201
    body = response.json()
    assert set(body) == NOTE_KEYS
    uuid.UUID(body["id"])
    assert body["patient_id"] == str(patient.id)
    assert body["content"] == "Follow-up visit. Blood pressure stable."
    assert _parse(body["timestamp"]) == datetime(2026, 1, 15, 10, 15, tzinfo=UTC)


def test_create_note_appears_in_list(client: TestClient, make_patient: MakePatient) -> None:
    patient = make_patient()
    created = client.post(f"/patients/{patient.id}/notes", json=note_body()).json()

    response = client.get(f"/patients/{patient.id}/notes")

    assert response.status_code == 200
    assert response.json() == {"items": [created], "total": 1}


def test_create_note_trims_content(client: TestClient, make_patient: MakePatient) -> None:
    patient = make_patient()

    response = client.post(
        f"/patients/{patient.id}/notes", json=note_body(content="  Line one.\nLine two.  ")
    )

    assert response.status_code == 201
    assert response.json()["content"] == "Line one.\nLine two."


def test_create_note_accepts_content_at_max_length(
    client: TestClient, make_patient: MakePatient
) -> None:
    patient = make_patient()

    response = client.post(f"/patients/{patient.id}/notes", json=note_body(content="x" * 5000))

    assert response.status_code == 201


def test_create_note_accepts_non_utc_offset(client: TestClient, make_patient: MakePatient) -> None:
    patient = make_patient()

    response = client.post(
        f"/patients/{patient.id}/notes", json=note_body(timestamp="2026-01-15T12:15:00+02:00")
    )

    assert response.status_code == 201
    assert _parse(response.json()["timestamp"]) == datetime(2026, 1, 15, 10, 15, tzinfo=UTC)


def test_create_note_allows_small_clock_skew(client: TestClient, make_patient: MakePatient) -> None:
    # The schema reads the real clock, so this uses a 1-minute lead well inside the 5-minute
    # allowance rather than an exact boundary.
    patient = make_patient()
    slightly_ahead = (datetime.now(UTC) + timedelta(minutes=1)).isoformat()

    response = client.post(
        f"/patients/{patient.id}/notes", json=note_body(timestamp=slightly_ahead)
    )

    assert response.status_code == 201


def test_create_note_returns_404_for_unknown_patient(client: TestClient) -> None:
    response = client.post(f"/patients/{uuid.uuid4()}/notes", json=note_body())

    assert response.status_code == 404
    assert response.json() == {"detail": "Patient not found"}


@pytest.mark.parametrize(
    ("payload", "field", "message"),
    [
        (note_body(content=""), "content", None),
        (note_body(content="   \n\t "), "content", None),
        (note_body(content="x" * 5001), "content", None),
        (note_body(timestamp="2026-01-15T10:15:00"), "timestamp", None),  # no timezone
        (note_body(timestamp="2999-01-01T00:00:00Z"), "timestamp", "Time can't be in the future"),
        (note_body(timestamp="yesterday"), "timestamp", None),
        ({"content": "No timestamp."}, "timestamp", None),
        ({"timestamp": "2026-01-15T10:15:00Z"}, "content", None),
        (note_body(author="Dr. Nobody"), "author", None),
    ],
    ids=[
        "empty",
        "whitespace",
        "too-long",
        "naive-timestamp",
        "future-timestamp",
        "bad-timestamp",
        "missing-timestamp",
        "missing-content",
        "extra-field",
    ],  # fmt: skip
)
def test_create_note_returns_422_for_invalid_body(
    client: TestClient,
    make_patient: MakePatient,
    payload: dict[str, Any],
    field: str,
    message: str | None,
) -> None:
    patient = make_patient()

    response = client.post(f"/patients/{patient.id}/notes", json=payload)

    assert response.status_code == 422
    errors = [e for e in response.json()["detail"] if e["loc"][-1] == field]
    assert errors, response.json()
    if message:
        assert message in errors[0]["msg"]


def test_create_note_does_not_change_patient_last_visit(
    client: TestClient, make_patient: MakePatient
) -> None:
    patient = make_patient(last_visit=date(2025, 3, 1))

    client.post(f"/patients/{patient.id}/notes", json=note_body())

    assert client.get(f"/patients/{patient.id}").json()["last_visit"] == "2025-03-01"


# ---------------------------------------------------------------- list


def test_list_notes_returns_newest_timestamp_first(
    client: TestClient, make_patient: MakePatient, make_note: MakeNote
) -> None:
    patient = make_patient()
    middle = make_note(patient, timestamp=datetime(2026, 2, 1, tzinfo=UTC))
    oldest = make_note(patient, timestamp=datetime(2025, 1, 1, tzinfo=UTC))
    newest = make_note(patient, timestamp=datetime(2026, 3, 1, tzinfo=UTC))

    response = client.get(f"/patients/{patient.id}/notes")

    assert response.status_code == 200
    body = response.json()
    assert [n["id"] for n in body["items"]] == [str(newest.id), str(middle.id), str(oldest.id)]
    assert body["total"] == 3


def test_list_notes_breaks_timestamp_ties_by_newest_created(
    client: TestClient, make_patient: MakePatient, make_note: MakeNote
) -> None:
    patient = make_patient()
    same_time = datetime(2026, 2, 1, 8, 0, tzinfo=UTC)
    first = make_note(patient, timestamp=same_time)
    second = make_note(patient, timestamp=same_time)

    response = client.get(f"/patients/{patient.id}/notes")

    assert [n["id"] for n in response.json()["items"]] == [str(second.id), str(first.id)]


def test_list_notes_returns_only_that_patients_notes(
    client: TestClient, make_patient: MakePatient, make_note: MakeNote
) -> None:
    patient, other = make_patient(), make_patient()
    mine = make_note(patient)
    make_note(other)

    response = client.get(f"/patients/{patient.id}/notes")

    assert [n["id"] for n in response.json()["items"]] == [str(mine.id)]


def test_list_notes_returns_empty_list_when_patient_has_none(
    client: TestClient, make_patient: MakePatient
) -> None:
    patient = make_patient()

    response = client.get(f"/patients/{patient.id}/notes")

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


def test_list_notes_returns_404_for_unknown_patient(client: TestClient) -> None:
    response = client.get(f"/patients/{uuid.uuid4()}/notes")

    assert response.status_code == 404
    assert response.json() == {"detail": "Patient not found"}


# ---------------------------------------------------------------- delete


def test_delete_note_returns_204_and_removes_note(
    client: TestClient, make_patient: MakePatient, make_note: MakeNote
) -> None:
    patient = make_patient()
    note = make_note(patient)

    response = client.delete(f"/patients/{patient.id}/notes/{note.id}")

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/patients/{patient.id}/notes").json() == {"items": [], "total": 0}


def test_delete_note_via_another_patients_url_returns_404_and_keeps_note(
    client: TestClient, make_patient: MakePatient, make_note: MakeNote
) -> None:
    owner, other = make_patient(), make_patient()
    note = make_note(owner)

    response = client.delete(f"/patients/{other.id}/notes/{note.id}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Note not found"}
    assert client.get(f"/patients/{owner.id}/notes").json()["total"] == 1


def test_delete_note_returns_404_for_unknown_note(
    client: TestClient, make_patient: MakePatient
) -> None:
    patient = make_patient()

    response = client.delete(f"/patients/{patient.id}/notes/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Note not found"}


def test_delete_note_returns_404_for_unknown_patient(client: TestClient) -> None:
    response = client.delete(f"/patients/{uuid.uuid4()}/notes/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Patient not found"}


def test_delete_note_returns_422_for_malformed_note_id(
    client: TestClient, make_patient: MakePatient
) -> None:
    patient = make_patient()

    response = client.delete(f"/patients/{patient.id}/notes/abc")

    assert response.status_code == 422


def test_delete_patient_deletes_their_notes(
    client: TestClient, db: Session, make_patient: MakePatient, make_note: MakeNote
) -> None:
    patient, other = make_patient(), make_patient()
    make_note(patient)
    make_note(patient)
    kept = make_note(other)

    response = client.delete(f"/patients/{patient.id}")

    assert response.status_code == 204
    remaining = db.scalars(select(PatientNote.id)).all()
    assert remaining == [kept.id]
    assert (
        db.scalar(
            select(func.count())
            .select_from(PatientNote)
            .where(PatientNote.patient_id == patient.id)
        )
        == 0
    )


def test_nul_character_in_note_is_rejected_without_leaking_content(client, make_patient, caplog):
    patient = make_patient()

    response = client.post(
        f"/patients/{patient.id}/notes",
        json={"timestamp": "2020-01-01T00:00:00Z", "content": "secret\u0000text"},
    )

    assert response.status_code == 422
    assert "secret" not in caplog.text

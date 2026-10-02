import uuid
from collections.abc import Callable
from datetime import UTC, date, datetime
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.models import BloodType, Patient, PatientNote, PatientStatus
from app.services import llm

MakePatient = Callable[..., Patient]
MakeNote = Callable[..., PatientNote]

SUMMARY_KEYS = {
    "patient_id", "name", "age", "blood_type", "conditions", "allergies",
    "narrative", "note_count", "source", "generated_at",
}  # fmt: skip


@pytest.fixture
def llm_enabled(monkeypatch: pytest.MonkeyPatch) -> Settings:
    """Make the summary service see an API key without touching the cached global settings."""
    settings = get_settings().model_copy(
        update={
            "llm_summary_enabled": True,
            "llm_api_key": "test-key",
            "llm_model": "test-model",
        }
    )
    monkeypatch.setattr("app.services.summary.get_settings", lambda: settings)
    return settings


@pytest.fixture
def llm_calls(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str, str]]:
    """Replace the LLM with a stub that records its arguments and returns fixed text."""
    calls: list[tuple[str, str, str]] = []

    def fake_generate(api_key: str, model: str, patient_context: str) -> str:
        calls.append((api_key, model, patient_context))
        return "LLM says this patient is called Somebody Else and is 99 years old."

    monkeypatch.setattr(llm, "generate_narrative", fake_generate)
    return calls


@pytest.fixture
def patient(make_patient: MakePatient, frozen_today: date) -> Patient:
    return make_patient(
        first_name="Zelda",
        last_name="Quill",
        date_of_birth=date(1985, 4, 12),  # 41 on FROZEN_TODAY (2026-06-15)
        blood_type=BloodType.O_POS,
        conditions=["Hypertension", "Asthma"],
        allergies=["Penicillin", "Latex"],
        status=PatientStatus.ACTIVE,
        last_visit=date(2026, 5, 2),
    )


def _summary(client: TestClient, patient_id: object) -> dict[str, Any]:
    response = client.get(f"/patients/{patient_id}/summary")
    assert response.status_code == 200, response.text
    return response.json()


# ---------------------------------------------------------------- errors


def test_summary_returns_404_for_unknown_patient(client: TestClient) -> None:
    response = client.get(f"/patients/{uuid.uuid4()}/summary")

    assert response.status_code == 404
    assert response.json() == {"detail": "Patient not found"}


def test_summary_returns_422_for_malformed_id(client: TestClient) -> None:
    response = client.get("/patients/abc/summary")

    assert response.status_code == 422


# ---------------------------------------------------------------- template


def test_summary_returns_profile_fields(client: TestClient, patient: Patient) -> None:
    body = _summary(client, patient.id)

    assert set(body) == SUMMARY_KEYS
    assert body["patient_id"] == str(patient.id)
    assert body["name"] == "Zelda Quill"
    assert body["age"] == 41
    assert body["blood_type"] == "O+"
    assert body["conditions"] == ["Hypertension", "Asthma"]
    assert body["allergies"] == ["Penicillin", "Latex"]
    assert body["source"] == "template"
    assert body["note_count"] == 0


def test_template_narrative_mentions_identity_and_clinical_facts(
    client: TestClient, patient: Patient
) -> None:
    narrative = _summary(client, patient.id)["narrative"]

    assert "Zelda Quill" in narrative
    assert "41-year-old" in narrative
    assert "blood type O+" in narrative
    assert "active status" in narrative
    assert "last visit on 2 May 2026" in narrative
    for item in ("Hypertension", "Asthma", "Penicillin", "Latex"):
        assert item in narrative


def test_template_narrative_with_no_notes_says_so(client: TestClient, patient: Patient) -> None:
    body = _summary(client, patient.id)

    assert "No clinical notes have been recorded." in body["narrative"]
    assert body["note_count"] == 0


def test_template_narrative_handles_unknown_blood_type_and_empty_lists(
    client: TestClient, make_patient: MakePatient
) -> None:
    patient = make_patient(blood_type=None, conditions=[], allergies=[], last_visit=None)

    body = _summary(client, patient.id)

    assert body["blood_type"] is None
    assert "unknown blood type" in body["narrative"]
    assert "No known conditions." in body["narrative"]
    assert "No known allergies." in body["narrative"]
    assert "no recorded visits" in body["narrative"]


def test_template_narrative_summarizes_latest_three_notes_chronologically(
    client: TestClient, patient: Patient, make_note: MakeNote
) -> None:
    # Inserted out of order to prove the summary sorts by timestamp, not insertion.
    for day, label in [(4, "Fourth"), (1, "First"), (5, "Fifth"), (2, "Second"), (3, "Third")]:
        make_note(
            patient,
            timestamp=datetime(2026, 3, day, 9, 0, tzinfo=UTC),
            content=f"{label} visit finding. Extra detail not in summary.",
        )

    body = _summary(client, patient.id)

    narrative = body["narrative"]
    assert body["note_count"] == 5
    assert "5 clinical notes were recorded between 1 Mar 2026 and 5 Mar 2026." in narrative
    assert "First visit" not in narrative
    assert "Second visit" not in narrative
    third = narrative.index("On 3 Mar 2026: Third visit finding.")
    fourth = narrative.index("On 4 Mar 2026: Fourth visit finding.")
    fifth = narrative.index("On 5 Mar 2026: Fifth visit finding.")
    assert third < fourth < fifth
    assert "Extra detail" not in narrative


def test_summary_reflects_notes_added_later(
    client: TestClient, patient: Patient, make_note: MakeNote
) -> None:
    _summary(client, patient.id)
    make_note(patient, content="New finding today.")

    body = _summary(client, patient.id)

    assert body["note_count"] == 1
    assert "New finding today." in body["narrative"]


# ---------------------------------------------------------------- LLM


def test_summary_does_not_call_llm_without_api_key(
    client: TestClient, patient: Patient, llm_calls: list[tuple[str, str, str]]
) -> None:
    body = _summary(client, patient.id)

    assert llm_calls == []
    assert body["source"] == "template"


def test_summary_uses_llm_narrative_when_key_set(
    client: TestClient,
    patient: Patient,
    make_note: MakeNote,
    llm_enabled: Settings,
    llm_calls: list[tuple[str, str, str]],
) -> None:
    make_note(patient, content="Reports mild headaches.")

    body = _summary(client, patient.id)

    assert body["source"] == "llm"
    assert body["narrative"] == (
        "LLM says this patient is called Somebody Else and is 99 years old."
    )
    # Identifiers and clinical lists always come from the DB, never from the LLM text.
    assert body["name"] == "Zelda Quill"
    assert body["age"] == 41
    assert body["blood_type"] == "O+"
    assert body["conditions"] == ["Hypertension", "Asthma"]
    assert body["allergies"] == ["Penicillin", "Latex"]
    assert body["note_count"] == 1
    [(api_key, model, context)] = llm_calls
    assert (api_key, model) == ("test-key", "test-model")
    assert "Zelda" not in context and "Quill" not in context  # name is never sent
    assert "Reports mild headaches." in context


@pytest.mark.parametrize("llm_result", [None, ""], ids=["none", "empty"])
@pytest.mark.usefixtures("llm_enabled")
def test_summary_falls_back_to_template_when_llm_returns_nothing(
    client: TestClient,
    patient: Patient,
    monkeypatch: pytest.MonkeyPatch,
    llm_result: str | None,
) -> None:
    monkeypatch.setattr(llm, "generate_narrative", lambda *_: llm_result)

    body = _summary(client, patient.id)

    assert body["source"] == "template"
    assert "Zelda Quill is a 41-year-old patient" in body["narrative"]


@pytest.mark.parametrize(
    "error",
    [
        httpx.ReadTimeout("timed out"),
        httpx.ConnectError("connection refused"),
    ],
    ids=["timeout", "connect-error"],
)
@pytest.mark.usefixtures("llm_enabled")
def test_summary_falls_back_to_template_when_llm_http_call_fails(
    client: TestClient, patient: Patient, monkeypatch: pytest.MonkeyPatch, error: Exception
) -> None:
    # Mock at the network boundary so the real generate_narrative error handling runs.
    def raise_error(*_: object, **__: object) -> httpx.Response:
        raise error

    monkeypatch.setattr(llm.httpx, "post", raise_error)

    body = _summary(client, patient.id)

    assert body["source"] == "template"
    assert "Zelda Quill is a 41-year-old patient" in body["narrative"]


@pytest.mark.parametrize(
    "payload",
    [
        {"content": []},
        {"content": None},
        {"content": [{"type": "text", "text": None}]},
    ],
    ids=["empty-content", "null-content", "null-text"],
)
@pytest.mark.usefixtures("llm_enabled")
def test_summary_falls_back_to_template_when_llm_response_is_malformed(
    client: TestClient,
    patient: Patient,
    monkeypatch: pytest.MonkeyPatch,
    payload: dict[str, Any],
) -> None:
    # Spec 09: "Any error, timeout or empty output -> template"; "Never 5xx because of the LLM."
    def ok_but_malformed(url: str, **_: object) -> httpx.Response:
        return httpx.Response(200, json=payload, request=httpx.Request("POST", url))

    monkeypatch.setattr(llm.httpx, "post", ok_but_malformed)
    no_raise_client = TestClient(client.app, raise_server_exceptions=False)

    response = no_raise_client.get(f"/patients/{patient.id}/summary")

    assert response.status_code == 200
    assert response.json()["source"] == "template"


def test_llm_is_not_called_with_key_but_flag_off(
    client: TestClient,
    patient: Patient,
    monkeypatch: pytest.MonkeyPatch,
    llm_enabled: Settings,
    llm_calls: list[tuple[str, str, str]],
) -> None:
    settings = llm_enabled.model_copy(update={"llm_summary_enabled": False})
    monkeypatch.setattr("app.services.summary.get_settings", lambda: settings)

    body = _summary(client, patient.id)

    assert body["source"] == "template"
    assert llm_calls == []


def test_llm_prompt_is_redacted(
    client: TestClient,
    patient: Patient,
    make_note: MakeNote,
    llm_enabled: Settings,
    llm_calls: list[tuple[str, str, str]],
) -> None:
    make_note(
        patient,
        content=(
            "Zelda Quill (zelda@example.com, 555-123-4567) seen 2026-05-02 at 89 Main Street. "
            "BP 132/84, continue lisinopril."
        ),
    )

    _summary(client, patient.id)

    [(_, _, context)] = llm_calls
    for leaked in ["Zelda", "Quill", "zelda@example.com", "555-123", "2026", "89 Main"]:
        assert leaked not in context
    assert "lisinopril" in context
    assert "Age: 41" in context


def test_llm_output_placeholders_are_cleaned(
    client: TestClient,
    patient: Patient,
    monkeypatch: pytest.MonkeyPatch,
    llm_enabled: Settings,
) -> None:
    monkeypatch.setattr(llm, "generate_narrative", lambda *_: "[REDACTED] has hypertension [DATE].")

    body = _summary(client, patient.id)

    assert body["narrative"] == "the patient has hypertension ."

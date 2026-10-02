"""Request-body builders for API tests. All values are obviously fake."""

from typing import Any


def patient_body(**overrides: Any) -> dict[str, Any]:
    """Minimal valid POST/PUT /patients body."""
    body: dict[str, Any] = {
        "first_name": "Zelda",
        "last_name": "Quill",
        "date_of_birth": "1985-04-12",
    }
    body.update(overrides)
    return body


def full_patient_body(**overrides: Any) -> dict[str, Any]:
    """POST/PUT /patients body with every accepted field set."""
    body = patient_body(
        email="zelda.quill@example.com",
        phone="+1 555 0100",
        address_line1="1 Test Lane",
        address_line2="Unit 2",
        city="Testville",
        state="TS",
        postal_code="00001",
        blood_type="O+",
        allergies=["Penicillin"],
        conditions=["Hypertension"],
        status="critical",
        last_visit="2026-01-10",
    )
    body.update(overrides)
    return body


def note_body(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "timestamp": "2026-01-15T10:15:00Z",
        "content": "Follow-up visit. Blood pressure stable.",
    }
    body.update(overrides)
    return body

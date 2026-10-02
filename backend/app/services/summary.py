import re
import uuid
from datetime import UTC, date, datetime

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Patient, PatientNote
from app.schemas.patient import calculate_age
from app.schemas.summary import PatientSummary
from app.services import llm
from app.services.notes import list_notes
from app.services.patients import get_patient
from app.services.redaction import age_bucket, redact

RECENT_NOTES = 3
MAX_SNIPPET = 200
LLM_MAX_NOTES = 20


def _join(items: list[str]) -> str:
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " and " + items[-1]


def _fmt(d: date | datetime) -> str:
    return f"{d.day} {d:%b %Y}"


def _first_sentence(text: str) -> str:
    text = " ".join(text.split())
    match = re.search(r"[.!?](\s|$)", text)
    sentence = text[: match.start() + 1] if match else text
    if len(sentence) > MAX_SNIPPET:
        sentence = sentence[: MAX_SNIPPET - 1].rstrip() + "…"
    return sentence


def _identity_sentence(patient: Patient, age: int) -> str:
    blood = f"blood type {patient.blood_type.value}" if patient.blood_type else "unknown blood type"
    visit = (
        f"last visit on {_fmt(patient.last_visit)}" if patient.last_visit else "no recorded visits"
    )
    return (
        f"{patient.first_name} {patient.last_name} is a {age}-year-old patient "
        f"({blood}) with {patient.status.value} status and {visit}."
    )


def _clinical_sentence(patient: Patient) -> str:
    conditions = (
        f"Known conditions: {_join(patient.conditions)}."
        if patient.conditions
        else "No known conditions."
    )
    allergies = (
        f"Known allergies: {_join(patient.allergies)}."
        if patient.allergies
        else "No known allergies."
    )
    return f"{conditions} {allergies}"


def _notes_narrative(notes: list[PatientNote]) -> str:
    """`notes` is newest first."""
    if not notes:
        return "No clinical notes have been recorded."
    count = len(notes)
    oldest, newest = notes[-1].timestamp, notes[0].timestamp
    span = (
        f"on {_fmt(newest)}"
        if oldest.date() == newest.date()
        else f"between {_fmt(oldest)} and {_fmt(newest)}"
    )
    label = "note was" if count == 1 else "notes were"
    parts = [f"{count} clinical {label} recorded {span}."]
    for note in reversed(notes[:RECENT_NOTES]):
        parts.append(f"On {_fmt(note.timestamp)}: {_first_sentence(note.content)}")
    return " ".join(parts)


def _template_narrative(patient: Patient, age: int, notes: list[PatientNote]) -> str:
    return " ".join(
        [_identity_sentence(patient, age), _clinical_sentence(patient), _notes_narrative(notes)]
    )


def _llm_context(patient: Patient, age: int, notes: list[PatientNote]) -> str:
    """Redacted prompt data. No name, no dates, no contact details: only what a clinical
    summary needs, with the patient's own identifiers masked wherever they appear in text."""
    identifiers = [
        patient.first_name,
        patient.last_name,
        f"{patient.first_name} {patient.last_name}",
        patient.email,
        patient.phone,
        patient.address_line1,
        patient.address_line2,
        patient.city,
        patient.postal_code,
    ]

    def clean(text: str) -> str:
        return redact(text, identifiers)

    recent = notes[:LLM_MAX_NOTES]
    lines = [
        f"Age: {age_bucket(age)}",
        f"Blood type: {patient.blood_type.value if patient.blood_type else 'unknown'}",
        f"Status: {patient.status.value}",
        f"Conditions: {clean(', '.join(patient.conditions)) or 'none'}",
        f"Allergies: {clean(', '.join(patient.allergies)) or 'none'}",
        "Notes (oldest first, dates removed):",
    ]
    lines += [f"- {clean(n.content)}" for n in reversed(recent)]
    return "\n".join(lines)


def _restore_placeholders(text: str) -> str:
    """The model may echo our redaction tokens; show them as plain wording instead."""
    text = re.sub(r"\[(?:REDACTED|NAME)\]", "the patient", text)
    return re.sub(r"\[[A-Z]+\]", "", text).replace("  ", " ").strip()


def build_summary(db: Session, patient_id: uuid.UUID) -> PatientSummary:
    patient = get_patient(db, patient_id)
    notes = list_notes(db, patient_id)
    age = calculate_age(patient.date_of_birth)

    narrative: str | None = None
    source = "template"
    settings = get_settings()
    if settings.llm_summary_enabled and settings.llm_api_key:
        narrative = llm.generate_narrative(
            settings.llm_api_key, settings.llm_model, _llm_context(patient, age, notes)
        )
        if narrative:
            narrative = _restore_placeholders(narrative)
            source = "llm"
    if not narrative:
        narrative = _template_narrative(patient, age, notes)

    return PatientSummary(
        patient_id=patient.id,
        name=f"{patient.first_name} {patient.last_name}",
        age=age,
        blood_type=patient.blood_type,
        conditions=patient.conditions,
        allergies=patient.allergies,
        narrative=narrative,
        note_count=len(notes),
        source=source,
        generated_at=datetime.now(UTC),
    )

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import NotFoundError
from app.models import PatientNote
from app.schemas.note import NoteIn
from app.services.patients import get_patient


def list_notes(db: Session, patient_id: uuid.UUID) -> list[PatientNote]:
    get_patient(db, patient_id)
    stmt = (
        select(PatientNote)
        .where(PatientNote.patient_id == patient_id)
        .order_by(PatientNote.timestamp.desc(), PatientNote.created_at.desc())
    )
    return list(db.scalars(stmt).all())


def create_note(db: Session, patient_id: uuid.UUID, data: NoteIn) -> PatientNote:
    get_patient(db, patient_id)
    note = PatientNote(patient_id=patient_id, **data.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def delete_note(db: Session, patient_id: uuid.UUID, note_id: uuid.UUID) -> None:
    get_patient(db, patient_id)
    note = db.scalar(
        select(PatientNote).where(PatientNote.id == note_id, PatientNote.patient_id == patient_id)
    )
    if note is None:
        raise NotFoundError("Note not found")
    db.delete(note)
    db.commit()


def count_notes(db: Session, patient_id: uuid.UUID) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(PatientNote)
            .where(PatientNote.patient_id == patient_id)
        )
        or 0
    )

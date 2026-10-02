import uuid

from sqlalchemy import Select, String, func, select
from sqlalchemy.orm import Session

from app.errors import NotFoundError
from app.models import Patient, PatientStatus
from app.schemas.patient import PatientIn, SortField, SortOrder


def get_patient(db: Session, patient_id: uuid.UUID) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise NotFoundError("Patient not found")
    return patient


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _filtered(search: str | None, status: PatientStatus | None) -> Select:
    stmt = select(Patient)
    if search:
        pattern = f"%{_escape_like(search)}%"
        full_name = Patient.first_name + " " + Patient.last_name
        stmt = stmt.where(full_name.ilike(pattern, escape="\\"))
    if status:
        stmt = stmt.where(Patient.status == status)
    return stmt


def _order_by(sort: SortField, order: SortOrder) -> list:
    asc = order == "asc"
    if sort == "name":
        cols = [Patient.last_name, Patient.first_name]
    elif sort == "age":
        # Older patients have earlier birth dates, so ascending age is descending DOB.
        cols = [Patient.date_of_birth]
        asc = not asc
    elif sort == "status":
        cols = [Patient.status.cast(String)]
    elif sort == "last_visit":
        col = Patient.last_visit
        return [col.asc().nulls_last() if asc else col.desc().nulls_last(), Patient.id]
    else:
        cols = [Patient.created_at]
    return [c.asc() if asc else c.desc() for c in cols] + [Patient.id]


def list_patients(
    db: Session,
    *,
    page: int,
    page_size: int,
    search: str | None,
    status: PatientStatus | None,
    sort: SortField,
    order: SortOrder,
) -> tuple[list[Patient], int]:
    stmt = _filtered(search, status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(*_order_by(sort, order)).limit(page_size).offset((page - 1) * page_size)
    ).all()
    return list(rows), total


def create_patient(db: Session, data: PatientIn) -> Patient:
    patient = Patient(**data.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def update_patient(db: Session, patient_id: uuid.UUID, data: PatientIn) -> Patient:
    patient = get_patient(db, patient_id)
    for field, value in data.model_dump().items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient


def delete_patient(db: Session, patient_id: uuid.UUID) -> None:
    patient = get_patient(db, patient_id)
    db.delete(patient)
    db.commit()

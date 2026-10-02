import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Response
from fastapi import status as http_status

from app.api.deps import DbSession
from app.models import PatientStatus
from app.schemas.common import CONTROL_CHARS_PATTERN
from app.schemas.patient import PatientIn, PatientOut, PatientPage, SortField, SortOrder
from app.services import patients as service

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=PatientPage)
def list_patients(
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=100, pattern=CONTROL_CHARS_PATTERN)] = None,
    status: PatientStatus | None = None,
    sort: SortField = "name",
    order: SortOrder = "asc",
) -> PatientPage:
    items, total = service.list_patients(
        db,
        page=page,
        page_size=page_size,
        search=(search or "").strip() or None,
        status=status,
        sort=sort,
        order=order,
    )
    return PatientPage(items=items, total=total, page=page, page_size=page_size)


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: uuid.UUID, db: DbSession):
    return service.get_patient(db, patient_id)


@router.post("", response_model=PatientOut, status_code=http_status.HTTP_201_CREATED)
def create_patient(body: PatientIn, db: DbSession):
    return service.create_patient(db, body)


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: uuid.UUID, body: PatientIn, db: DbSession):
    return service.update_patient(db, patient_id, body)


@router.delete("/{patient_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: uuid.UUID, db: DbSession) -> Response:
    service.delete_patient(db, patient_id)
    return Response(status_code=http_status.HTTP_204_NO_CONTENT)

import uuid

from fastapi import APIRouter

from app.api.deps import DbSession
from app.schemas.summary import PatientSummary
from app.services import summary as service

router = APIRouter(prefix="/patients/{patient_id}/summary", tags=["summary"])


@router.get("", response_model=PatientSummary)
def get_summary(patient_id: uuid.UUID, db: DbSession):
    return service.build_summary(db, patient_id)

import uuid

from fastapi import APIRouter, Response, status

from app.api.deps import DbSession
from app.schemas.note import NoteIn, NoteList, NoteOut
from app.services import notes as service

router = APIRouter(prefix="/patients/{patient_id}/notes", tags=["notes"])


@router.get("", response_model=NoteList)
def list_notes(patient_id: uuid.UUID, db: DbSession) -> NoteList:
    items = service.list_notes(db, patient_id)
    return NoteList(items=items, total=len(items))


@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(patient_id: uuid.UUID, body: NoteIn, db: DbSession):
    return service.create_note(db, patient_id, body)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(patient_id: uuid.UUID, note_id: uuid.UUID, db: DbSession) -> Response:
    service.delete_note(db, patient_id, note_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

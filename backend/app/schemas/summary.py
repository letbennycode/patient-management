import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models.enums import BloodType


class PatientSummary(BaseModel):
    patient_id: uuid.UUID
    name: str
    age: int
    blood_type: BloodType | None
    conditions: list[str]
    allergies: list[str]
    narrative: str
    note_count: int
    source: Literal["template", "llm"]
    generated_at: datetime

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    StringConstraints,
    field_validator,
    model_validator,
)
from pydantic_core import PydanticCustomError

from app.schemas.common import reject_control_chars

FUTURE_SKEW = timedelta(minutes=5)


class NoteIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timestamp: AwareDatetime
    content: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]

    _no_control_chars = model_validator(mode="before")(reject_control_chars)

    @field_validator("timestamp")
    @classmethod
    def not_in_future(cls, value: datetime) -> datetime:
        if value > datetime.now(UTC) + FUTURE_SKEW:
            raise PydanticCustomError("timestamp_future", "Time can't be in the future")
        return value


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    timestamp: datetime
    content: str
    created_at: datetime


class NoteList(BaseModel):
    items: list[NoteOut]
    total: int

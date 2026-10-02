import re
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Any, Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    computed_field,
    field_validator,
    model_validator,
)
from pydantic_core import PydanticCustomError

from app.models.enums import BloodType, PatientStatus
from app.schemas.common import reject_control_chars

MIN_DOB = date(1900, 1, 1)
PHONE_RE = re.compile(r"^[\d\s+\-().]{7,32}$")
MAX_LIST_ITEMS = 50
MAX_ITEM_LENGTH = 100

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


def today_utc() -> date:
    return datetime.now(UTC).date()


def latest_allowed_date() -> date:
    """Today in UTC plus one day, so users east of UTC can enter their local "today"."""
    return today_utc() + timedelta(days=1)


def calculate_age(date_of_birth: date, today: date | None = None) -> int:
    today = today or today_utc()
    had_birthday = (today.month, today.day) >= (date_of_birth.month, date_of_birth.day)
    return today.year - date_of_birth.year - (0 if had_birthday else 1)


def _blank_to_none(value: Any) -> Any:
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def _clean_list(value: Any) -> Any:
    """Trim items, drop case-insensitive duplicates, enforce 1-100 chars and <= 50 items."""
    if not isinstance(value, list):
        return value
    seen: set[str] = set()
    cleaned: list[str] = []
    for item in value:
        if not isinstance(item, str):
            raise PydanticCustomError("list_item", "Each entry must be text")
        item = item.strip()
        if not item or len(item) > MAX_ITEM_LENGTH:
            raise PydanticCustomError(
                "list_item", f"Each entry must be 1 to {MAX_ITEM_LENGTH} characters"
            )
        if item.lower() not in seen:
            seen.add(item.lower())
            cleaned.append(item)
    if len(cleaned) > MAX_LIST_ITEMS:
        raise PydanticCustomError("list_length", f"Up to {MAX_LIST_ITEMS} entries are allowed")
    return cleaned


class PatientIn(BaseModel):
    """Body for POST and PUT. PUT is a full replacement, so omitted optionals reset."""

    model_config = ConfigDict(extra="forbid")

    first_name: Name
    last_name: Name
    date_of_birth: date
    email: EmailStr | None = None
    phone: str | None = None
    address_line1: Annotated[str, Field(max_length=200)] | None = None
    address_line2: Annotated[str, Field(max_length=200)] | None = None
    city: Annotated[str, Field(max_length=100)] | None = None
    state: Annotated[str, Field(max_length=100)] | None = None
    postal_code: Annotated[str, Field(max_length=20)] | None = None
    blood_type: BloodType | None = None
    allergies: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    status: PatientStatus = PatientStatus.ACTIVE
    last_visit: date | None = None

    _no_control_chars = model_validator(mode="before")(reject_control_chars)

    @field_validator(
        "email", "phone", "address_line1", "address_line2", "city", "state", "postal_code",
        mode="before",
    )  # fmt: skip
    @classmethod
    def blank_optional_to_none(cls, value: Any) -> Any:
        return _blank_to_none(value)

    @field_validator("allergies", "conditions", mode="before")
    @classmethod
    def clean_lists(cls, value: Any) -> Any:
        return _clean_list(value)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, value: str | None) -> str | None:
        if value is not None and not PHONE_RE.match(value):
            raise PydanticCustomError(
                "phone", "Phone must be 7 to 32 characters: digits, spaces and + - ( ) ."
            )
        return value

    @field_validator("date_of_birth")
    @classmethod
    def check_dob(cls, value: date) -> date:
        if value > latest_allowed_date():
            raise PydanticCustomError("dob_future", "Date of birth cannot be in the future")
        if value < MIN_DOB:
            raise PydanticCustomError("dob_past", "Date of birth must be after 1900")
        return value

    @field_validator("last_visit")
    @classmethod
    def check_last_visit(cls, value: date | None) -> date | None:
        if value is not None and value > latest_allowed_date():
            raise PydanticCustomError("visit_future", "Last visit cannot be in the future")
        return value

    @model_validator(mode="after")
    def check_visit_after_dob(self) -> Self:
        if self.last_visit and self.last_visit < self.date_of_birth:
            raise PydanticCustomError(
                "visit_before_dob", "Last visit cannot be before date of birth"
            )
        return self


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str
    date_of_birth: date
    email: str | None
    phone: str | None
    address_line1: str | None
    address_line2: str | None
    city: str | None
    state: str | None
    postal_code: str | None
    blood_type: BloodType | None
    allergies: list[str]
    conditions: list[str]
    status: PatientStatus
    last_visit: date | None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def age(self) -> int:
        return calculate_age(self.date_of_birth)


class PatientListItem(BaseModel):
    """Row of GET /patients: only what the list shows, not contact or clinical details."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str
    date_of_birth: date = Field(exclude=True)
    status: PatientStatus
    last_visit: date | None

    @computed_field
    @property
    def age(self) -> int:
        return calculate_age(self.date_of_birth)


class PatientPage(BaseModel):
    items: list[PatientListItem]
    total: int
    page: int
    page_size: int


SortField = Literal["name", "age", "last_visit", "status", "created_at"]
SortOrder = Literal["asc", "desc"]

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Index, String, func, text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import BloodType, PatientStatus


def _enum(enum_cls: type, name: str) -> Enum:
    return Enum(enum_cls, name=name, values_callable=lambda e: [m.value for m in e])


class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = (
        Index("ix_patients_name", "last_name", "first_name"),
        Index("ix_patients_status", "status"),
        Index("ix_patients_last_visit", "last_visit"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    date_of_birth: Mapped[date] = mapped_column(Date)
    email: Mapped[str | None] = mapped_column(String(254))
    phone: Mapped[str | None] = mapped_column(String(32))
    address_line1: Mapped[str | None] = mapped_column(String(200))
    address_line2: Mapped[str | None] = mapped_column(String(200))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    blood_type: Mapped[BloodType | None] = mapped_column(_enum(BloodType, "blood_type"))
    allergies: Mapped[list[str]] = mapped_column(
        ARRAY(String), server_default=text("'{}'"), default=list
    )
    conditions: Mapped[list[str]] = mapped_column(
        ARRAY(String), server_default=text("'{}'"), default=list
    )
    status: Mapped[PatientStatus] = mapped_column(
        _enum(PatientStatus, "patient_status"),
        server_default=PatientStatus.ACTIVE.value,
        default=PatientStatus.ACTIVE,
    )
    last_visit: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    notes: Mapped[list["PatientNote"]] = relationship(  # noqa: F821
        back_populates="patient", passive_deletes=True
    )

"""create patients

Revision ID: 0001
Revises:
Create Date: 2026-10-01
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

BLOOD_TYPES = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
STATUSES = ("active", "inactive", "critical")


def upgrade() -> None:
    blood_type = postgresql.ENUM(*BLOOD_TYPES, name="blood_type", create_type=False)
    status = postgresql.ENUM(*STATUSES, name="patient_status", create_type=False)
    blood_type.create(op.get_bind(), checkfirst=True)
    status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "patients",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("date_of_birth", sa.Date, nullable=False),
        sa.Column("email", sa.String(254)),
        sa.Column("phone", sa.String(32)),
        sa.Column("address_line1", sa.String(200)),
        sa.Column("address_line2", sa.String(200)),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(100)),
        sa.Column("postal_code", sa.String(20)),
        sa.Column("blood_type", blood_type),
        sa.Column(
            "allergies", postgresql.ARRAY(sa.String), nullable=False, server_default=sa.text("'{}'")
        ),
        sa.Column(
            "conditions",
            postgresql.ARRAY(sa.String),
            nullable=False,
            server_default=sa.text("'{}'"),
        ),
        sa.Column("status", status, nullable=False, server_default="active"),
        sa.Column("last_visit", sa.Date),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_patients_name", "patients", ["last_name", "first_name"])
    op.create_index("ix_patients_status", "patients", ["status"])
    op.create_index("ix_patients_last_visit", "patients", ["last_visit"])


def downgrade() -> None:
    op.drop_table("patients")
    op.execute("DROP TYPE IF EXISTS patient_status")
    op.execute("DROP TYPE IF EXISTS blood_type")

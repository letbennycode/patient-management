"""Idempotent seed of fake patients and notes. Never log field values, only counts."""

import logging
import random
from datetime import UTC, date, datetime, timedelta

from faker import Faker
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import BloodType, Patient, PatientNote, PatientStatus

logger = logging.getLogger(__name__)

SEED = 20240601
PATIENT_COUNT = 120

ALLERGIES = ["Penicillin", "Peanuts", "Shellfish", "Latex", "Sulfa drugs", "Pollen", "Aspirin"]
CONDITIONS = [
    "Hypertension",
    "Type 2 diabetes",
    "Asthma",
    "Hyperlipidemia",
    "Osteoarthritis",
    "Migraine",
    "Hypothyroidism",
    "Anxiety",
]
NOTE_TEMPLATES = [
    "Follow-up for hypertension; BP 132/84, continue current medication.",
    "Routine check-up. Vitals within normal limits. No new complaints.",
    "Patient reports mild headaches for two weeks. Advised hydration and rest.",
    "Blood work ordered. Fasting glucose slightly elevated; recommend diet review.",
    "Seasonal allergy flare-up. Prescribed antihistamine. Review in four weeks.",
    "Discussed medication adherence. Patient reports no side effects.",
    "Reported knee pain after exercise. Recommended physiotherapy and rest.",
    "Vaccination administered without complication. Observed for 15 minutes.",
    "Patient anxious about upcoming procedure. Counselled and provided written information.",
    "Cough and congestion for five days. Lungs clear. Supportive care advised.",
]
STATUS_WEIGHTS = [
    (PatientStatus.ACTIVE, 70),
    (PatientStatus.INACTIVE, 18),
    (PatientStatus.CRITICAL, 12),
]


def _build_patient(fake: Faker, rng: random.Random, today: date) -> Patient:
    age_days = rng.randint(0, 95 * 365)
    dob = today - timedelta(days=age_days)
    last_visit = None
    if rng.random() > 0.10:
        earliest = max(dob, today - timedelta(days=730))
        last_visit = fake.date_between(start_date=earliest, end_date=today)
    blood_type = None if rng.random() < 0.15 else rng.choice(list(BloodType))
    status = rng.choices([s for s, _ in STATUS_WEIGHTS], weights=[w for _, w in STATUS_WEIGHTS])[0]
    first, last = fake.first_name(), fake.last_name()
    return Patient(
        first_name=first,
        last_name=last,
        date_of_birth=dob,
        email=f"{first}.{last}@example.com".lower().replace("'", "").replace(" ", ""),
        phone=fake.numerify("+1 555 ### ####"),
        address_line1=fake.street_address(),
        address_line2=fake.secondary_address() if rng.random() < 0.2 else None,
        city=fake.city(),
        state=fake.state_abbr(),
        postal_code=fake.postcode(),
        blood_type=blood_type,
        allergies=rng.sample(ALLERGIES, rng.randint(0, 3)),
        conditions=rng.sample(CONDITIONS, rng.randint(0, 4)),
        status=status,
        last_visit=last_visit,
    )


def seed_if_empty(db: Session) -> int:
    """Insert fake data when the patients table is empty. Returns patients inserted."""
    if db.scalar(select(func.count()).select_from(Patient)):
        return 0

    fake = Faker("en_US")
    fake.seed_instance(SEED)
    rng = random.Random(SEED)
    today = datetime.now(UTC).date()
    now = datetime.now(UTC)

    patients = [_build_patient(fake, rng, today) for _ in range(PATIENT_COUNT)]
    db.add_all(patients)
    db.flush()

    note_count = 0
    for patient in patients:
        earliest = max(
            datetime.combine(patient.date_of_birth, datetime.min.time(), UTC),
            now - timedelta(days=730),
        )
        span = int((now - earliest).total_seconds())
        for _ in range(rng.randint(0, 5)):
            db.add(
                PatientNote(
                    patient_id=patient.id,
                    timestamp=earliest + timedelta(seconds=rng.randint(0, span)),
                    content=rng.choice(NOTE_TEMPLATES),
                )
            )
            note_count += 1
    db.commit()
    logger.info("Seeded %d patients and %d notes", len(patients), note_count)
    return len(patients)

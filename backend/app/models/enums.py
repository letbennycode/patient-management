from enum import StrEnum


class PatientStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    CRITICAL = "critical"


class BloodType(StrEnum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"

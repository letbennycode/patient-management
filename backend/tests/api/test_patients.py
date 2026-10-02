import uuid
from collections.abc import Callable
from datetime import date
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.models import Patient, PatientStatus
from tests.factories import full_patient_body, patient_body

PATIENT_KEYS = {
    "id", "first_name", "last_name", "date_of_birth", "age", "email", "phone",
    "address_line1", "address_line2", "city", "state", "postal_code", "blood_type",
    "allergies", "conditions", "status", "last_visit", "created_at", "updated_at",
}  # fmt: skip

MakePatient = Callable[..., Patient]


def _names(response_json: dict[str, Any]) -> list[str]:
    return [f"{p['first_name']} {p['last_name']}" for p in response_json["items"]]


def _error_for(detail: list[dict[str, Any]], field: str) -> dict[str, Any]:
    """Return the 422 error entry whose loc ends with `field`."""
    matches = [e for e in detail if e["loc"][-1] == field]
    assert matches, f"no error for {field!r} in {detail}"
    return matches[0]


# ---------------------------------------------------------------- list: pagination


def test_list_patients_returns_page_envelope_with_defaults(
    client: TestClient, make_patient: MakePatient
) -> None:
    make_patient()
    make_patient()

    response = client.get("/patients")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["page"] == 1
    assert body["page_size"] == 20
    assert len(body["items"]) == 2
    assert set(body["items"][0]) == PATIENT_KEYS


def test_list_patients_returns_empty_page_when_no_patients(client: TestClient) -> None:
    response = client.get("/patients")

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0, "page": 1, "page_size": 20}


def test_list_patients_last_page_holds_remaining_items(
    client: TestClient, make_patient: MakePatient
) -> None:
    for _ in range(3):
        make_patient()

    response = client.get("/patients", params={"page": 2, "page_size": 2})

    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    assert body["total"] == 3


def test_list_patients_page_past_end_returns_no_items_with_correct_total(
    client: TestClient, make_patient: MakePatient
) -> None:
    for _ in range(3):
        make_patient()

    response = client.get("/patients", params={"page": 5, "page_size": 2})

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 3, "page": 5, "page_size": 2}


def test_list_patients_accepts_max_page_size(client: TestClient) -> None:
    response = client.get("/patients", params={"page_size": 100})

    assert response.status_code == 200
    assert response.json()["page_size"] == 100


@pytest.mark.parametrize(
    ("params", "field"),
    [
        ({"page_size": 101}, "page_size"),
        ({"page_size": 0}, "page_size"),
        ({"page": 0}, "page"),
        ({"page": "abc"}, "page"),
        ({"sort": "email"}, "sort"),
        ({"order": "sideways"}, "order"),
        ({"status": "deceased"}, "status"),
        ({"search": "x" * 101}, "search"),
    ],
)
def test_list_patients_rejects_invalid_query_params(
    client: TestClient, params: dict[str, Any], field: str
) -> None:
    response = client.get("/patients", params=params)

    assert response.status_code == 422
    assert _error_for(response.json()["detail"], field)["loc"] == ["query", field]


# ---------------------------------------------------------------- list: search and filter


@pytest.fixture
def search_patients(make_patient: MakePatient) -> None:
    make_patient(first_name="Zelda", last_name="Quill", status=PatientStatus.ACTIVE)
    make_patient(first_name="Zeldon", last_name="Marsh", status=PatientStatus.CRITICAL)
    make_patient(first_name="Mona", last_name="Brindle", status=PatientStatus.ACTIVE)


@pytest.mark.parametrize(
    ("term", "expected"),
    [
        ("zeld", ["Zeldon Marsh", "Zelda Quill"]),  # first name, sorted by last name
        ("BRIND", ["Mona Brindle"]),  # last name, case-insensitive
        ("zelda quill", ["Zelda Quill"]),  # full "first last" name
        ("  mona  ", ["Mona Brindle"]),  # surrounding whitespace trimmed
        ("nobody", []),
        ("%", []),  # LIKE wildcards are matched literally
    ],
)
@pytest.mark.usefixtures("search_patients")
def test_list_patients_search_matches_names(
    client: TestClient, term: str, expected: list[str]
) -> None:
    response = client.get("/patients", params={"search": term})

    assert response.status_code == 200
    assert _names(response.json()) == expected
    assert response.json()["total"] == len(expected)


@pytest.mark.usefixtures("search_patients")
def test_list_patients_blank_search_returns_everyone(client: TestClient) -> None:
    response = client.get("/patients", params={"search": "   "})

    assert response.status_code == 200
    assert response.json()["total"] == 3


@pytest.mark.usefixtures("search_patients")
def test_list_patients_filters_by_status(client: TestClient) -> None:
    response = client.get("/patients", params={"status": "critical"})

    assert response.status_code == 200
    assert _names(response.json()) == ["Zeldon Marsh"]


@pytest.mark.usefixtures("search_patients")
def test_list_patients_combines_search_and_status(client: TestClient) -> None:
    response = client.get("/patients", params={"search": "zeld", "status": "active"})

    assert response.status_code == 200
    assert _names(response.json()) == ["Zelda Quill"]
    assert response.json()["total"] == 1


# ---------------------------------------------------------------- list: sorting


@pytest.fixture
def sort_patients(make_patient: MakePatient) -> None:
    # Created in this order, so created_at ascending is Bea, Amy, Cal.
    make_patient(
        first_name="Bea", last_name="Adams", date_of_birth=date(1990, 1, 1),
        last_visit=date(2026, 1, 10), status=PatientStatus.INACTIVE,
    )  # fmt: skip
    make_patient(
        first_name="Amy", last_name="Baker", date_of_birth=date(1950, 1, 1),
        last_visit=None, status=PatientStatus.CRITICAL,
    )  # fmt: skip
    make_patient(
        first_name="Cal", last_name="Baker", date_of_birth=date(2010, 1, 1),
        last_visit=date(2025, 6, 1), status=PatientStatus.ACTIVE,
    )  # fmt: skip


BEA, AMY, CAL = "Bea Adams", "Amy Baker", "Cal Baker"


@pytest.mark.parametrize(
    ("sort", "order", "expected"),
    [
        ("name", "asc", [BEA, AMY, CAL]),  # last name, then first name
        ("name", "desc", [CAL, AMY, BEA]),
        ("age", "asc", [CAL, BEA, AMY]),  # youngest first
        ("age", "desc", [AMY, BEA, CAL]),
        ("last_visit", "asc", [CAL, BEA, AMY]),  # null last
        ("last_visit", "desc", [BEA, CAL, AMY]),  # null still last
        ("status", "asc", [CAL, AMY, BEA]),  # active, critical, inactive (alphabetical)
        ("status", "desc", [BEA, AMY, CAL]),
        ("created_at", "asc", [BEA, AMY, CAL]),
        ("created_at", "desc", [CAL, AMY, BEA]),
    ],
)
@pytest.mark.usefixtures("sort_patients")
def test_list_patients_sorts_by_field_and_order(
    client: TestClient, sort: str, order: str, expected: list[str]
) -> None:
    response = client.get("/patients", params={"sort": sort, "order": order})

    assert response.status_code == 200
    assert _names(response.json()) == expected


@pytest.mark.usefixtures("sort_patients")
def test_list_patients_default_sort_is_name_ascending(client: TestClient) -> None:
    response = client.get("/patients")

    assert _names(response.json()) == [BEA, AMY, CAL]


def test_list_patients_paging_is_stable_when_sort_keys_tie(
    client: TestClient, make_patient: MakePatient
) -> None:
    created = {str(make_patient(first_name="Same", last_name="Name").id) for _ in range(5)}

    pages = [
        client.get("/patients", params={"page": page, "page_size": 2}).json()["items"]
        for page in (1, 2, 3)
    ]

    seen = [p["id"] for items in pages for p in items]
    assert len(seen) == 5
    assert set(seen) == created


# ---------------------------------------------------------------- get


def test_get_patient_returns_patient(client: TestClient, make_patient: MakePatient) -> None:
    patient = make_patient(first_name="Zelda", last_name="Quill", allergies=["Latex"])

    response = client.get(f"/patients/{patient.id}")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == PATIENT_KEYS
    assert body["id"] == str(patient.id)
    assert body["first_name"] == "Zelda"
    assert body["last_name"] == "Quill"
    assert body["allergies"] == ["Latex"]


def test_get_patient_returns_404_when_missing(client: TestClient) -> None:
    response = client.get(f"/patients/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Patient not found"}


def test_get_patient_returns_422_for_malformed_id(client: TestClient) -> None:
    response = client.get("/patients/abc")

    assert response.status_code == 422
    assert _error_for(response.json()["detail"], "patient_id")["loc"] == ["path", "patient_id"]


# ---------------------------------------------------------------- create


def test_create_patient_with_minimal_body_applies_defaults(client: TestClient) -> None:
    response = client.post("/patients", json=patient_body())

    assert response.status_code == 201
    body = response.json()
    assert set(body) == PATIENT_KEYS
    uuid.UUID(body["id"])
    assert body["first_name"] == "Zelda"
    assert body["status"] == "active"
    assert body["allergies"] == []
    assert body["conditions"] == []
    for field in ("email", "phone", "blood_type", "last_visit", "address_line1", "city"):
        assert body[field] is None


def test_create_patient_with_full_body_returns_every_field(client: TestClient) -> None:
    payload = full_patient_body()

    response = client.post("/patients", json=payload)

    assert response.status_code == 201
    body = response.json()
    for field, value in payload.items():
        assert body[field] == value, field


def test_create_patient_persists_patient(client: TestClient) -> None:
    created = client.post("/patients", json=patient_body()).json()

    response = client.get(f"/patients/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_create_patient_trims_names_and_blanks_optional_strings(client: TestClient) -> None:
    payload = patient_body(first_name="  Zelda ", last_name=" Quill", email="", city="   ")

    response = client.post("/patients", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert (body["first_name"], body["last_name"]) == ("Zelda", "Quill")
    assert body["email"] is None
    assert body["city"] is None


def test_create_patient_trims_and_dedupes_list_items(client: TestClient) -> None:
    payload = patient_body(
        allergies=[" Penicillin ", "penicillin", "Peanuts", "PEANUTS"],
        conditions=["Asthma ", " asthma"],
    )

    response = client.post("/patients", json=payload)

    assert response.status_code == 201
    assert response.json()["allergies"] == ["Penicillin", "Peanuts"]
    assert response.json()["conditions"] == ["Asthma"]


@pytest.mark.usefixtures("frozen_today")  # FROZEN_TODAY is 2026-06-15
@pytest.mark.parametrize(
    ("overrides", "field", "message"),
    [
        ({"first_name": "   "}, "first_name", None),
        ({"last_name": ""}, "last_name", None),
        ({"first_name": "x" * 101}, "first_name", None),
        ({"date_of_birth": "2026-06-17"}, "date_of_birth", "Date of birth cannot be in the future"),
        ({"date_of_birth": "1899-12-31"}, "date_of_birth", "Date of birth must be after 1900"),
        ({"date_of_birth": "not-a-date"}, "date_of_birth", None),
        ({"last_visit": "2026-06-17"}, "last_visit", "Last visit cannot be in the future"),
        ({"email": "not-an-email"}, "email", None),
        ({"phone": "call me"}, "phone", "Phone must be 7 to 32 characters"),
        ({"phone": "12345"}, "phone", "Phone must be 7 to 32 characters"),
        ({"phone": "1" * 33}, "phone", "Phone must be 7 to 32 characters"),
        ({"blood_type": "Z+"}, "blood_type", None),
        ({"status": "deceased"}, "status", None),
        ({"allergies": ["Latex", "  "]}, "allergies", "Each entry must be 1 to 100 characters"),
        ({"allergies": ["x" * 101]}, "allergies", "Each entry must be 1 to 100 characters"),
        ({"conditions": [f"c{i}" for i in range(51)]}, "conditions", "Up to 50 entries"),
        ({"conditions": [42]}, "conditions", "Each entry must be text"),
        ({"id": str(uuid.uuid4())}, "id", None),
        ({"age": 40}, "age", None),
        ({"created_at": "2026-01-01T00:00:00Z"}, "created_at", None),
    ],
)
def test_create_patient_rejects_invalid_field(
    client: TestClient, overrides: dict[str, Any], field: str, message: str | None
) -> None:
    response = client.post("/patients", json=patient_body(**overrides))

    assert response.status_code == 422
    error = _error_for(response.json()["detail"], field)
    if message:
        assert message in error["msg"]


@pytest.mark.parametrize("field", ["first_name", "last_name", "date_of_birth"])
def test_create_patient_rejects_missing_required_field(client: TestClient, field: str) -> None:
    payload = patient_body()
    del payload[field]

    response = client.post("/patients", json=payload)

    assert response.status_code == 422
    assert _error_for(response.json()["detail"], field)["type"] == "missing"


def test_create_patient_rejects_last_visit_before_date_of_birth(client: TestClient) -> None:
    payload = patient_body(date_of_birth="2000-01-10", last_visit="2000-01-09")

    response = client.post("/patients", json=payload)

    assert response.status_code == 422
    messages = [e["msg"] for e in response.json()["detail"]]
    assert any("Last visit cannot be before date of birth" in m for m in messages)


def test_create_patient_accepts_last_visit_on_date_of_birth(client: TestClient) -> None:
    payload = patient_body(date_of_birth="2000-01-10", last_visit="2000-01-10")

    response = client.post("/patients", json=payload)

    assert response.status_code == 201


@pytest.mark.parametrize("phone", ["5550100", "+1 (555) 010-0100", "555.010.0100"])
def test_create_patient_accepts_valid_phone_formats(client: TestClient, phone: str) -> None:
    response = client.post("/patients", json=patient_body(phone=phone))

    assert response.status_code == 201
    assert response.json()["phone"] == phone


# ---------------------------------------------------------------- update


def test_update_patient_replaces_all_fields(client: TestClient) -> None:
    created = client.post("/patients", json=full_patient_body()).json()

    response = client.put(
        f"/patients/{created['id']}", json=patient_body(first_name="Zora", last_name="Pike")
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert (body["first_name"], body["last_name"]) == ("Zora", "Pike")
    assert body["status"] == "active"
    assert body["allergies"] == []
    assert body["conditions"] == []
    for field in ("email", "phone", "blood_type", "last_visit", "address_line1", "address_line2",
                  "city", "state", "postal_code"):  # fmt: skip
        assert body[field] is None, field


def test_update_patient_persists_changes(client: TestClient) -> None:
    created = client.post("/patients", json=full_patient_body()).json()
    client.put(f"/patients/{created['id']}", json=patient_body(city="Elsewhere"))

    response = client.get(f"/patients/{created['id']}")

    assert response.json()["city"] == "Elsewhere"
    assert response.json()["email"] is None


def test_update_patient_bumps_updated_at_but_not_created_at(client: TestClient) -> None:
    created = client.post("/patients", json=patient_body()).json()

    response = client.put(f"/patients/{created['id']}", json=patient_body(city="Elsewhere"))

    body = response.json()
    assert body["updated_at"] > created["updated_at"]
    assert body["created_at"] == created["created_at"]


def test_update_patient_returns_404_when_missing(client: TestClient) -> None:
    response = client.put(f"/patients/{uuid.uuid4()}", json=patient_body())

    assert response.status_code == 404
    assert response.json() == {"detail": "Patient not found"}


@pytest.mark.parametrize(
    "payload",
    [
        patient_body(email="nope"),
        patient_body(id=str(uuid.uuid4())),
        {"first_name": "Zelda"},
    ],
    ids=["bad-email", "extra-id", "missing-required"],
)
def test_update_patient_returns_422_for_invalid_body(
    client: TestClient, make_patient: MakePatient, payload: dict[str, Any]
) -> None:
    patient = make_patient(first_name="Unchanged")

    response = client.put(f"/patients/{patient.id}", json=payload)

    assert response.status_code == 422
    assert client.get(f"/patients/{patient.id}").json()["first_name"] == "Unchanged"


# ---------------------------------------------------------------- delete


def test_delete_patient_returns_204_and_removes_patient(
    client: TestClient, make_patient: MakePatient
) -> None:
    patient = make_patient()

    response = client.delete(f"/patients/{patient.id}")

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/patients/{patient.id}").status_code == 404


def test_delete_patient_returns_404_when_missing(client: TestClient) -> None:
    response = client.delete(f"/patients/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Patient not found"}


def test_delete_patient_returns_422_for_malformed_id(client: TestClient) -> None:
    response = client.delete("/patients/abc")

    assert response.status_code == 422


# ---------------------------------------------------------------- age


@pytest.mark.parametrize(
    ("date_of_birth", "expected_age"),
    [
        (date(2016, 6, 15), 10),  # birthday today: exactly 10
        (date(2016, 6, 16), 9),  # birthday tomorrow: still 9
        (date(2016, 6, 14), 10),  # birthday yesterday
        (date(2026, 6, 15), 0),  # born today
    ],
)
def test_patient_age_is_whole_years_as_of_today(
    client: TestClient,
    make_patient: MakePatient,
    frozen_today: date,
    date_of_birth: date,
    expected_age: int,
) -> None:
    patient = make_patient(date_of_birth=date_of_birth)

    response = client.get(f"/patients/{patient.id}")

    assert response.json()["age"] == expected_age


def test_control_characters_are_rejected(client):
    body = {"first_name": "Ada\u0000", "last_name": "Test", "date_of_birth": "1990-01-01"}

    assert client.post("/patients", json=body).status_code == 422
    assert client.get("/patients", params={"search": "a\u0000b"}).status_code == 422

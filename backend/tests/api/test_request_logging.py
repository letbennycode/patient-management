import logging
import uuid
from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.models import Patient
from tests.factories import patient_body

MakePatient = Callable[..., Patient]
LOGGER = "app.request"


@pytest.fixture
def request_logs(caplog: pytest.LogCaptureFixture) -> Callable[[], list[str]]:
    """Capture app.request at INFO and return a getter for the formatted messages."""
    caplog.set_level(logging.INFO, logger=LOGGER)
    return lambda: [r.getMessage() for r in caplog.records if r.name == LOGGER]


# ---------------------------------------------------------------- request id header


@pytest.mark.parametrize("path", ["/health", "/patients", "/patients/abc", "/no-such-route"])
def test_every_response_has_a_generated_request_id(client: TestClient, path: str) -> None:
    response = client.get(path)

    uuid.UUID(response.headers["X-Request-ID"])


def test_valid_incoming_request_id_is_echoed(client: TestClient) -> None:
    incoming = str(uuid.uuid4())
    response = client.get("/patients", headers={"X-Request-ID": incoming})

    assert response.headers["X-Request-ID"] == incoming


@pytest.mark.parametrize(
    "incoming",
    [
        "has spaces",
        "semi;colon",
        "x" * 65,
        "under_score",
        "<script>",
        "Jane-Doe-1950-03-04",
        "abc-123-XYZ",
    ],
)
def test_unsafe_incoming_request_id_is_replaced(client: TestClient, incoming: str) -> None:
    response = client.get("/patients", headers={"X-Request-ID": incoming})

    returned = response.headers["X-Request-ID"]
    assert returned != incoming
    uuid.UUID(returned)


def test_request_id_in_log_matches_response_header(
    client: TestClient, request_logs: Callable[[], list[str]]
) -> None:
    response = client.get("/patients")

    [line] = request_logs()
    assert f"request_id={response.headers['X-Request-ID']}" in line


# ---------------------------------------------------------------- log content


def test_search_request_logs_route_template_without_query(
    client: TestClient, request_logs: Callable[[], list[str]]
) -> None:
    client.get("/patients", params={"search": "Smith", "status": "active"})

    [line] = request_logs()
    assert "method=GET" in line
    assert "route=/patients " in line
    assert "status=200" in line
    assert "duration_ms=" in line
    assert "Smith" not in line
    assert "search" not in line
    assert "?" not in line


def test_create_request_logs_status_without_body_or_new_id(
    client: TestClient, request_logs: Callable[[], list[str]]
) -> None:
    response = client.post("/patients", json=patient_body(first_name="Zelda", last_name="Quill"))

    [line] = request_logs()
    assert "method=POST" in line
    assert "route=/patients " in line
    assert "status=201" in line
    assert "Zelda" not in line
    assert "Quill" not in line
    assert response.json()["id"] not in line


def test_path_params_are_logged_as_template_not_value(
    client: TestClient, make_patient: MakePatient, request_logs: Callable[[], list[str]]
) -> None:
    patient = make_patient()

    client.get(f"/patients/{patient.id}/notes")

    [line] = request_logs()
    assert "route=/patients/{patient_id}/notes " in line
    assert str(patient.id) not in line


def test_not_found_is_logged_with_404(
    client: TestClient, request_logs: Callable[[], list[str]]
) -> None:
    missing = uuid.uuid4()

    client.get(f"/patients/{missing}")

    [line] = request_logs()
    assert "route=/patients/{patient_id} " in line
    assert "status=404" in line
    assert str(missing) not in line


def test_validation_error_is_logged_with_422(
    client: TestClient, request_logs: Callable[[], list[str]]
) -> None:
    client.post("/patients", json=patient_body(email="zelda-at-nowhere"))

    [line] = request_logs()
    assert "status=422" in line
    assert "zelda" not in line.lower()


def test_unmatched_route_is_logged_without_path(
    client: TestClient, request_logs: Callable[[], list[str]]
) -> None:
    client.get("/zelda-quill-records")

    [line] = request_logs()
    assert "route=unmatched" in line
    assert "status=404" in line
    assert "zelda" not in line


def test_unhandled_exception_logs_500_and_exception_type_only(
    client: TestClient,
    make_patient: MakePatient,
    monkeypatch: pytest.MonkeyPatch,
    request_logs: Callable[[], list[str]],
) -> None:
    # Forcing a crash is the one place we stub our own service: there is no real input that
    # makes a healthy app raise, and the subject under test is the middleware.
    patient = make_patient()

    def crash(*_: object) -> None:
        raise RuntimeError("Zelda Quill exploded")

    monkeypatch.setattr("app.services.patients.get_patient", crash)
    crashing_client = TestClient(client.app, raise_server_exceptions=False)

    response = crashing_client.get(f"/patients/{patient.id}")

    assert response.status_code == 500
    assert response.headers["X-Request-ID"]
    [line] = request_logs()
    assert "status=500" in line
    assert "error=RuntimeError" in line
    assert "Zelda" not in line
    assert str(patient.id) not in line


def test_health_is_logged_at_debug_only(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG, logger=LOGGER)

    client.get("/health")

    [record] = [r for r in caplog.records if r.name == LOGGER]
    assert record.levelno == logging.DEBUG
    assert "route=/health " in record.getMessage()

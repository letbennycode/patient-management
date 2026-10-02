import pytest

from app.services.redaction import age_bucket, redact


@pytest.mark.parametrize(
    ("text", "leaked"),
    [
        ("Contact zelda.quill@example.com today", "zelda.quill@example.com"),
        ("Call +1 555 123 4567 or (555) 123-4567", "555"),
        ("SSN 123-45-6789 on file", "123-45-6789"),
        ("Seen on 2026-03-05 and 03/05/2026", "2026"),
        ("Seen on 5 March 2026 and Mar 5, 2026", "2026"),
        ("Lives at 89557 Russell Manor Street", "89557"),
        ("Postal code 62701-1234", "62701"),
        ("MRN: AB-123456 and account number 99887766", "123456"),
        ("Patient portal https://clinic.example.org/p/zelda", "clinic.example.org"),
        ("Seen from 192.168.1.20", "192.168"),
        ("Referred by Dr. Quill and Mrs O'Neil", "Quill"),
        ("The patient named Zelda Quill attended", "Zelda"),
    ],
)
def test_redacts_common_phi_formats(text: str, leaked: str) -> None:
    assert leaked not in redact(text)


def test_known_identifiers_are_removed_case_insensitively() -> None:
    result = redact(
        "zelda QUILL called from Springfield about her knee",
        ["Zelda", "Quill", "Zelda Quill", "Springfield", None],
    )

    assert "zelda" not in result.lower()
    assert "quill" not in result.lower()
    assert "springfield" not in result.lower()
    assert "knee" in result


def test_clinical_content_is_preserved() -> None:
    text = "Follow-up for hypertension; BP 132/84, continue lisinopril."

    assert redact(text) == text


@pytest.mark.parametrize(("age", "expected"), [(5, "5"), (89, "89"), (90, "90+"), (104, "90+")])
def test_age_bucket_follows_safe_harbor(age: int, expected: str) -> None:
    assert age_bucket(age) == expected

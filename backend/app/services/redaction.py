"""Best-effort PHI scrubbing for text sent to a third-party LLM.

Two layers: (1) the patient's own identifiers are removed literally, wherever they appear,
and (2) common PHI formats are masked by pattern. This is defence in depth, not a guarantee:
free text can always contain identifiers no pattern recognises. Never log input or output.
"""

import re
from collections.abc import Iterable

# Most specific first, so e.g. an SSN isn't consumed by the generic phone pattern.
# Emails and URLs are masked before the patient's own identifiers, because a literal pass
# would otherwise break "jane.doe@gmail.com" into "[REDACTED].[REDACTED]@gmail.com".
_ADDRESSES: list[tuple[str, re.Pattern[str]]] = [
    ("EMAIL", re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")),
    ("URL", re.compile(r"(?:https?://|www\.)\S+", re.I)),
]

_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("SSN", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    # ISO and numeric dates, then written dates ("5 Mar 2024", "March 5, 2024").
    ("DATE", re.compile(r"\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b")),
    (
        "DATE",
        re.compile(
            r"\b(?:\d{1,2}(?:st|nd|rd|th)?\s+)?"
            r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|jun(?:e)?|jul(?:y)?|"
            r"aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?"
            r"(?:\s+\d{1,2}(?:st|nd|rd|th)?)?,?\s*(?:\d{4})?\b",
            re.I,
        ),
    ),
    # "May" is also a common word, so it only counts as a date next to a day or a year.
    (
        "DATE",
        re.compile(
            r"\b(?:\d{1,2}(?:st|nd|rd|th)?\s+may\b(?:,?\s*\d{4})?"
            r"|may\s+(?:\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?|\d{4})\b)",
            re.I,
        ),
    ),
    ("PHONE", re.compile(r"(?<!\w)(?:\+?\d[\d\s().-]{6,}\d)(?!\w)")),
    ("IP", re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}\b")),
    # Record / account / member numbers: "MRN 12345", "ID: AB-1234". The number needs a digit.
    (
        "ID",
        re.compile(
            r"\b(?i:mrn|medical record|record|account|member|policy|patient|id)"
            r"\s*(?i:no\.?|number|#)?\s*[:#]?\s*(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{3,}\b"
        ),
    ),
    (
        "ADDRESS",
        re.compile(
            r"\b\d{1,6}\s+(?:[A-Za-z0-9.]+\s+){1,4}"
            r"(?:street|st|road|rd|avenue|ave|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl"
            r"|terrace|trail|bypass|parkway|pkwy)\b\.?",
            re.I,
        ),
    ),
    ("ZIP", re.compile(r"\b\d{5}(?:-\d{4})?\b")),
    # "Dr Smith", "Mrs. O'Neil", "Mr John Smith": title + capitalised name(s).
    (
        "NAME",
        re.compile(
            r"\b(?i:dr|mr|mrs|ms|miss|mx|prof|nurse)\.?\s+[A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)?",
        ),
    ),
    ("NAME", re.compile(r"\b(?i:named|called|name is)\s+[A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)?")),
]

# Long digit runs that survive the patterns above (account numbers etc.).
_LONG_DIGITS = re.compile(r"\b\d{6,}\b")


def redact(text: str, known_identifiers: Iterable[str | None] = ()) -> str:
    """Mask emails and URLs, then the patient's own identifiers, then other PHI formats."""
    for label, pattern in _ADDRESSES:
        text = pattern.sub(f"[{label}]", text)
    literals = {i.strip() for i in known_identifiers if i and len(i.strip()) >= 2}
    if literals:
        # One pass, whole words only: "Ed" must not hit "Prescribed", and a later literal must
        # not match inside an earlier "[REDACTED]". Longest first so "Jane Doe" beats "Jane".
        alternatives = "|".join(re.escape(lit) for lit in sorted(literals, key=len, reverse=True))
        text = re.sub(rf"(?<!\w)(?:{alternatives})(?!\w)", "[REDACTED]", text, flags=re.I)
    for label, pattern in _PATTERNS:
        text = pattern.sub(f"[{label}]", text)
    return _LONG_DIGITS.sub("[ID]", text)


def age_bucket(age: int) -> str:
    """HIPAA Safe Harbor: ages over 89 are reported only as '90+'."""
    return "90+" if age > 89 else str(age)

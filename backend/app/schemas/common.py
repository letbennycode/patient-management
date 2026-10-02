import re
from typing import Any

from pydantic_core import PydanticCustomError

# Control characters except tab, newline and carriage return. Postgres rejects NUL outright,
# and none of these belong in names, addresses or clinical notes.
CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
# Same rule as a whole-string pattern, for FastAPI query params.
CONTROL_CHARS_PATTERN = rf"^[^{CONTROL_CHARS.pattern[1:-1]}]*$"


def reject_control_chars(data: Any) -> Any:
    """`mode="before"` model validator: refuse control characters in any submitted text."""
    values = data.values() if isinstance(data, dict) else []
    for value in values:
        items = value if isinstance(value, list) else [value]
        if any(isinstance(i, str) and CONTROL_CHARS.search(i) for i in items):
            raise PydanticCustomError("control_chars", "Text contains invalid characters")
    return data

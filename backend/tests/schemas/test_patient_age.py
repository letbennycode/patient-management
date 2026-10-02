from datetime import date

import pytest

from app.schemas.patient import calculate_age


@pytest.mark.parametrize(
    ("date_of_birth", "today", "expected"),
    [
        (date(1986, 10, 1), date(2026, 10, 1), 40),  # exactly N years
        (date(1986, 10, 2), date(2026, 10, 1), 39),  # birthday tomorrow
        (date(1986, 9, 30), date(2026, 10, 1), 40),  # birthday yesterday
        (date(1986, 12, 31), date(2026, 1, 1), 39),  # birthday late in the year
        (date(2026, 10, 1), date(2026, 10, 1), 0),  # born today
        (date(2000, 2, 29), date(2026, 2, 28), 25),  # leap-day birthday, non-leap year
        (date(2000, 2, 29), date(2026, 3, 1), 26),
        (date(2000, 2, 29), date(2028, 2, 29), 28),
    ],
)
def test_calculate_age_counts_whole_years(date_of_birth: date, today: date, expected: int) -> None:
    assert calculate_age(date_of_birth, today=today) == expected

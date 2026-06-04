"""Unit tests for the pure alert-rule evaluation (app/services/alert_rules.py)."""
import pytest

from app.services.alert_rules import (
    ALERT_CONDITIONS,
    ALERT_SEVERITIES,
    evaluate_condition,
    find_breaches,
)


@pytest.mark.parametrize(
    "condition,value,threshold,expected",
    [
        ("greater_than", 11, 10, True),
        ("greater_than", 10, 10, False),
        ("less_than", 9, 10, True),
        ("less_than", 10, 10, False),
        ("greater_or_equal", 10, 10, True),
        ("greater_or_equal", 9.99, 10, False),
        ("less_or_equal", 10, 10, True),
        ("less_or_equal", 10.01, 10, False),
        ("equal_to", 10.0, 10, True),
        ("equal_to", 10.0000000001, 10, True),  # within epsilon
        ("equal_to", 10.5, 10, False),
        ("not_equal_to", 10.5, 10, True),
        ("not_equal_to", 10.0, 10, False),
    ],
)
def test_evaluate_condition(condition, value, threshold, expected):
    assert evaluate_condition(condition, value, threshold) is expected


def test_evaluate_condition_unknown():
    with pytest.raises(ValueError):
        evaluate_condition("between", 5, 10)


def test_find_breaches():
    points = [("t1", 5), ("t2", 15), ("t3", 9), ("t4", 20)]
    breaches = find_breaches(points, "greater_than", 10)
    assert breaches == [("t2", 15), ("t4", 20)]

    assert find_breaches(points, "less_than", 10) == [("t1", 5), ("t3", 9)]
    assert find_breaches([], "greater_than", 0) == []


def test_find_breaches_unknown_condition():
    with pytest.raises(ValueError):
        find_breaches([("t", 1)], "nope", 0)


def test_constants():
    assert "greater_than" in ALERT_CONDITIONS
    assert ALERT_SEVERITIES == {"info", "warning", "critical"}

"""
Pure alert-rule evaluation logic (threshold comparisons).

Dependency-free so it can be unit-tested in isolation and reused at ingest time.
The actual measurement fetching, event persistence and notification dispatch
live in the endpoint layer.
"""
from typing import Iterable, List, Tuple

# Conditions accepted on an alert rule (superset of the schema's documented set).
ALERT_CONDITIONS = {
    "greater_than",
    "less_than",
    "greater_or_equal",
    "less_or_equal",
    "equal_to",
    "not_equal_to",
}

ALERT_SEVERITIES = {"info", "warning", "critical"}

# Tolerance for (in)equality comparisons on floating point values.
_EPSILON = 1e-9


def evaluate_condition(condition: str, value: float, threshold: float) -> bool:
    """Return True if ``value`` breaches ``threshold`` for the given condition."""
    if condition == "greater_than":
        return value > threshold
    if condition == "less_than":
        return value < threshold
    if condition == "greater_or_equal":
        return value >= threshold
    if condition == "less_or_equal":
        return value <= threshold
    if condition == "equal_to":
        return abs(value - threshold) <= _EPSILON
    if condition == "not_equal_to":
        return abs(value - threshold) > _EPSILON
    raise ValueError(f"Unknown condition: {condition}")


def find_breaches(
    points: Iterable[Tuple], condition: str, threshold: float
) -> List[Tuple]:
    """Filter ``(time, value)`` points to those that breach the threshold.

    Validates the condition once up front so an unknown condition raises rather
    than silently returning nothing.
    """
    if condition not in ALERT_CONDITIONS:
        raise ValueError(f"Unknown condition: {condition}")
    return [(t, v) for (t, v) in points if evaluate_condition(condition, v, threshold)]

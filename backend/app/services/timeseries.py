"""
Pure time-series helpers: interval normalisation, continuous-aggregate
selection, and LTTB downsampling.

Deliberately dependency-free (stdlib only) so it can be unit-tested in isolation
and reused outside the request path. The endpoint layer imports these.
"""
import re
from typing import List, Optional

# Short-form unit aliases -> canonical Postgres interval unit word.
_INTERVAL_RE = re.compile(r"^\s*(\d+)\s*([a-zA-Z]+)\s*$")
_UNIT_ALIASES = {
    "s": "seconds", "sec": "seconds", "secs": "seconds", "second": "seconds", "seconds": "seconds",
    "m": "minutes", "min": "minutes", "mins": "minutes", "minute": "minutes", "minutes": "minutes",
    "h": "hours", "hr": "hours", "hrs": "hours", "hour": "hours", "hours": "hours",
    "d": "days", "day": "days", "days": "days",
    "w": "weeks", "week": "weeks", "weeks": "weeks",
}

# Whitelist of aggregation functions -> SQL (prevents injection via the function name).
AGG_FUNCS = {
    "avg": "AVG", "average": "AVG", "mean": "AVG",
    "sum": "SUM", "min": "MIN", "max": "MAX", "count": "COUNT",
}

# Seconds per interval unit, used to decide which source a bucket query hits.
_UNIT_SECONDS = {"seconds": 1, "minutes": 60, "hours": 3600, "days": 86400, "weeks": 604800}
_HOUR_SECONDS = 3600
_DAY_SECONDS = 86400

# TimescaleDB continuous aggregates (materialized views) defined in
# db/migrations/0000_setup_timescaledb.sql. Each pre-aggregates raw measurements
# into hourly/daily buckets with avg/min/max/count per (metric_id, device_id).
CAGG_HOURLY = "measurements_hourly"
CAGG_DAILY = "measurements_daily"

# How to re-aggregate the pre-aggregated columns when re-bucketing a continuous
# aggregate into a coarser interval. AVG/SUM are count-weighted so the result is
# exact (not an average-of-averages).
CAGG_VALUE_EXPR = {
    "AVG": "SUM(avg_value * count) / NULLIF(SUM(count), 0)",
    "SUM": "SUM(avg_value * count)",
    "MIN": "MIN(min_value)",
    "MAX": "MAX(max_value)",
    "COUNT": "SUM(count)",
}


def to_pg_interval(value: Optional[str], default: str = "1 hour") -> str:
    """Normalise a short/ISO interval (e.g. '15m', 'PT15M', '1h', 'P1D') to a
    safe Postgres interval literal such as '15 minutes'.

    Anything unrecognised falls back to ``default`` — combined with AGG_FUNCS
    this keeps the value safe to interpolate into SQL.
    """
    if not value:
        return default
    v = value.strip()

    # ISO-8601 duration: PT15M, PT1H, PT6H, P1D, PT30S, PT168H
    m = re.fullmatch(r"P(T?)(\d+)([SMHDW])", v, re.IGNORECASE)
    if m:
        after_t, num, unit = m.group(1).upper(), int(m.group(2)), m.group(3).upper()
        if unit == "M":
            word = "minutes" if after_t == "T" else None  # ignore ISO months
        else:
            word = {"S": "seconds", "H": "hours", "D": "days", "W": "weeks"}.get(unit)
        if word:
            return f"{num} {word}"

    # Short form like '15m', '1h', '30s', '1d'
    m = _INTERVAL_RE.fullmatch(v)
    if m:
        num, unit = int(m.group(1)), m.group(2).lower()
        word = _UNIT_ALIASES.get(unit)
        if word:
            return f"{num} {word}"

    # Already a plain Postgres interval ('15 minutes')
    if re.fullmatch(r"\d+\s+(seconds|minutes|hours|days|weeks)", v.lower()):
        return v.lower()

    return default


def interval_seconds(pg_interval: str) -> Optional[int]:
    """Seconds in a normalised Postgres interval literal ('15 minutes' -> 900)."""
    m = re.fullmatch(r"(\d+)\s+(seconds|minutes|hours|days|weeks)", pg_interval)
    if not m:
        return None
    return int(m.group(1)) * _UNIT_SECONDS[m.group(2)]


def continuous_aggregate_for(pg_interval: str) -> Optional[str]:
    """Pick the materialized view that can answer this bucket interval exactly.

    Returns the daily view when the interval is a whole number of days, the
    hourly view when it is a whole number of hours, otherwise None (which means
    query the raw hypertable). Requiring an exact multiple guarantees the
    re-bucketed boundaries align with the pre-aggregated rows, so no accuracy is
    lost vs. scanning raw data.
    """
    secs = interval_seconds(pg_interval)
    if not secs:
        return None
    if secs % _DAY_SECONDS == 0:
        return CAGG_DAILY
    if secs % _HOUR_SECONDS == 0:
        return CAGG_HOURLY
    return None


def lttb_indices(xs: List[float], ys: List[float], threshold: int) -> List[int]:
    """Largest-Triangle-Three-Buckets downsampling.

    Returns the indices of the points to keep (in order), always preserving the
    first and last point and choosing the visually most significant point in
    each bucket. This is near-lossless for line charts: it keeps peaks/troughs
    that naive every-nth-point sampling would drop. Input must be sorted by x.
    """
    n = len(xs)
    if threshold <= 2 or threshold >= n:
        return list(range(n))

    sampled = [0]  # always keep the first point
    bucket_size = (n - 2) / (threshold - 2)
    a = 0  # index of the previously selected point

    for i in range(threshold - 2):
        # Average point of the next bucket — the triangle's third vertex.
        start = int((i + 1) * bucket_size) + 1
        end = min(int((i + 2) * bucket_size) + 1, n)
        count = max(end - start, 1)
        avg_x = sum(xs[start:end]) / count
        avg_y = sum(ys[start:end]) / count

        # Pick the point in the current bucket that forms the largest triangle
        # with the previously selected point and the next bucket's average.
        range_from = int(i * bucket_size) + 1
        range_to = int((i + 1) * bucket_size) + 1
        ax, ay = xs[a], ys[a]
        max_area = -1.0
        chosen = range_from
        for j in range(range_from, range_to):
            area = abs((ax - avg_x) * (ys[j] - ay) - (ax - xs[j]) * (avg_y - ay))
            if area > max_area:
                max_area = area
                chosen = j
        sampled.append(chosen)
        a = chosen

    sampled.append(n - 1)  # always keep the last point
    return sampled

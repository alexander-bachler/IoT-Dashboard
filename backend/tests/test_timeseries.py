"""Unit tests for the pure time-series helpers (app/services/timeseries.py)."""
import math

from app.services.timeseries import (
    AGG_FUNCS,
    CAGG_VALUE_EXPR,
    CAGG_DAILY,
    CAGG_HOURLY,
    to_pg_interval,
    interval_seconds,
    continuous_aggregate_for,
    lttb_indices,
)


# ----------------------------- to_pg_interval -----------------------------

def test_to_pg_interval_short_forms():
    assert to_pg_interval("15m") == "15 minutes"
    assert to_pg_interval("1h") == "1 hours"
    assert to_pg_interval("30s") == "30 seconds"
    assert to_pg_interval("1d") == "1 days"
    assert to_pg_interval("2w") == "2 weeks"


def test_to_pg_interval_iso8601():
    assert to_pg_interval("PT15M") == "15 minutes"
    assert to_pg_interval("PT1H") == "1 hours"
    assert to_pg_interval("PT30S") == "30 seconds"
    assert to_pg_interval("P1D") == "1 days"
    assert to_pg_interval("PT168H") == "168 hours"
    assert to_pg_interval("P2W") == "2 weeks"


def test_to_pg_interval_iso_month_vs_minute():
    # `T` present => minutes; bare `M` is an ISO *month* which we ignore.
    assert to_pg_interval("PT1M") == "1 minutes"
    assert to_pg_interval("P1M") == "1 hour"  # ignored -> default


def test_to_pg_interval_plain_passthrough():
    assert to_pg_interval("15 minutes") == "15 minutes"
    assert to_pg_interval("6 HOURS") == "6 hours"


def test_to_pg_interval_defaults_and_safety():
    assert to_pg_interval(None) == "1 hour"
    assert to_pg_interval("") == "1 hour"
    assert to_pg_interval("garbage") == "1 hour"
    # An injection attempt must never be echoed back into the literal.
    assert to_pg_interval("1 hour); DROP TABLE measurements;--") == "1 hour"
    assert to_pg_interval("custom-default", default="5 minutes") == "5 minutes"


# ----------------------------- interval_seconds -----------------------------

def test_interval_seconds():
    assert interval_seconds("30 seconds") == 30
    assert interval_seconds("15 minutes") == 900
    assert interval_seconds("1 hours") == 3600
    assert interval_seconds("1 days") == 86400
    assert interval_seconds("2 weeks") == 1209600
    assert interval_seconds("nonsense") is None


# ------------------------- continuous_aggregate_for -------------------------

def test_continuous_aggregate_selection():
    # whole hours -> hourly view
    assert continuous_aggregate_for(to_pg_interval("1h")) == CAGG_HOURLY
    assert continuous_aggregate_for(to_pg_interval("6h")) == CAGG_HOURLY
    # whole days (and multiples like weeks) -> daily view
    assert continuous_aggregate_for(to_pg_interval("1d")) == CAGG_DAILY
    assert continuous_aggregate_for(to_pg_interval("7d")) == CAGG_DAILY
    assert continuous_aggregate_for(to_pg_interval("2w")) == CAGG_DAILY
    # sub-hour or non-hour multiples -> raw (None)
    assert continuous_aggregate_for(to_pg_interval("15m")) is None
    assert continuous_aggregate_for(to_pg_interval("90m")) is None
    assert continuous_aggregate_for(to_pg_interval("30s")) is None


def test_cagg_value_expr_is_count_weighted():
    # AVG/SUM must weight by count so re-bucketing a view is exact.
    assert "count" in CAGG_VALUE_EXPR["AVG"]
    assert CAGG_VALUE_EXPR["COUNT"] == "SUM(count)"
    assert set(CAGG_VALUE_EXPR) == {"AVG", "SUM", "MIN", "MAX", "COUNT"}


def test_agg_funcs_whitelist():
    assert AGG_FUNCS["avg"] == "AVG"
    assert AGG_FUNCS["mean"] == "AVG"
    assert AGG_FUNCS["count"] == "COUNT"
    # Only known SQL aggregates are present (injection-safe).
    assert set(AGG_FUNCS.values()) <= {"AVG", "SUM", "MIN", "MAX", "COUNT"}


# ------------------------------- lttb_indices -------------------------------

def test_lttb_identity_when_under_threshold():
    xs = list(range(10))
    ys = [float(v) for v in xs]
    assert lttb_indices(xs, ys, 20) == list(range(10))
    assert lttb_indices(xs, ys, 2) == list(range(10))


def test_lttb_reduces_and_preserves_shape():
    n = 5000
    xs = [float(i) for i in range(n)]
    ys = [math.sin(i / 50.0) for i in range(n)]
    spike = 1234
    ys[spike] = 50.0  # dominant outlier

    th = 500
    idx = lttb_indices(xs, ys, th)

    assert len(idx) == th
    assert idx[0] == 0 and idx[-1] == n - 1          # endpoints kept
    assert idx == sorted(idx)                         # ordered
    assert len(set(idx)) == len(idx)                  # no duplicates
    assert all(0 <= k < n for k in idx)               # in range
    assert spike in idx                               # dominant peak kept

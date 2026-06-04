"""Unit tests for the pure report-generation helpers."""
from app.services.report_generator import (
    REPORT_FORMATS,
    REPORT_TYPES,
    summarize_values,
    sections_to_csv,
)


def test_summarize_empty():
    assert summarize_values([]) == {
        "count": 0, "min": None, "max": None, "avg": None, "sum": None
    }


def test_summarize_values():
    s = summarize_values([2.0, 4.0, 6.0])
    assert s["count"] == 3
    assert s["min"] == 2.0
    assert s["max"] == 6.0
    assert s["avg"] == 4.0
    assert s["sum"] == 12.0


def test_sections_to_csv():
    sections = [
        {
            "metric_id": "m1",
            "metric_name": "Temperature",
            "unit": "C",
            "stats": {"count": 2, "min": 1, "max": 3, "avg": 2, "sum": 4},
        }
    ]
    csv_text = sections_to_csv(sections)
    lines = csv_text.strip().splitlines()
    assert lines[0] == "metric_id,metric_name,unit,count,min,max,avg,sum"
    assert lines[1] == "m1,Temperature,C,2,1,3,2,4"


def test_sections_to_csv_empty():
    csv_text = sections_to_csv([])
    assert csv_text.strip() == "metric_id,metric_name,unit,count,min,max,avg,sum"


def test_whitelists():
    assert "metrics" in REPORT_TYPES
    assert REPORT_FORMATS == {"pdf", "excel", "json"}

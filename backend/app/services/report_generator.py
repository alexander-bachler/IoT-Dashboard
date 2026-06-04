"""
Report generation helpers.

The pure parts (summarising a list of values into statistics, and rendering
report sections to CSV) live here and are unit-tested. The endpoint layer does
the I/O (fetching measurements, persisting history) and orchestrates these.

PDF/Excel rendering, e-mail delivery and cron scheduling are intentionally NOT
implemented here — those are infrastructure concerns left as stubs.
"""
import csv
import io
from typing import Any, Dict, List, Optional

# Whitelists mirrored from the report schema.
REPORT_TYPES = {"dashboard", "metrics", "alerts"}
REPORT_FORMATS = {"pdf", "excel", "json"}


def summarize_values(values: List[float]) -> Dict[str, Optional[float]]:
    """Summary statistics for a list of numeric values."""
    if not values:
        return {"count": 0, "min": None, "max": None, "avg": None, "sum": None}
    total = sum(values)
    return {
        "count": len(values),
        "min": min(values),
        "max": max(values),
        "avg": total / len(values),
        "sum": total,
    }


def sections_to_csv(sections: List[Dict[str, Any]]) -> str:
    """Render report sections (one row per metric) to CSV text."""
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["metric_id", "metric_name", "unit", "count", "min", "max", "avg", "sum"])
    for section in sections:
        stats = section.get("stats") or {}
        writer.writerow([
            section.get("metric_id"),
            section.get("metric_name"),
            section.get("unit"),
            stats.get("count"),
            stats.get("min"),
            stats.get("max"),
            stats.get("avg"),
            stats.get("sum"),
        ])
    return out.getvalue()

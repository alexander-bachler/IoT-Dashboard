#!/usr/bin/env python3
"""
End-to-end smoke test for the FastAPI backend.

Runs against a *live* stack (FastAPI + TimescaleDB) and checks that the key
endpoints the frontend depends on respond with the expected status and shape.
Dependency-free (stdlib only) so it can be dropped onto any box with Python 3.

Usage:
    python backend/scripts/smoke_test.py \
        --base-url http://localhost:8000 \
        --username alice --password secret

Or via environment variables:
    SMOKE_BASE_URL, SMOKE_USERNAME, SMOKE_PASSWORD, SMOKE_TOKEN

If --token / SMOKE_TOKEN is given, the login step is skipped.
Exits non-zero if any check fails (suitable for CI / cron).
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

API = "/api/v1"


class Client:
    def __init__(self, base_url: str, token: str | None = None, timeout: float = 15.0):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout

    def request(self, method: str, path: str, *, json_body=None, form_body=None):
        """Return (status_code, parsed_body). Never raises for HTTP errors."""
        url = f"{self.base_url}{path}"
        headers = {"Accept": "application/json"}
        data = None
        if json_body is not None:
            data = json.dumps(json_body).encode()
            headers["Content-Type"] = "application/json"
        elif form_body is not None:
            data = urllib.parse.urlencode(form_body).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read().decode() or ""
                return resp.status, _parse(raw)
        except urllib.error.HTTPError as e:
            raw = e.read().decode() if e.fp else ""
            return e.code, _parse(raw)


def _parse(raw: str):
    if not raw:
        return None
    try:
        return json.loads(raw)
    except ValueError:
        return raw


class Runner:
    def __init__(self):
        self.passed = 0
        self.failed = 0

    def check(self, name: str, fn):
        try:
            detail = fn()
            self.passed += 1
            print(f"  PASS  {name}" + (f"  ({detail})" if detail else ""))
        except AssertionError as e:
            self.failed += 1
            print(f"  FAIL  {name}  -> {e}")
        except Exception as e:  # noqa: BLE001 - report any unexpected error as a failure
            self.failed += 1
            print(f"  ERROR {name}  -> {type(e).__name__}: {e}")


def login(client: Client, username: str, password: str) -> str:
    status, body = client.request(
        "POST", f"{API}/auth/login", form_body={"username": username, "password": password}
    )
    assert status == 200, f"login returned {status}: {body}"
    assert isinstance(body, dict) and body.get("access_token"), f"no access_token in {body}"
    return body["access_token"]


def main() -> int:
    p = argparse.ArgumentParser(description="Backend smoke test")
    p.add_argument("--base-url", default=os.environ.get("SMOKE_BASE_URL", "http://localhost:8000"))
    p.add_argument("--username", default=os.environ.get("SMOKE_USERNAME"))
    p.add_argument("--password", default=os.environ.get("SMOKE_PASSWORD"))
    p.add_argument("--token", default=os.environ.get("SMOKE_TOKEN"))
    args = p.parse_args()

    print(f"Smoke test against {args.base_url}")
    client = Client(args.base_url, token=args.token)

    # --- Authentication -----------------------------------------------------
    if not client.token:
        if not (args.username and args.password):
            print("ERROR: provide --token, or --username and --password "
                  "(or the SMOKE_* env vars).")
            return 2
        try:
            client.token = login(client, args.username, args.password)
            print("  PASS  auth/login")
        except Exception as e:  # noqa: BLE001
            print(f"  FAIL  auth/login -> {e}")
            print("Cannot continue without a token.")
            return 1

    r = Runner()

    def get_ok(path, want_list=False):
        def fn():
            status, body = client.request("GET", path)
            assert status == 200, f"status {status}: {body}"
            if want_list:
                assert isinstance(body, list), f"expected list, got {type(body).__name__}"
                return f"{len(body)} item(s)"
            assert isinstance(body, dict), f"expected object, got {type(body).__name__}"
            return None
        return fn

    print("\nRead endpoints:")
    r.check("auth/me", get_ok(f"{API}/auth/me"))
    r.check("data-sources (list)", get_ok(f"{API}/data-sources", want_list=True))
    r.check("devices (list)", get_ok(f"{API}/devices", want_list=True))
    r.check("metrics (list)", get_ok(f"{API}/metrics", want_list=True))
    r.check("dashboards (list)", get_ok(f"{API}/dashboards", want_list=True))
    r.check("anomalies/stats", get_ok(f"{API}/anomalies/stats"))

    # --- Measurements (only if there is data to query) ----------------------
    print("\nMeasurements (data-dependent):")

    def measurements_chain():
        status, devices = client.request("GET", f"{API}/devices")
        assert status == 200 and isinstance(devices, list), f"devices: {status}"
        if not devices:
            return "skipped (no devices)"
        device_id = devices[0]["id"]
        status, metrics = client.request("GET", f"{API}/devices/{device_id}/metrics")
        assert status == 200 and isinstance(metrics, list), f"device metrics: {status}"
        if not metrics:
            return "skipped (device has no metrics)"
        metric_id = metrics[0]["id"]
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=7)
        qs = urllib.parse.urlencode({
            "metric_ids": metric_id,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "interval": "1h",  # routes to the hourly continuous aggregate
            "aggregation": "avg",
        })
        status, series = client.request("GET", f"{API}/measurements/time-series?{qs}")
        assert status == 200, f"time-series status {status}: {series}"
        assert isinstance(series, list), f"expected list, got {type(series).__name__}"
        return f"time-series OK ({len(series)} series)"

    r.check("devices -> metrics -> time-series", measurements_chain)

    # --- Dashboard CRUD round-trip (validates the config/UUID contract) -----
    print("\nDashboard CRUD round-trip:")

    def dashboard_roundtrip():
        payload = {
            "name": "smoke-test-dashboard",
            "description": "created by smoke_test.py",
            "config": {"widgets": [], "settings": {"globalTimeRange": "last_24h"}},
        }
        status, created = client.request("POST", f"{API}/dashboards", json_body=payload)
        assert status in (200, 201), f"create status {status}: {created}"
        dash_id = created["id"]
        try:
            assert created.get("config", {}).get("settings", {}).get("globalTimeRange") == "last_24h", \
                f"config not persisted: {created.get('config')}"

            status, fetched = client.request("GET", f"{API}/dashboards/{dash_id}")
            assert status == 200, f"get status {status}: {fetched}"
            assert fetched["config"]["widgets"] == [], "widgets mismatch on read"

            status, _ = client.request(
                "PUT", f"{API}/dashboards/{dash_id}", json_body={"name": "smoke-test-renamed"}
            )
            assert status == 200, f"update status {status}"
        finally:
            status, _ = client.request("DELETE", f"{API}/dashboards/{dash_id}")
            assert status in (200, 204), f"delete status {status}"
        return f"create/read/update/delete OK (id={dash_id})"

    r.check("dashboards CRUD", dashboard_roundtrip)

    # --- Summary ------------------------------------------------------------
    total = r.passed + r.failed
    print(f"\n{r.passed}/{total} checks passed.")
    return 1 if r.failed else 0


if __name__ == "__main__":
    sys.exit(main())

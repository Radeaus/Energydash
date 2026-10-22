"""Session event payload and long-term statistic rows."""

from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import pytest

from edcore.const import HOUSE_KEY, REST_KEY, SOLAR_MODE_EXPORT, SOLAR_MODE_FREE
from edcore.engine import build_step
from edcore.longterm import hourly_fields, session_event_data, statistic_rows
from edcore.price import PriceProvider

UTC = timezone.utc
AMS = ZoneInfo("Europe/Amsterdam")


def test_session_event_charging_session():
    """The charging session of October 20-21, 2026: 49.897 kWh, €17.33."""
    start = datetime(2026, 10, 20, 21, 1, tzinfo=UTC)
    end = datetime(2026, 10, 21, 3, 46, tzinfo=UTC)
    step = build_step(start, end, 49.897, 60.0, PriceProvider(fallback=0.3473))
    sess = {"id": "laadpaal-1", "device_id": "laadpaal", "start": start.isoformat(), "end": end.isoformat(),
            "fields": step.fields}
    data = session_event_data(sess, "Laadpaal", SOLAR_MODE_EXPORT)
    assert data["device_id"] == "laadpaal"
    assert data["device_name"] == "Laadpaal"
    assert data["kwh"] == 49.897
    assert data["solar_kwh"] == 0
    assert data["grid_kwh"] == 49.897
    assert round(data["cost"], 2) == 17.33
    assert data["duration_min"] == 405.0
    assert data["price_per_kwh"] == pytest.approx(0.3473, abs=1e-4)


def test_session_event_solar_modes():
    # 2 kWh, 1 kWh solar; grid part €0.30, all-grid €0.60, solar worth €0.08 at the export price
    sess = {"id": "w-1", "device_id": "w", "start": "2026-10-22T12:00:00+00:00", "end": None,
            "fields": [2.0, 1.0, 0.30, 0.60, 0.08]}
    assert session_event_data(sess, "W", SOLAR_MODE_EXPORT)["cost"] == pytest.approx(0.38)
    assert session_event_data(sess, "W", SOLAR_MODE_FREE)["cost"] == pytest.approx(0.30)
    assert session_event_data(sess, "W", SOLAR_MODE_FREE)["duration_min"] is None


def test_statistic_rows_running_sum_and_partial():
    buckets = {
        "2026-10-22T10": [1.0, 0.0, 0.25, 0.25, 0.0],
        "2026-10-22T11": [2.0, 0.0, 0.50, 0.50, 0.0],
        "2026-10-22T12": [0.5, 0.0, 0.10, 0.10, 0.0],
    }
    cost, kwh = statistic_rows(buckets, SOLAR_MODE_EXPORT, AMS)
    assert [r["sum"] for r in cost] == [0.25, 0.75, 0.85]
    assert [r["sum"] for r in kwh] == [1.0, 3.0, 3.5]
    assert cost[0]["start"] == datetime(2026, 10, 22, 8, tzinfo=UTC)
    # A partial update continues the same running sum and leaves out the current hour.
    cost, _ = statistic_rows(buckets, SOLAR_MODE_EXPORT, AMS, since_key="2026-10-22T11", until_key="2026-10-22T12")
    assert [(r["state"], r["sum"]) for r in cost] == [(0.5, 0.75)]


def test_hourly_fields_house_and_rest():
    hours = {
        HOUSE_KEY: {"2026-10-22T10": [3.0, 0.0, 0.9, 0.9, 0.0]},
        "wasmachine": {"2026-10-22T10": [1.0, 0.0, 0.3, 0.3, 0.0], "2026-10-22T11": [0.5, 0.0, 0.15, 0.15, 0.0]},
    }
    out = hourly_fields(hours, ["wasmachine"])
    assert out[REST_KEY]["2026-10-22T10"][0] == pytest.approx(2.0)
    assert out[REST_KEY]["2026-10-22T11"][0] == 0.0
    # Without a house step the devices count as the whole house.
    assert out[HOUSE_KEY]["2026-10-22T11"][0] == 0.5
    assert hourly_fields({"wasmachine": hours["wasmachine"]}, ["wasmachine"]).keys() == {"wasmachine"}

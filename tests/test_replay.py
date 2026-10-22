"""Recalculation from history ("Opnieuw berekenen") with stand-in recorder states."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from edcore.const import HOUSE_KEY, SOLAR_MODE_EXPORT
from edcore.engine import cost_of
from edcore.price import PriceProvider, PriceSeries
from edcore.replay import numeric_series, replay_device, replay_house

UTC = timezone.utc
AMS = ZoneInfo("Europe/Amsterdam")
START = datetime(2026, 10, 18, 0, 0, tzinfo=UTC)


@dataclass
class S:
    state: str
    last_changed: datetime


def at(minutes: float) -> datetime:
    return START + timedelta(minutes=minutes)


def prices() -> PriceProvider:
    items = [(at(15 * i), at(15 * (i + 1)), 0.20 + 0.01 * (i % 8)) for i in range(4 * 24)]
    export = [(at(15 * i), at(15 * (i + 1)), 0.05) for i in range(4 * 24)]
    return PriceProvider(observed=PriceSeries.from_intervals(items), export_series=PriceSeries.from_intervals(export))


def test_charger_daytime_with_solar():
    """11 kW from 12:00 to 13:00 while the house imports only 4 kW worth: 7/11 is solar."""
    status = [S("Standby", at(0)), S("VehicleDetected", at(11 * 60 + 50)), S("Charging", at(12 * 60)), S("Standby", at(13 * 60 + 5))]
    counter = [S("12.0", at(0))]  # previous session's counter
    p1 = [S("1000.0", at(0))]
    imp = 1000.0
    # Idle house: 0.3 kWh per hour until 12:00
    for m in range(5, 12 * 60 + 1, 5):
        imp += 0.3 / 12
        p1.append(S(f"{imp:.5f}", at(m)))
    counter.append(S("0.0", at(11 * 60 + 52)))  # new session: counter back to 0
    value = 0.0
    for m in range(12 * 60 + 5, 13 * 60 + 1, 5):
        value += 11 / 12
        imp += 4 / 12
        counter.append(S(f"{value:.4f}", at(m)))
        p1.append(S(f"{imp:.5f}", at(m)))
    end = at(14 * 60)
    dev = {"id": "laadpaal", "name": "Laadpaal", "type": "charger", "energy_entity": "c", "session_source": "entity",
           "session_entity": "s", "session_states": ["VehicleDetected", "Charging"]}
    states = {"c": counter, "s": status}
    tracker, agg = replay_device(dev, states, numeric_series(p1, "energy", "kWh"), prices(), START, end, AMS, "kWh", None)
    assert len(agg.sessions) == 1
    f = agg.sessions[0]["fields"]
    assert f[0] == pytest.approx(11.0, abs=1e-3)
    assert f[1] == pytest.approx(7.0, abs=0.05)
    assert cost_of(f, SOLAR_MODE_EXPORT) < f[3]  # solar made it cheaper than all-grid
    assert tracker.last_value == pytest.approx(11.0, abs=1e-3)


def test_washer_power_sessions_and_pump_out():
    power = [S("0.6", at(0))]
    counter = [S("100.0", at(0))]
    value = 100.0
    # wash 09:12-10:41 with a 3-minute pause, then pumping out at 10:55 for 2 minutes
    for m in range(9 * 60 + 12, 10 * 60 + 42):
        w = 0.8 if 9 * 60 + 50 <= m < 9 * 60 + 53 else 500.0
        power.append(S(str(w), at(m)))
        value += w / 60 / 1000
        counter.append(S(f"{value:.5f}", at(m)))
    power.append(S("0.6", at(10 * 60 + 42)))
    power.append(S("42", at(10 * 60 + 55)))
    power.append(S("0.6", at(10 * 60 + 57)))
    p1 = [S(f"{2000 + i * 0.01:.3f}", at(i)) for i in range(0, 13 * 60)]
    dev = {"id": "was", "name": "Wasmachine", "type": "sessions", "energy_entity": "e", "power_entity": "p",
           "session_source": "power", "threshold_w": 3, "off_delay_min": 5, "min_duration_min": 10}
    _, agg = replay_device(dev, {"e": counter, "p": power}, numeric_series(p1, "energy", "kWh"), prices(), START, at(13 * 60), AMS, "kWh", "W")
    assert len(agg.sessions) == 1
    sess = agg.sessions[0]
    assert sess["start"] == at(9 * 60 + 12).isoformat()
    assert sess["fields"][0] == pytest.approx(value - 100.0, abs=0.02)


def test_house_replay_rest():
    imp = [S(f"{1000 + i * 0.01:.3f}", at(i)) for i in range(0, 120)]
    _, agg = replay_house([numeric_series(imp, "energy", "kWh"), [], []], prices(), START, at(120), AMS)
    total = sum(v[0] for v in agg.hours[HOUSE_KEY].values())
    assert total == pytest.approx(1.19, abs=0.02)


def test_compressed_recorder_rows():
    rows = [{"s": "1.5", "lu": at(0).timestamp()}, {"s": "unavailable", "lu": at(1).timestamp()}, {"s": "2.0", "lu": at(2).timestamp()}]
    series = numeric_series(rows, "energy", "kWh")
    assert [v for _, v in series] == [1.5, 2.0]
    assert series[1][0] == at(2)
    wh = numeric_series([{"s": "1500", "lu": at(0).timestamp()}], "energy", "Wh")
    assert wh[0][1] == pytest.approx(1.5)

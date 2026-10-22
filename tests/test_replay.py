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


def _night_p1(until_min: int, charging: tuple[int, int], kw: float) -> list[S]:
    """P1 import every minute: 0.3 kW house, plus `kw` while charging."""
    imp, rows = 1000.0, []
    for m in range(until_min + 1):
        rows.append(S(f"{imp:.5f}", at(m)))
        imp += (0.3 + (kw if charging[0] <= m < charging[1] else 0.0)) / 60
    return rows


def test_slow_in_car_counter_at_night_is_grid():
    """An in-car counter polled every 30 minutes, charging 11 kW at night: no phantom solar.

    The P1 base is refreshed every 5 minutes while the counter is quiet; the step must still
    cover the 30 minutes the counter reports about (rule 3: same interval for both counters).
    """
    p1 = _night_p1(6 * 60, (60, 5 * 60), 11.0)
    counter = [S("20.0", at(0))]
    value = 20.0
    for m in range(90, 5 * 60 + 1, 30):
        value += 11 * (min(m, 300) - max(m - 30, 60)) / 60
        counter.append(S(f"{value:.3f}", at(m)))
    dev = {"id": "tesla", "name": "Tesla", "type": "charger", "energy_entity": "c", "session_source": "power",
           "threshold_w": 50, "off_delay_min": 60, "min_duration_min": 10}
    _, agg = replay_device(dev, {"c": counter}, numeric_series(p1, "energy", "kWh"), prices(), START, at(8 * 60), AMS, "kWh", None)
    assert len(agg.sessions) == 1
    f = agg.sessions[0]["fields"]
    assert f[0] == pytest.approx(44.0, abs=0.01)
    assert f[1] == pytest.approx(0.0, abs=0.01)


def test_charging_elsewhere_is_not_counted():
    """38.8 kWh added in 30 minutes (a fast charger on the road) while the house imports nothing extra."""
    p1 = _night_p1(4 * 60, (0, 0), 0.0)
    counter = [S("12.3", at(0)), S("0.0", at(2 * 60)), S("38.76", at(2 * 60 + 30))]  # reset on plugging in
    dev = {"id": "tesla", "name": "Tesla", "type": "charger", "energy_entity": "c", "session_source": "power",
           "threshold_w": 50, "off_delay_min": 60, "min_duration_min": 10}
    _, agg = replay_device(dev, {"c": counter}, numeric_series(p1, "energy", "kWh"), prices(), START, at(4 * 60), AMS, "kWh", None)
    assert agg.sessions == []
    assert sum(v[0] for v in agg.hours.get("tesla", {}).values()) == pytest.approx(0.0)
    assert any("implausible" in s["notes"] for s in agg.steplog["tesla"])


def test_solar_bounded_by_own_production():
    """P1 imports nothing, but the panels only covered 1 of the 3 kWh: the rest is grid, not solar."""
    p1 = [S("500.0", at(0)), S("500.0", at(12 * 60)), S("500.0", at(13 * 60))]
    counter = [S("10.0", at(0))]
    solar = [(at(0), 100.0)]
    value = 10.0
    for m in range(12 * 60 + 1, 13 * 60 + 1):
        value += 3 / 60
        counter.append(S(f"{value:.4f}", at(m)))
        solar.append((at(m), 100.0 + (m - 12 * 60) / 60))
    dev = {"id": "boiler", "name": "Boiler", "type": "continuous", "energy_entity": "c"}
    _, agg = replay_device(dev, {"c": counter}, numeric_series(p1, "energy", "kWh"), prices(), START, at(14 * 60), AMS,
                           "kWh", None, solar)
    kwh = sum(v[0] for v in agg.hours["boiler"].values())
    zon = sum(v[1] for v in agg.hours["boiler"].values())
    assert kwh == pytest.approx(3.0, abs=0.01)
    assert zon == pytest.approx(1.0, abs=0.03)


def test_charger_price_pauses_stay_one_session():
    """Smart charging on a dynamic contract: 15 minutes on, 15 minutes off, then 3 hours on."""
    counter = [S("0.0", at(0))]
    value = 0.0
    on = [m for m in range(60, 180) if (m - 60) // 15 % 2 == 0] + list(range(195, 375))
    for m in on:
        value += 11 / 60
        counter.append(S(f"{value:.4f}", at(m + 1)))
    p1 = _night_p1(8 * 60, (0, 0), 0.0)
    p1 = [S(f"{float(r.state) + 11 / 60 * sum(1 for m in on if m < (r.last_changed - START).total_seconds() / 60):.5f}", r.last_changed) for r in p1]
    dev = {"id": "laadpaal", "name": "Laadpaal", "type": "charger", "energy_entity": "c", "session_source": "power",
           "threshold_w": 50, "off_delay_min": 60, "min_duration_min": 10}
    _, agg = replay_device(dev, {"c": counter}, numeric_series(p1, "energy", "kWh"), prices(), START, at(8 * 60), AMS, "kWh", None)
    assert len(agg.sessions) == 1
    assert agg.sessions[0]["fields"][0] == pytest.approx(11 / 60 * len(on), abs=0.01)

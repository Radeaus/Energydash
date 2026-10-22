"""Test cases from docs/02 §7 plus price parsing and the tracker."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from edcore.aggregate import Aggregator
from edcore.const import SOLAR_MODE_EXPORT, SOLAR_MODE_FREE, SOLAR_MODE_GRID, HOUSE_KEY
from edcore.engine import build_step, cost_of, counter_delta, split_net
from edcore.price import PriceProvider, PriceSeries, parse_forecast
from edcore.tracker import DeviceTracker, HouseTracker

UTC = timezone.utc
AMS = ZoneInfo("Europe/Amsterdam")


def t(h: int, m: int = 0, s: int = 0, day: int = 20) -> datetime:
    return datetime(2026, 10, day, h, m, s, tzinfo=UTC)


def quarter_prices(start: datetime, hours: int, fn) -> PriceSeries:
    items = []
    for i in range(hours * 4):
        a = start + timedelta(minutes=15 * i)
        items.append((a, a + timedelta(minutes=15), fn(i)))
    return PriceSeries.from_intervals(items)


# ---------------------------------------------------------------- docs/02 §7
def test_night_session_counter_method():
    """Case 1: night charge 23:01-05:46, 49.897 kWh, no solar, cost = sum of quarter prices."""
    start = datetime(2026, 10, 20, 21, 1, tzinfo=UTC)  # 23:01 local
    end = datetime(2026, 10, 21, 3, 46, tzinfo=UTC)  # 05:46 local
    series = quarter_prices(datetime(2026, 10, 20, 21, 0, tzinfo=UTC), 8, lambda i: 0.336 + 0.011 * ((i * 7) % 3) / 2)
    prices = PriceProvider(series)
    total_kwh = 49.897
    n = int((end - start).total_seconds() // 300)
    per_step = total_kwh / n
    cfg = {"id": "laadpaal", "type": "charger", "session_source": "entity", "session_entity": "sensor.status", "session_states": ["VehicleDetected", "Charging"]}
    tr = DeviceTracker(cfg)
    tr.on_session_state(start - timedelta(minutes=1), "VehicleDetected")
    p1 = 10_000.0
    tr.on_counter(start, 0.0, p1, prices)
    value = 0.0
    expected_cost = 0.0
    steps = []
    for i in range(1, n + 1):
        ts = start + timedelta(minutes=5 * i)
        value = per_step * i
        p1 += per_step + 0.05  # the house also imports: night, so no solar
        out = tr.on_counter(ts, value, p1, prices)
        steps.extend(out.steps)
        expected_cost += per_step * series.weighted(ts - timedelta(minutes=5), ts)
    tr.on_session_state(end + timedelta(minutes=1), "Standby")
    out = tr.tick(end + timedelta(minutes=30), value, p1, prices)
    assert len(out.sessions) == 1
    sess = out.sessions[0]
    assert sess["fields"][0] == pytest.approx(total_kwh, abs=1e-4)
    assert sess["fields"][1] == pytest.approx(0.0, abs=1e-9)  # no phantom solar at night
    assert cost_of(sess["fields"], SOLAR_MODE_EXPORT) == pytest.approx(expected_cost, abs=0.01)
    assert sum(s.zon for s in steps) == 0


def test_night_session_constant_price_matches_report():
    """49.897 kWh at the session's average all-in price (€0.3473) gives the €17.33 from the report."""
    prices = PriceProvider(fallback=0.3473)
    step = build_step(t(21, 1), t(3, 46, day=21), 49.897, 60.0, prices)
    assert round(cost_of(step.fields, SOLAR_MODE_EXPORT), 2) == 17.33


def test_counter_reset_never_negative():
    """Case 2: a drop means a new counter; count the new value."""
    assert counter_delta(49.897, 0.0) == (0.0, True)
    assert counter_delta(49.897, 0.42) == (0.42, True)
    assert counter_delta(10.0, 10.5) == (0.5, False)
    tr = DeviceTracker({"id": "x", "type": "continuous"})
    prices = PriceProvider(fallback=0.3)
    tr.on_counter(t(10), 5.0, 100.0, prices)
    tr.on_counter(t(10, 5), 6.0, 101.0, prices)
    out = tr.on_counter(t(10, 10), 0.3, 102.0, prices)
    assert out.steps[0].de == pytest.approx(0.3)
    assert "reset" in out.steps[0].notes


def test_step_across_quarter_is_time_weighted():
    """Case 3: a 5-minute step 12:12-12:17 uses 3/5 of q1 price and 2/5 of q2 price."""
    series = PriceSeries.from_intervals([(t(12), t(12, 15), 0.20), (t(12, 15), t(12, 30), 0.40)])
    prices = PriceProvider(series)
    step = build_step(t(12, 12), t(12, 17), 1.0, 2.0, prices)
    assert step.price == pytest.approx(0.6 * 0.20 + 0.4 * 0.40)
    assert len(step.segments) == 2
    assert step.segments[0].kwh == pytest.approx(0.6)


def test_solar_surplus_all_zon():
    """Case 4: surplus larger than the device: net 0, zon = dE."""
    assert split_net(1.5, 0.0) == (0.0, 1.5)
    assert split_net(1.5, -0.2) == (0.0, 1.5)


def test_house_already_importing_no_zon():
    """Case 5: dImport >= dE means zon = 0."""
    assert split_net(1.0, 1.3) == (1.0, 0.0)
    net, zon = split_net(1.0, 0.4)
    assert (round(net, 6), round(zon, 6)) == (0.4, 0.6)


def test_unavailable_gap_one_step():
    """Case 6: 20 minutes unavailable gives one step over the whole interval, nothing lost."""
    prices = PriceProvider(fallback=0.25)
    tr = DeviceTracker({"id": "x", "type": "continuous"})
    tr.on_counter(t(8), 1.0, 50.0, prices)
    # unavailable states are never fed to the tracker; the next valid value spans the gap
    out = tr.on_counter(t(8, 20), 1.8, 51.0, prices)
    step = out.steps[0]
    assert (step.t0, step.t1) == (t(8), t(8, 20))
    assert step.de == pytest.approx(0.8)


def test_no_p1_counts_as_grid():
    net, zon = split_net(0.5, None)
    assert (net, zon) == (0.5, 0.0)


# ------------------------------------------------------------------- prices
def test_parse_zonneplan_forecast():
    attrs = {
        "forecast": [
            {"start_date": "2026-10-20T21:00:00.000000Z", "end_date": "2026-10-20T21:15:00.000000Z",
             "price_tax_included": {"amount": 3360000}, "price_tax_excluded": {"amount": 950000}},
            {"start_date": "2026-10-20T21:15:00.000000Z", "end_date": "2026-10-20T21:30:00.000000Z",
             "price_tax_included": {"amount": 3470000}, "price_tax_excluded": {"amount": 1040000}},
        ]
    }
    parsed = parse_forecast(attrs, 0.336, t(21, 5))
    assert parsed.scale == 1.0
    assert parsed.price.weighted(t(21), t(21, 30)) == pytest.approx((0.336 + 0.347) / 2)
    assert parsed.export.value_at(t(21, 20)) == pytest.approx(0.104)


def test_parse_forecast_auto_scale_cents():
    attrs = {"raw_today": [{"start": "2026-10-20T12:00:00+00:00", "end": "2026-10-20T13:00:00+00:00", "value": 25.0}]}
    parsed = parse_forecast(attrs, 0.25, t(12, 30))
    assert parsed.scale == pytest.approx(0.01)
    assert parsed.price.value_at(t(12, 30)) == pytest.approx(0.25)


def test_price_from_state_history():
    series = PriceSeries.from_steps([(t(10), 0.2), (t(10, 15), 0.3)], t(10, 30))
    assert series.weighted(t(10, 10), t(10, 20)) == pytest.approx(0.25)


# ----------------------------------------------------------- solar valuation
def test_solar_modes():
    prices = PriceProvider(series=PriceSeries.from_intervals([(t(12), t(13), 0.30)]),
                           export_series=PriceSeries.from_intervals([(t(12), t(13), 0.08)]))
    step = build_step(t(12), t(12, 10), 1.0, 0.25, prices)  # 0.25 net, 0.75 zon
    f = step.fields
    assert cost_of(f, SOLAR_MODE_FREE) == pytest.approx(0.25 * 0.30)
    assert cost_of(f, SOLAR_MODE_EXPORT) == pytest.approx(0.25 * 0.30 + 0.75 * 0.08)
    assert cost_of(f, SOLAR_MODE_GRID) == pytest.approx(1.0 * 0.30)


# --------------------------------------------------------------- base refresh
def test_base_refresh_while_idle_limits_first_step():
    prices = PriceProvider(fallback=0.3)
    tr = DeviceTracker({"id": "w", "type": "continuous"})
    tr.on_counter(t(6), 10.0, 100.0, prices)
    # one idle hour: house imports 0.5 kWh, device nothing
    for i in range(1, 13):
        tr.tick(t(6) + timedelta(minutes=5 * i), 10.0, 100.0 + 0.5 * i / 12, prices)
    # device starts: 0.2 kWh in 2 minutes while the P1 imports only 0.05
    out = tr.on_counter(t(7, 2), 10.2, 100.55, prices)
    step = out.steps[0]
    assert step.t0 >= t(6, 55)
    assert step.zon == pytest.approx(0.15, abs=1e-6)


def test_power_sessions_from_counter_and_grace():
    prices = PriceProvider(fallback=0.3)
    cfg = {"id": "was", "type": "sessions", "session_source": "power", "threshold_w": 3, "off_delay_min": 5, "min_duration_min": 10}
    tr = DeviceTracker(cfg)
    value = 0.0
    p1 = 0.0
    tr.on_counter(t(9), value, p1, prices)
    sessions = []
    # 60 minutes at ~1 kW, counter every minute
    for i in range(1, 61):
        value += 1 / 60
        p1 += 1 / 60
        sessions += tr.on_counter(t(9) + timedelta(minutes=i), value, p1, prices).sessions
    for i in range(1, 30):
        sessions += tr.tick(t(10) + timedelta(minutes=i), value, p1, prices).sessions
    assert len(sessions) == 1
    assert sessions[0]["fields"][0] == pytest.approx(1.0, abs=1e-6)


def test_short_peak_discarded():
    prices = PriceProvider(fallback=0.3)
    cfg = {"id": "was", "type": "sessions", "session_source": "power", "power_entity": "sensor.p", "threshold_w": 3, "off_delay_min": 5, "min_duration_min": 10}
    tr = DeviceTracker(cfg)
    out = tr.on_power(t(10, 55), 42, None, prices)
    out.extend(tr.on_power(t(10, 57), 0.8, None, prices))
    out.extend(tr.tick(t(11, 30), None, None, prices))
    assert out.sessions == []


def test_power_only_device_integrates():
    prices = PriceProvider(fallback=0.3)
    tr = DeviceTracker({"id": "p", "type": "continuous", "energy_is_power": True, "power_entity": "sensor.p"})
    tr.on_power(t(10), 1000.0, 10.0, prices)
    out = tr.on_power(t(11), 1000.0, 11.0, prices)
    assert sum(s.de for s in out.steps) == pytest.approx(1.0)


def test_tracker_roundtrip_persistence():
    prices = PriceProvider(fallback=0.3)
    cfg = {"id": "l", "type": "charger", "session_source": "entity", "session_entity": "s", "session_states": ["Charging"]}
    tr = DeviceTracker(cfg)
    tr.on_session_state(t(1), "Charging")
    tr.on_counter(t(1, 1), 1.0, 5.0, prices)
    tr.on_counter(t(1, 6), 2.0, 6.0, prices)
    saved = tr.to_dict()
    tr2 = DeviceTracker(cfg)
    tr2.restore(saved)  # simulates a Home Assistant restart
    tr2.on_counter(t(1, 11), 3.0, 7.0, prices)
    tr2.on_session_state(t(1, 12), "Standby")
    out = tr2.tick(t(2), 3.0, 7.0, prices)
    assert out.sessions[0]["fields"][0] == pytest.approx(2.0)


# ---------------------------------------------------------------- aggregation
def test_rest_of_house_and_summary():
    prices = PriceProvider(fallback=0.30)
    agg = Aggregator()
    house = HouseTracker()
    house.tick(t(10), 100.0, 50.0, 200.0, prices)
    step = house.tick(t(11), 101.0, 50.5, 201.0, prices)  # import 1, solar 1, export 0.5 -> house 1.5
    assert step.de == pytest.approx(1.5)
    agg.add_step(HOUSE_KEY, step, AMS)
    dev = build_step(t(10), t(11), 0.5, 1.0, prices)
    agg.add_step("was", dev, AMS)
    summ = agg.summary([{"id": "was", "name": "Wasmachine"}], datetime(2026, 10, 20).date(), 1, SOLAR_MODE_FREE)
    assert summ["totals"]["_rest"]["kwh"] == pytest.approx(1.0)
    assert summ["totals"]["was"]["cost"] == pytest.approx(0.15)

"""Baseload without night sessions, long-term statistics before the recorder window, year view."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from edcore.aggregate import Aggregator
from edcore.backfill import (
    backfill_device,
    backfill_house,
    prices_from_cost,
    self_use_hourly,
)
from edcore.const import HOUSE_KEY, SOLAR_MODE_FREE
from edcore.price import PriceProvider, PriceSeries

UTC = timezone.utc
AMS = ZoneInfo("Europe/Amsterdam")


def flat_prices(value: float = 0.25) -> PriceProvider:
    start = datetime(2025, 1, 1, tzinfo=UTC)
    return PriceProvider(observed=PriceSeries.from_intervals([(start, start + timedelta(days=800), value)]))


def _night(agg: Aggregator, day: date, series: str, kwh: tuple[float, float, float]) -> None:
    for h, v in zip((2, 3, 4), kwh):
        agg.hours.setdefault(series, {})[f"{day.isoformat()}T{h:02d}"] = [v, 0.0, v * 0.25, v * 0.25, 0.0]


def test_baseload_ignores_night_charging():
    """Charging the car at night must not count as baseload: 0.25 kW stays 250 W."""
    agg = Aggregator()
    today = date(2026, 10, 22)
    devices = [{"id": "tesla", "name": "Tesla", "type": "charger"}, {"id": "server", "name": "Server", "type": "continuous"}]
    for i in range(1, 8):
        d = today - timedelta(days=i)
        charging = (11.0, 11.0, 5.0) if i % 2 else (0.0, 0.0, 0.0)
        _night(agg, d, HOUSE_KEY, tuple(0.25 + c for c in charging))
        _night(agg, d, "tesla", charging)
        _night(agg, d, "server", (0.08, 0.08, 0.08))
    base = agg.baseload(devices, today, SOLAR_MODE_FREE)
    assert base["watt"] == pytest.approx(250.0, abs=1)
    assert [p["device_id"] for p in base["explained"]] == ["server"]
    assert base["unexplained_w"] == pytest.approx(170.0, abs=1)


def test_baseload_uses_quietest_night_hour():
    """A dishwasher that is not an added device runs at 02:00; the quiet hours still give the baseload."""
    agg = Aggregator()
    today = date(2026, 10, 22)
    for i in range(1, 8):
        _night(agg, today - timedelta(days=i), HOUSE_KEY, (1.4, 0.2, 0.2))
    assert agg.baseload([], today, SOLAR_MODE_FREE)["watt"] == pytest.approx(200.0, abs=1)


def test_backfill_from_hourly_statistics():
    before = datetime(2026, 10, 12, 0, tzinfo=UTC)
    h1 = datetime(2026, 9, 1, 10, tzinfo=UTC)  # sunny hour: 2 kWh used, 0.5 imported, 3 produced, 1.2 exported
    h2 = datetime(2026, 9, 1, 22, tzinfo=UTC)  # night: 1 kWh used, 1.3 imported
    h3 = datetime(2026, 9, 2, 14, tzinfo=UTC)  # 40 kWh in one hour: charged on the road
    late = datetime(2026, 10, 12, 0, tzinfo=UTC)  # inside the recorder window: left alone
    energy = {h1: 2.0, h2: 1.0, h3: 40.0, late: 5.0}
    imp = {h1: 0.5, h2: 1.3, h3: 0.4, late: 6.0}
    solar = self_use_hourly({h1: 3.0, h2: 0.0, h3: 0.0}, {h1: 1.2, h2: 0.0, h3: 0.0})
    agg = Aggregator()
    added = backfill_device(agg, "dev", energy, imp, solar, flat_prices(), AMS, before)
    assert added == 2
    hours = agg.hours["dev"]
    assert sum(v[0] for v in hours.values()) == pytest.approx(3.0)
    assert sum(v[1] for v in hours.values()) == pytest.approx(1.5)  # h1: 2 - min(2, 0.5); h2: none
    assert backfill_house(agg, imp, solar, flat_prices(), AMS, before) == 3
    house = agg.hours[HOUSE_KEY]
    assert sum(v[0] for v in house.values()) == pytest.approx(0.5 + 1.8 + 1.3 + 0.4)


def test_price_from_energy_dashboard_cost():
    h = datetime(2026, 9, 1, 10, tzinfo=UTC)
    assert prices_from_cost({h: 0.6}, {h: 2.0}) == {h: pytest.approx(0.3)}
    assert prices_from_cost({h: 0.0}, {h: 0.0}) == {}


def test_year_summary_by_month():
    agg = Aggregator()
    for key in ("2026-01-15T10", "2026-01-20T10", "2026-03-02T10"):
        agg.hours.setdefault("dev", {})[key] = [1.0, 0.0, 0.25, 0.25, 0.0]
    s = agg.summary([{"id": "dev", "name": "Dev"}], date(2026, 1, 1), 100, SOLAR_MODE_FREE, by_month=True)
    rows = {r["date"]: r["series"].get("dev", {}).get("kwh", 0) for r in s["days"]}
    assert list(rows) == ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01"]
    assert rows["2026-01-01"] == pytest.approx(2.0)
    assert rows["2026-03-01"] == pytest.approx(1.0)

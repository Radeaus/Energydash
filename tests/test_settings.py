"""Settings from the panel, prices with a markup, export price choices and several counters per meter."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from edcore.backfill import sum_hourly
from edcore.discovery_rules import grid_suggestions, pick_price_entity
from edcore.price import PriceProvider, PriceSeries
from edcore.replay import sum_counters
from edcore.settings import clean_settings, entity_ids, export_mode, markup

T0 = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)
H = timedelta(hours=1)

BASE = {
    "contract": "dynamic",
    "price_entity": "sensor.price",
    "import_entity": "sensor.p1_import",
    "solar_mode": "export",
    "export_price_mode": "auto",
}


def test_contract_must_be_chosen():
    with pytest.raises(ValueError, match="missing_contract"):
        clean_settings({**BASE, "contract": None})


def test_fixed_single_price_clears_entity_fields():
    s = clean_settings({**BASE, "contract": "fixed", "price_normal": "0.30", "price_low": None,
                        "price_markup": 0.12, "export_price_mode": "same"})
    assert s["price_entity"] is None and s["price_markup"] is None
    assert s["price_normal"] == 0.30 and s["price_low"] is None
    assert s["import_entity"] == ["sensor.p1_import"]


def test_fixed_contract_cannot_use_entity_export():
    with pytest.raises(ValueError, match="invalid_export_mode"):
        clean_settings({**BASE, "contract": "fixed", "price_normal": 0.3, "export_price_mode": "auto"})


def test_export_choice_needed_with_solar():
    with pytest.raises(ValueError, match="missing_export_mode"):
        clean_settings({**BASE, "export_price_mode": None, "solar_entity": ["sensor.inv"]})
    # Without export or solar meters there is nothing to value.
    assert clean_settings({**BASE, "export_price_mode": None})["export_price_mode"] is None


def test_export_fields_only_for_their_mode():
    s = clean_settings({**BASE, "export_price_mode": "fixed", "export_price_fixed": 0.07, "export_price_entity": "sensor.x"})
    assert s["export_price_entity"] is None and s["export_price_fixed"] == 0.07
    with pytest.raises(ValueError, match="missing_export_price_entity"):
        clean_settings({**BASE, "export_price_mode": "entity"})


def test_meters_as_lists():
    s = clean_settings({**BASE, "import_entity": ["sensor.t1", "sensor.t2", "sensor.t1", ""], "export_entity": None})
    assert s["import_entity"] == ["sensor.t1", "sensor.t2"] and s["export_entity"] == []
    assert entity_ids("sensor.a") == ["sensor.a"] and entity_ids(None) == []


def test_legacy_settings_keep_their_export_behaviour():
    assert export_mode({"contract": "dynamic"}) == "auto"
    assert export_mode({"contract": "dynamic", "export_price_entity": "sensor.e"}) == "entity"
    assert export_mode({"contract": "fixed"}) == "fixed"
    assert export_mode({"contract": "fixed", "export_price_mode": "same"}) == "same"
    assert markup({"contract": "fixed", "price_markup": 0.1}) == 0.0
    assert markup({"contract": "dynamic", "price_markup": 0.1}) == 0.1


def test_markup_is_added_to_the_import_price_only():
    series = PriceSeries.from_intervals([(T0, T0 + H, 0.10)])
    p = PriceProvider(series=series, markup=0.15, export_from_import=(1.0, 0.0))
    assert p.price(T0, T0 + H) == pytest.approx(0.25)
    # Derived export price comes from the entity's own (market) price, without taxes.
    assert p.export_price(T0, T0 + H) == pytest.approx(0.10)


def test_export_same_as_import_price():
    series = PriceSeries.from_intervals([(T0, T0 + H, 0.10)])
    p = PriceProvider(series=series, markup=0.15, export_same=True, export_fallback=0.01)
    assert p.export_price(T0, T0 + H) == pytest.approx(0.25)
    fixed = PriceProvider(fixed=(0.30, 0.20, timezone.utc), export_same=True)
    assert fixed.export_price(T0, T0 + H) == pytest.approx(0.30)


def test_sum_counters_one_counter_unchanged():
    one = [(T0, 5.0), (T0 + H, 4.0)]
    assert sum_counters([one]) == one
    assert sum_counters([[], []]) == []


def test_sum_counters_two_tariffs_with_a_reset():
    t1 = [(T0, 100.0), (T0 + 2 * H, 101.0), (T0 + 4 * H, 0.5)]  # resets to 0.5
    t2 = [(T0 + H, 200.0), (T0 + 3 * H, 202.0)]
    total = sum_counters([t1, t2])
    assert total[0] == (T0 + H, 300.0)  # starts once both have a value
    assert [v for _, v in total] == [300.0, 301.0, 303.0, 303.5]
    assert all(b >= a for (_, a), (_, b) in zip(total, total[1:]))


def test_sum_hourly():
    assert sum_hourly([{T0: 1.0, T0 + H: 2.0}, {T0 + H: 0.5}]) == {T0: 1.0, T0 + H: 2.5}


def test_grid_suggestions_every_counter():
    prefs = {"energy_sources": [
        {"type": "grid",
         "flow_from": [{"stat_energy_from": "sensor.t1", "entity_energy_price": "sensor.price", "number_energy_price": None},
                       {"stat_energy_from": "sensor.t2", "entity_energy_price": None}],
         "flow_to": [{"stat_energy_to": "sensor.e1", "entity_energy_price": "sensor.feed_in"},
                     {"stat_energy_to": "sensor.e2"}]},
        {"type": "solar", "stat_energy_from": "sensor.inv1"},
        {"type": "solar", "stat_energy_from": "sensor.inv2"},
    ]}
    g = grid_suggestions(prefs)
    assert g["import"] == ["sensor.t1", "sensor.t2"] and g["export"] == ["sensor.e1", "sensor.e2"]
    assert g["solar"] == ["sensor.inv1", "sensor.inv2"]
    assert g["price_entity"] == "sensor.price" and g["export_price_entity"] == "sensor.feed_in"


def test_pick_price_entity_prefers_quarters():
    def fc(minutes):
        return [{"start": (T0 + timedelta(minutes=minutes * i)).isoformat(), "value": 0.2} for i in range(8)]
    sensors = [
        ("sensor.nordpool", "EUR/kWh", {"raw_today": fc(60)}, "0.2"),
        ("sensor.quarter", "€/kWh", {"forecast": fc(15)}, "0.2"),
        ("sensor.temperature", "°C", {"forecast": fc(15)}, "12"),
        ("sensor.no_forecast", "€/kWh", {}, "0.2"),
    ]
    assert pick_price_entity(sensors) == "sensor.quarter"
    assert pick_price_entity(sensors[:1]) == "sensor.nordpool"
    assert pick_price_entity(sensors[2:]) is None

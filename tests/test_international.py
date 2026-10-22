"""Setups outside the Netherlands: price units, other price integrations, VAT, low tariff hours,
home batteries, net meters, and device names in other languages."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from edcore.backfill import backfill_house, self_use_hourly
from edcore.aggregate import Aggregator
from edcore.const import F_KWH, HOUSE_KEY, TYPE_CHARGER, TYPE_CONTINUOUS, TYPE_SESSIONS
from edcore.discovery_rules import counts_down, grid_suggestions, is_periodic, is_price_unit, suggest_type
from edcore.price import (
    LowHours,
    PriceProvider,
    PriceSeries,
    best_forecast,
    fixed_tariff_series,
    interval_groups,
    is_low_tariff,
    parse_forecast,
    unit_factor,
)
from edcore.replay import replay_house, self_use_series
from edcore.settings import clean_settings, has_battery, low_hours, vat
from edcore.tracker import DeviceTracker, HouseTracker

UTC = timezone.utc
BRU = ZoneInfo("Europe/Brussels")
T0 = datetime(2026, 10, 20, 12, 0, tzinfo=UTC)
H = timedelta(hours=1)
Q = timedelta(minutes=15)


# ------------------------------------------------------------------ price units
@pytest.mark.parametrize(
    ("unit", "factor"),
    [
        ("EUR/kWh", 1.0),
        ("€/kWh", 1.0),
        ("SEK/kWh", 1.0),
        ("$/kWh", 1.0),
        ("ct/kWh", 0.01),
        ("c/kWh", 0.01),
        ("cent/kWh", 0.01),
        ("EUR cent/kWh", 0.01),
        ("GBp/kWh", 0.01),
        ("p/kWh", 0.01),
        ("öre/kWh", 0.01),
        ("øre/kWh", 0.01),
        ("EUR/MWh", 0.001),
        ("€/MWh", 0.001),
        ("GBP/kWh", 1.0),
        ("", 1.0),
        (None, 1.0),
        ("W", 1.0),
    ],
)
def test_unit_factor(unit, factor):
    assert unit_factor(unit) == pytest.approx(factor)


def test_price_units_are_recognized():
    assert is_price_unit("ct/kWh")
    assert is_price_unit("EUR/MWh")
    assert not is_price_unit("kWh")
    assert not is_price_unit(None)


# ------------------------------------------------------- other forecast formats
def _iso(t: datetime) -> str:
    return t.isoformat()


def test_amber_forecasts():
    attrs = {"forecasts": [{"start_time": _iso(T0 + Q * i), "end_time": _iso(T0 + Q * (i + 1)), "per_kwh": 0.20 + 0.01 * i} for i in range(4)]}
    parsed = parse_forecast(attrs, 0.21, T0 + Q)
    assert parsed.price.value_at(T0 + Q) == pytest.approx(0.21)
    assert parsed.attribute == "forecasts"


def test_octopus_rates():
    attrs = {"rates": [{"start": _iso(T0 + 30 * i * timedelta(minutes=1)), "end": _iso(T0 + 30 * (i + 1) * timedelta(minutes=1)), "value_inc_vat": 0.15 + 0.1 * i} for i in range(3)]}
    parsed = parse_forecast(attrs, 0.25, T0 + timedelta(minutes=40))
    assert parsed.price.value_at(T0 + timedelta(minutes=40)) == pytest.approx(0.25)


def test_epex_spot_in_cents_scaled_to_state():
    # EPEX Spot: per item a price in ct/kWh while the state is in EUR/kWh.
    attrs = {"data": [{"start_time": _iso(T0 + H * i), "end_time": _iso(T0 + H * (i + 1)), "price_ct_per_kwh": 10.0 + i} for i in range(3)]}
    parsed = parse_forecast(attrs, 0.11, T0 + H)
    assert parsed.scale == pytest.approx(0.01)
    assert parsed.price.value_at(T0 + H) == pytest.approx(0.11)


def test_tibber_custom_today_tomorrow():
    attrs = {
        "today": [{"startsAt": _iso(T0 + H * i), "total": 0.3 + 0.01 * i} for i in range(2)],
        "tomorrow": [{"startsAt": _iso(T0 + H * (24 + i)), "total": 0.4} for i in range(2)],
    }
    parsed = parse_forecast(attrs, 0.31, T0 + H)
    assert parsed.price.value_at(T0 + H) == pytest.approx(0.31)
    assert parsed.price.value_at(T0 + 24 * H) == pytest.approx(0.4)


def test_nord_pool_hacs_float_lists_are_ignored():
    # The Nord Pool custom integration also has `today`: a list of plain numbers, not intervals.
    attrs = {"today": [0.1, 0.2], "raw_today": [{"start": _iso(T0), "end": _iso(T0 + H), "value": 0.1}]}
    parsed = parse_forecast(attrs, 0.1, T0)
    assert parsed.attribute == "raw_today"


def test_nord_pool_action_picks_the_matching_area():
    # Nord Pool in Home Assistant core returns prices per MWh, one list per area.
    response = {
        "SE3": [{"start": _iso(T0 + Q * i), "end": _iso(T0 + Q * (i + 1)), "price": 50.0 + i} for i in range(8)],
        "SE4": [{"start": _iso(T0 + Q * i), "end": _iso(T0 + Q * (i + 1)), "price": 90.0 + i} for i in range(8)],
    }
    groups = interval_groups(response)
    assert len(groups) == 2
    parsed = best_forecast(groups, 0.091, T0 + Q, "nordpool.get_prices_for_date")
    assert parsed is not None
    assert parsed.price.value_at(T0 + Q) == pytest.approx(0.091)


def test_tibber_action_and_no_match():
    response = {"prices": {"Home": [{"start_time": _iso(T0 + H * i), "price": 0.3} for i in range(3)]}}
    groups = interval_groups(response)
    assert best_forecast(groups, 0.3, T0 + H, "tibber.get_prices") is not None
    # A forecast that does not match the state (other VAT setting) is not used.
    assert best_forecast(groups, 0.36, T0 + H, "tibber.get_prices") is None


def test_energyzero_action_timestamps_without_end():
    response = {"prices": [{"timestamp": _iso(T0 + H * i), "price": 0.2 + 0.1 * i} for i in range(3)]}
    parsed = best_forecast(interval_groups(response), 0.3, T0 + H + Q, "energyzero.get_energy_prices")
    assert parsed is not None
    assert parsed.price.value_at(T0 + 2 * H + Q) == pytest.approx(0.4)


def test_scaled_series():
    series = PriceSeries.from_intervals([(T0, T0 + H, 25.0)])
    assert series.scaled(0.01).value_at(T0) == pytest.approx(0.25)
    assert series.value_at(T0) == 25.0


# --------------------------------------------------------------------- VAT
def test_vat_over_price_and_markup():
    prices = PriceProvider(PriceSeries.from_intervals([(T0, T0 + H, 0.10)]), markup=0.15, vat=0.21)
    assert prices.price(T0, T0 + Q) == pytest.approx((0.10 + 0.15) * 1.21)


def test_vat_not_on_derived_export_price():
    prices = PriceProvider(PriceSeries.from_intervals([(T0, T0 + H, 0.10)]), markup=0.15, vat=0.21, export_from_import=(1.0, 0.0))
    assert prices.export_price(T0, T0 + Q) == pytest.approx(0.10)


def test_vat_setting():
    base = {"contract": "dynamic", "price_entity": "sensor.p", "import_entity": "sensor.i", "solar_mode": "free"}
    s = clean_settings({**base, "price_vat": "21"})
    assert vat(s) == pytest.approx(0.21)
    assert vat(clean_settings(base)) == 0.0
    with pytest.raises(ValueError, match="invalid_vat"):
        clean_settings({**base, "price_vat": 121})
    fixed = clean_settings({"contract": "fixed", "price_normal": 0.3, "import_entity": "sensor.i", "solar_mode": "free", "price_vat": 21})
    assert vat(fixed) == 0.0


# --------------------------------------------------------- low tariff hours
def test_default_low_hours_are_dutch():
    monday_23 = datetime(2026, 10, 19, 21, 30, tzinfo=UTC)  # 23:30 in Brussels
    saturday_noon = datetime(2026, 10, 24, 10, 0, tzinfo=UTC)
    assert is_low_tariff(monday_23, BRU)
    assert is_low_tariff(saturday_noon, BRU)


def test_belgian_low_hours_without_weekend():
    hours = LowHours.parse("22:00", "07:00", False)
    saturday_noon = datetime(2026, 10, 24, 10, 0, tzinfo=UTC)
    monday_2230 = datetime(2026, 10, 19, 20, 30, tzinfo=UTC)
    monday_0700 = datetime(2026, 10, 19, 5, 0, tzinfo=UTC)
    assert not is_low_tariff(saturday_noon, BRU, hours)
    assert is_low_tariff(monday_2230, BRU, hours)
    assert not is_low_tariff(monday_0700, BRU, hours)


def test_daytime_low_hours_and_half_hours():
    hours = LowHours.parse("13:30", "16:00", False)
    t = datetime(2026, 10, 19, 11, 45, tzinfo=UTC)  # 13:45 in Brussels
    assert is_low_tariff(t, BRU, hours)
    assert not is_low_tariff(t - timedelta(minutes=30), BRU, hours)
    series = fixed_tariff_series(t - H, t + H, 0.30, 0.20, BRU, hours)
    assert series.weighted(t - H, t) == pytest.approx((0.30 * 45 + 0.20 * 15) / 60)


def test_fixed_provider_uses_low_hours():
    hours = LowHours.parse("22:00", "06:00", False)
    t = datetime(2026, 10, 24, 10, 0, tzinfo=UTC)  # Saturday noon
    prices = PriceProvider(fixed=(0.30, 0.20, BRU, hours))
    assert prices.price(t, t + Q) == pytest.approx(0.30)
    assert PriceProvider(fixed=(0.30, 0.20, BRU)).price(t, t + Q) == pytest.approx(0.20)


def test_low_hours_setting():
    base = {"contract": "fixed", "price_normal": 0.3, "price_low": 0.2, "import_entity": "sensor.i", "solar_mode": "free"}
    s = clean_settings({**base, "low_start": "22:00", "low_end": "06:00", "low_weekend": False})
    assert low_hours(s) == LowHours(22 * 60, 6 * 60, False)
    assert low_hours({}) == LowHours()
    with pytest.raises(ValueError, match="invalid_low_hours"):
        clean_settings({**base, "low_start": "25:00"})
    one = clean_settings({**base, "price_low": None, "low_start": "22:00"})
    assert one["low_start"] is None


# ------------------------------------------------------------- home battery
def test_battery_from_energy_dashboard():
    prefs = {"energy_sources": [
        {"type": "grid", "flow_from": [{"stat_energy_from": "sensor.imp"}], "flow_to": [{"stat_energy_to": "sensor.exp"}]},
        {"type": "battery", "stat_energy_from": "sensor.bat_out", "stat_energy_to": "sensor.bat_in"},
    ]}
    found = grid_suggestions(prefs)
    assert found["battery_discharge"] == ["sensor.bat_out"]
    assert found["battery_charge"] == ["sensor.bat_in"]
    assert found["import"] == ["sensor.imp"]


def test_battery_needs_both_counters():
    base = {"contract": "dynamic", "price_entity": "sensor.p", "import_entity": "sensor.i", "solar_mode": "free"}
    with pytest.raises(ValueError, match="battery_needs_both"):
        clean_settings({**base, "battery_charge_entity": ["sensor.in"]})
    s = clean_settings({**base, "battery_charge_entity": "sensor.in", "battery_discharge_entity": "sensor.out"})
    assert has_battery(s)


class Flat:
    def price(self, t0, t1):
        return 0.30

    def export_price(self, t0, t1):
        return 0.05


def test_house_with_battery_discharging_at_night():
    house = HouseTracker()
    house.tick(T0, 100.0, 50.0, None, Flat(), 10.0, 20.0)
    # Night: the battery delivers 0.4 kWh, the grid 0.1 kWh: the house used 0.5 kWh.
    step = house.tick(T0 + H, 100.1, 50.0, None, Flat(), 10.0, 20.4)
    assert step.de == pytest.approx(0.5)
    assert step.zon == pytest.approx(0.4)
    assert step.net == pytest.approx(0.1)


def test_house_with_battery_charging_from_grid():
    house = HouseTracker()
    house.tick(T0, 100.0, 50.0, None, Flat(), 10.0, 20.0)
    # Cheap hour: 3 kWh from the grid, 2.5 kWh into the battery: the house used 0.5 kWh.
    step = house.tick(T0 + H, 103.0, 50.0, None, Flat(), 12.5, 20.0)
    assert step.de == pytest.approx(0.5)
    assert step.zon == 0.0


def test_house_with_solar_and_battery():
    house = HouseTracker()
    house.tick(T0, 100.0, 50.0, 1000.0, Flat(), 10.0, 20.0)
    # 3 kWh solar: 1 kWh into the battery, 0.5 kWh exported, 1.5 kWh used, plus 0.2 kWh import.
    step = house.tick(T0 + H, 100.2, 50.5, 1003.0, Flat(), 11.0, 20.0)
    assert step.de == pytest.approx(1.7)
    assert step.zon == pytest.approx(1.5)


def test_house_restores_older_state_without_battery_keys():
    house = HouseTracker()
    house.restore({"last": {"import": 1.0, "export": None, "solar": None}, "last_time": T0.isoformat()})
    assert house.last["charge"] is None
    assert house.tick(T0 + H, 1.5, None, None, Flat()).de == pytest.approx(0.5)


def test_device_on_battery_power_at_night():
    """At night, a device running on the battery is own power, never more than the battery delivered."""
    tr = DeviceTracker({"id": "dw", "type": "continuous"})
    own = self_use_series([], [], [(T0, 10.0), (T0 + H, 10.0)], [(T0, 20.0), (T0 + H, 20.6)])
    assert own[-1][1] - own[0][1] == pytest.approx(0.6)
    tr.on_counter(T0, 5.0, 100.0, Flat(), own[0][1])
    out = tr.on_counter(T0 + H, 5.8, 100.2, Flat(), own[-1][1])
    step = out.steps[0]
    # P1 imported 0.2 kWh: at least that much is grid; the rest (0.6) came from the battery.
    assert step.net == pytest.approx(0.2)
    assert step.zon == pytest.approx(0.6)


def test_self_use_hourly_with_battery():
    h1, h2 = T0, T0 + H
    use = self_use_hourly({h1: 2.0, h2: 0.0}, {h1: 0.5, h2: 0.0}, {h1: 1.0, h2: 0.0}, {h1: 0.0, h2: 0.8})
    assert use[h1] == pytest.approx(0.5)
    assert use[h2] == pytest.approx(0.8)
    only_battery = self_use_hourly(None, None, {h1: 2.0}, {h2: 0.4})
    assert only_battery == {h1: -2.0, h2: 0.4}


def test_backfill_house_with_grid_charging():
    agg = Aggregator()
    use = {T0: -2.5}
    backfill_house(agg, {T0: 3.0}, use, PriceProvider(PriceSeries.from_intervals([(T0, T0 + H, 0.2)])), BRU, T0 + 2 * H)
    vals = next(iter(agg.hours[HOUSE_KEY].values()))
    assert vals[F_KWH] == pytest.approx(0.5)


def test_replay_house_with_battery_series():
    imp = [(T0, 100.0), (T0 + H, 101.0)]
    chg = [(T0, 10.0), (T0 + H, 10.5)]
    dis = [(T0, 20.0), (T0 + H, 20.0)]
    _, agg = replay_house([imp, [], [], chg, dis], Flat(), T0, T0 + H + timedelta(minutes=2), BRU)
    total = sum(v[F_KWH] for v in agg.hours[HOUSE_KEY].values())
    assert total == pytest.approx(0.5)


# ------------------------------------------------------------------ net meter
def test_net_meter_counts_down():
    t = [T0 + timedelta(minutes=5 * i) for i in range(6)]
    net = list(zip(t, [100.0, 100.2, 100.1, 99.9, 99.8, 100.0]))
    separate = list(zip(t, [100.0, 100.2, 100.3, 100.3, 100.5, 100.6]))
    reset = list(zip(t, [100.0, 100.2, 0.0, 0.1, 0.2, 0.3]))
    assert counts_down(net)
    assert not counts_down(separate)
    assert not counts_down(reset)


# ------------------------------------------------------- names in other languages
@pytest.mark.parametrize(
    ("name", "kind"),
    [
        ("Waschmaschine Keller", TYPE_SESSIONS),
        ("Geschirrspüler", TYPE_SESSIONS),
        ("Lave-linge", TYPE_SESSIONS),
        ("Lavadora", TYPE_SESSIONS),
        ("Tvättmaskin", TYPE_SESSIONS),
        ("Kühlschrank", TYPE_CONTINUOUS),
        ("Wärmepumpe", TYPE_CONTINUOUS),
        ("Pompe à chaleur", TYPE_CONTINUOUS),
        ("Ladestation Garage", TYPE_CHARGER),
        ("Zappi", TYPE_CHARGER),
    ],
)
def test_device_names_in_other_languages(name, kind):
    assert suggest_type(name)[0] == kind


@pytest.mark.parametrize(
    ("entity_id", "periodic"),
    [
        ("sensor.waschmaschine_energie_heute", True),
        ("sensor.verbrauch_monat", True),
        ("sensor.consommation_aujourd_hui", True),
        ("sensor.waschmaschine_energie_messung", False),
        ("sensor.media_player_energy", False),
        ("sensor.fridge_energy", False),
    ],
)
def test_periodic_names_in_other_languages(entity_id, periodic):
    assert is_periodic(entity_id) is periodic

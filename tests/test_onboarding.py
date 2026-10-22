"""Quick start: devices built from suggestions and which ones are checked (docs/03, own HA scan)."""

from __future__ import annotations

from edcore.discovery_rules import session_entity_rank
from edcore.onboarding import assess, build_device, mark_duplicates, order, pick_type, session_states_ok, spark, summarize


def cand(entity_id, name, **kw):
    base = {"entity_id": entity_id, "name": name, "type": "sessions", "type_reason": "default", "power_only": False,
            "power_entity": None, "in_energy_prefs": True, "device_name": name, "area": None}
    return {**base, **kw}


def analysis(**kw):
    base = {"checks": [{"code": "unit", "level": "ok"}, {"code": "state_class", "level": "ok"}], "suggested_type": "sessions",
            "type_reason": "on_off", "power_settings": {"threshold_w": 4.0, "off_delay_min": 12.0, "min_duration_min": 10.0}, "has_history": True}
    return {**base, **kw}


WASHER = cand("sensor.zolder_wasmachine_energy_import", "Wasmachine", type_reason="name", power_entity="sensor.zolder_wasmachine_vermogen")
CHARGER = cand("sensor.charge_laadpaal_laadpaal_energie_geleverd_sessie", "Laadpaal", type="charger", type_reason="name")
TESLA = cand("sensor.controlekamer_tesla_model_3_charge_energy_added", "Tesla Model 3", type="charger", type_reason="name", in_energy_prefs=False, device_name=None)
SERVER = cand("sensor.zolder_server_energy_import", "Server", type="continuous", type_reason="name")


def test_pick_type_name_beats_history():
    assert pick_type(WASHER, analysis(suggested_type="continuous", type_reason="mostly_on")) == "sessions"
    plain = cand("sensor.x", "Stekker")
    assert pick_type(plain, analysis(suggested_type="continuous", type_reason="never_below")) == "continuous"
    assert pick_type(plain, analysis(suggested_type="continuous", type_reason="no_history")) == "sessions"


def test_build_device_sessions_from_power():
    dev = build_device(WASHER, analysis())
    assert dev["type"] == "sessions"
    assert dev["session_source"] == "power"
    assert dev["power_entity"] == "sensor.zolder_wasmachine_vermogen"
    assert (dev["threshold_w"], dev["off_delay_min"]) == (4.0, 12.0)


def test_build_device_charger_with_status_entity():
    dev = build_device(CHARGER, analysis(), "sensor.charge_laadpaal_laadpaalstatus", ["Charging", "SuspendedEV"])
    assert dev["session_source"] == "entity"
    assert dev["session_states"] == ["Charging", "SuspendedEV"]


def test_build_device_charger_without_states_falls_back_to_power_with_long_pause():
    dev = build_device(CHARGER, analysis(), "sensor.charge_laadpaal_laadpaalstatus", [])
    assert dev["session_source"] == "power"
    assert dev["session_entity"] is None
    assert dev["off_delay_min"] == 60.0


def test_build_device_power_only():
    plug = cand("sensor.keuken_vermogen", "Keuken", power_only=True)
    dev = build_device(plug, analysis())
    assert dev["energy_is_power"] and dev["power_entity"] == "sensor.keuken_vermogen"


def test_summarize_sessions_and_continuous():
    washer = build_device(WASHER, analysis())
    s = summarize(washer, {"sessions": [{"kwh": 1.0}, {"kwh": 1.2}, {"kwh": None}], "power": [["t", 0], ["t", 2000]]}, 7)
    assert s["sessions"] == 3 and s["kwh_avg"] == 1.1
    server = build_device(SERVER, analysis(suggested_type="continuous"))
    s = summarize(server, {"sessions": [], "power": [["t", 90]], "kwh": 8.064, "kwh_hours": 168}, 7)
    assert s["kwh_day"] == 1.15 and s["avg_w"] == 48 and s["sessions"] is None


def test_spark_keeps_peaks():
    values = [0.0] * 800
    values[401] = 2100.0
    out = spark(values)
    assert len(out) == 80 and max(out) == 2100.0


def test_assess_rules():
    washer = build_device(WASHER, analysis())
    found = {"sessions": 5}
    assert assess(WASHER, analysis(), washer, found) == (True, "in_prefs")
    assert assess(WASHER, analysis(), washer, {"sessions": 0}) == (True, "no_sessions")
    assert assess(WASHER, analysis(has_history=False), washer, found) == (True, "no_history")
    bad = analysis(checks=[{"code": "state_class", "level": "bad"}])
    assert assess(WASHER, bad, washer, found) == (False, "data")
    plug = cand("sensor.keuken_vermogen", "Keuken", power_only=True)
    assert assess(plug, analysis(), build_device(plug, analysis()), found) == (False, "power_only")
    # Droger: Energy Socket that is not in the Energy dashboard, but hangs on a device.
    dryer = cand("sensor.zolder_droger_energy_import", "Droger", in_energy_prefs=False)
    assert assess(dryer, analysis(), build_device(dryer, analysis()), found) == (True, "device")
    assert assess(dryer, analysis(), build_device(dryer, analysis()), {"sessions": 0}) == (False, "no_sessions")
    loose = cand("sensor.som", "Som", in_energy_prefs=False, device_name=None)
    assert assess(loose, analysis(), build_device(loose, analysis()), found) == (False, "loose")


def test_tesla_counter_is_not_checked_next_to_charger():
    car = analysis(checks=[{"code": "unit", "level": "ok"}, {"code": "in_car_meter", "level": "warn"}])
    assert assess(TESLA, car, build_device(TESLA, car), {"sessions": 3}) == (False, "in_car")


def item(c, checked=True):
    return {"device": build_device(c, analysis()), "checked": checked, "reason": "in_prefs", "in_energy_prefs": c["in_energy_prefs"]}


def test_second_charger_is_unchecked_and_order():
    other = cand("sensor.wallbox_energy", "Wallbox", type="charger", type_reason="name", in_energy_prefs=False)
    items = [item(other), item(SERVER), item(CHARGER), item(TESLA, checked=False), item(WASHER)]
    mark_duplicates(items)
    assert items[0]["checked"] is False and items[0]["reason"] == "duplicate_charger"
    assert items[2]["checked"] is True
    names = [i["device"]["name"] for i in order(items)]
    assert names == ["Laadpaal", "Server", "Wasmachine", "Tesla Model 3", "Wallbox"]


def test_session_states_must_leave_an_idle_state():
    # Charger connectivity sensor: counter rose while 'on' and 'off', so the session would never end.
    assert not session_states_ok(["on", "off"], ["on", "off"])
    assert not session_states_ok(["Charging", "Standby"], ["Charging", "Standby"])
    assert not session_states_ok([], ["Charging", "Standby"])
    assert not session_states_ok(["unavailable"], ["Charging", "Standby"])
    assert session_states_ok(["Charging", "SuspendedEV"], ["Charging", "SuspendedEV", "Standby", "VehicleDetected"])
    assert session_states_ok(["on"], ["on", "off"])


def test_connectivity_entity_ranks_after_status():
    ids = [
        ("binary_sensor.charge_laadpaal_laadpaal_verbindingsstatus", "connectivity", True),
        ("sensor.charge_laadpaal_laadpaalstatus", "enum", True),
        ("binary_sensor.controlekamer_tesla_model_3_oplaadkabel", "plug", False),
    ]
    ranked = sorted(ids, key=lambda i: session_entity_rank(*i))
    assert ranked[0][0] == "sensor.charge_laadpaal_laadpaalstatus"
    assert ranked[-1][0] == "binary_sensor.charge_laadpaal_laadpaal_verbindingsstatus"

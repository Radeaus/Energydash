"""Discovery filters against the scan of the own HA (referentie/ha-scan-2026-10-22.md)."""

from __future__ import annotations

from edcore.discovery_rules import Candidate, filter_candidates, pick_power_entity, suggest_type

P1 = "p1"
INV = "inverter"
SCAN = [
    ("sensor.p1_dag_verbruik", "total", P1, None),
    ("sensor.p1_dag_export_kwh", "total", P1, None),
    ("sensor.zolder_server_energy_import", "total_increasing", "sock_server", None),
    ("sensor.zolder_wasmachine_energy_import", "total_increasing", "sock_was", None),
    ("sensor.p1_meter_energy_import", "total_increasing", P1, None),
    ("sensor.p1_meter_energie_import_tarief_1", "total_increasing", P1, None),
    ("sensor.p1_meter_energie_export", "total_increasing", P1, None),
    ("sensor.woonkamer_airco_energy_usage_cycle", "total_increasing", "airco_w", None),
    ("sensor.woonkamer_woonkamer_airco_mitsubishi_energieverbruik_totaal", "total_increasing", "airco_w", None),
    ("sensor.airco_slaapkamer_energy_usage_cycle", "total_increasing", "airco_s", None),
    ("sensor.slaapkamer_slaapkamer_airco_mitsubishi_energieverbruik_totaal", "total_increasing", "airco_s", None),
    ("sensor.tesla_energie_uit_zon_totaal", "total", None, "integration"),
    ("sensor.tesla_energie_uit_net_totaal", "total", None, "integration"),
    ("sensor.energy_production_today", None, "forecast", None),
    ("sensor.controlekamer_tesla_model_3_charge_energy_added", "total", None, None),
    ("sensor.inverter_omvormer_zolder_energy", "total_increasing", INV, None),
    ("sensor.zolder_omvormer_goodwe_energy_this_month", "total_increasing", INV, None),
    ("sensor.homekit_sems_daily_load_consumption", "total_increasing", None, None),
    ("sensor.zonneplan_verbruik_vandaag", "total_increasing", "zp", None),
    ("sensor.gebruiker_maandelijks_nettoverbruik", "total_increasing", "q", None),
    ("sensor.charge_laadpaal_laadpaal_energie_geleverd_sessie", "total_increasing", "laadpaal", None),
    ("sensor.zolder_droger_energy_import", "total_increasing", "sock_droger", None),
]
PREFS = {
    "sensor.charge_laadpaal_laadpaal_energie_geleverd_sessie",
    "sensor.zolder_server_energy_import",
    "sensor.woonkamer_woonkamer_airco_mitsubishi_energieverbruik_totaal",
    "sensor.slaapkamer_slaapkamer_airco_mitsubishi_energieverbruik_totaal",
    "sensor.zolder_wasmachine_energy_import",
}


def test_scan_filters():
    cands = [
        Candidate(eid, eid, "energy", "kWh", sc, platform=plat, device_id=dev, in_energy_prefs=eid in PREFS)
        for eid, sc, dev, plat in SCAN
    ]
    kept, _ = filter_candidates(
        cands,
        excluded_entities={"sensor.p1_meter_energy_import", "sensor.p1_meter_energie_export", "sensor.inverter_omvormer_zolder_energy"},
        excluded_devices={P1, INV},
        used_entities=set(),
    )
    ids = {c.entity_id for c in kept}
    expected = PREFS | {"sensor.zolder_droger_energy_import"}
    assert expected <= ids
    # Only the Tesla in-car counter (an alternative source, no device) remains besides the six.
    assert ids - expected <= {"sensor.controlekamer_tesla_model_3_charge_energy_added"}


def test_suggest_type():
    assert suggest_type("Laadpaal energie")[0] == "charger"
    assert suggest_type("Zolder wasmachine")[0] == "sessions"
    assert suggest_type("Zolder server")[0] == "continuous"


def test_pick_power_prefers_non_phase():
    power = [
        Candidate("sensor.zolder_server_vermogen_fase_1", "", "power", "W", "measurement", device_id="d"),
        Candidate("sensor.zolder_server_vermogen", "", "power", "W", "measurement", device_id="d"),
    ]
    assert pick_power_entity(power, "d", None) == "sensor.zolder_server_vermogen"

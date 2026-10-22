"""Filters and suggestions for discovered meters (docs/03). Pure module."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from .const import TYPE_CHARGER, TYPE_CONTINUOUS, TYPE_SESSIONS
from .price import parse_forecast, unit_factor

# Name parts in English, Dutch, German, French, Spanish, Italian, Swedish, Danish, and Norwegian.
PERIODIC_TOKENS = (
    "today", "vandaag", "yesterday", "gisteren", "daily", "_dag_", "_dag", "dag_",
    "week", "month", "maand", "year", "jaar", "last_", "cycle", "_hour", "_uur",
    "heute", "gestern", "taglich", "monat", "jahr", "woche", "stunde",
    "aujourd", "_hier", "_jour", "semaine", "_mois", "annee", "heure",
    "_hoy", "_ayer", "diario", "semana", "_mes_", "_ano_",
    "oggi", "_ieri", "giorn", "settiman", "_mese", "_anno",
    "idag", "_igar", "manad", "i_dag", "maned", "_aar_",
)
DERIVED_PLATFORMS = {
    "integration", "template", "utility_meter", "statistics", "derivative", "min_max",
    "group", "filter", "energydash", "powercalc", "compensation",
}
CHARGER_TOKENS = (
    "laadpaal", "charger", "wallbox", "evse", "laadstation", "easee", "zaptec", "alfen",
    "ladestation", "ladepunkt", "borne", "recharge", "cargador", "laddbox", "laddstation", "ladeboks",
    "go_e", "goe_", "ohme", "myenergi", "zappi", "pod_point", "wallbox", "openevse", "keba", "peblar",
)
SESSION_TOKENS = (
    "wasmachine", "washer", "washing", "droger", "dryer", "vaatwasser", "dishwasher", "oven", "airfryer", "magnetron",
    "waschmaschine", "trockner", "trocknen", "geschirrspuler", "spulmaschine", "backofen", "mikrowelle",
    "lave_linge", "lavelinge", "seche_linge", "lave_vaisselle", "_four", "micro_onde",
    "lavadora", "secadora", "lavavajillas", "horno", "lavatrice", "asciugatrice", "lavastoviglie", "forno",
    "tvattmaskin", "torktumlare", "diskmaskin", "vaskemaskin", "vaskemaskine", "torketrommel", "oppvask", "opvask",
)
# Says whether the device is online, not whether it is in use: never a session source.
CONNECTIVITY_TOKENS = ("verbinding", "connect", "online", "wifi", "rssi", "signal", "update", "firmware", "bereikbaar", "available")
CONTINUOUS_TOKENS = (
    "server", "koelkast", "fridge", "vriezer", "freezer", "airco", "warmtepomp", "heat_pump", "heatpump", "router", "nas", "boiler", "aquarium",
    "kuhlschrank", "gefrier", "warmepumpe", "klima", "refrigerateur", "frigo", "congelateur", "pompe_a_chaleur", "climatis",
    "nevera", "frigorifico", "congelador", "bomba_de_calor", "frigorifero", "congelatore", "pompa_di_calore", "condizionatore",
    "kylskap", "frys", "varmepump", "kjoleskap", "fryser", "varmepumpe", "air_condition", "water_heater", "ac_unit",
)


def _fold(text: str) -> str:
    """Lowercase without accents and with umlauts dropped, so 'Kühlschrank' matches 'kuhlschrank'."""
    import unicodedata  # noqa: PLC0415

    norm = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in norm if not unicodedata.combining(c)).replace("-", "_").replace(" ", "_")


@dataclass
class Candidate:
    entity_id: str
    name: str
    device_class: str  # "energy" or "power"
    unit: str | None
    state_class: str | None
    platform: str | None = None
    device_id: str | None = None
    device_name: str | None = None
    area: str | None = None
    in_energy_prefs: bool = False
    prefs_name: str | None = None
    stat_rate: str | None = None
    value: float | None = None
    reasons: list[str] = field(default_factory=list)


def is_periodic(entity_id: str) -> bool:
    obj = _fold(entity_id.split(".", 1)[-1])
    return any(tok in obj for tok in PERIODIC_TOKENS)


def suggest_type(text: str) -> tuple[str, str]:
    """Suggest a device type from names; returns (type, reason)."""
    low = _fold(text)
    if any(t in low for t in CHARGER_TOKENS):
        return TYPE_CHARGER, "name"
    if any(t in low for t in SESSION_TOKENS):
        return TYPE_SESSIONS, "name"
    if any(t in low for t in CONTINUOUS_TOKENS):
        return TYPE_CONTINUOUS, "name"
    return TYPE_SESSIONS, "default"


def filter_candidates(
    energy: list[Candidate],
    excluded_entities: set[str],
    excluded_devices: set[str],
    used_entities: set[str],
) -> tuple[list[Candidate], list[tuple[Candidate, str]]]:
    """Apply the docs/03 filters. Returns (kept, [(dropped, reason)])."""
    kept: list[Candidate] = []
    dropped: list[tuple[Candidate, str]] = []
    for cand in energy:
        if cand.entity_id in used_entities:
            dropped.append((cand, "already_added"))
        elif cand.entity_id in excluded_entities:
            dropped.append((cand, "grid_or_solar"))
        elif cand.device_id and cand.device_id in excluded_devices and not cand.in_energy_prefs:
            dropped.append((cand, "grid_or_solar_device"))
        elif cand.state_class not in ("total", "total_increasing"):
            dropped.append((cand, "no_state_class"))
        elif is_periodic(cand.entity_id) and not cand.in_energy_prefs:
            dropped.append((cand, "periodic"))
        elif cand.platform in DERIVED_PLATFORMS and not cand.in_energy_prefs:
            dropped.append((cand, "derived"))
        else:
            kept.append(cand)

    # Duplicates of one physical measurement: same non-zero value as another kept counter.
    result: list[Candidate] = []
    seen: dict[float, Candidate] = {}
    for cand in sorted(kept, key=lambda c: (not c.in_energy_prefs, c.device_id is None, c.entity_id)):
        if cand.value:
            key = round(cand.value, 2)
            if key in seen:
                dropped.append((cand, "duplicate"))
                continue
            seen[key] = cand
        result.append(cand)
    return result, dropped


def pick_power_entity(power: list[Candidate], device_id: str | None, stat_rate: str | None) -> str | None:
    """Power entity of the same device; prefer the Energy-dashboard stat_rate, avoid per-phase sensors."""
    if stat_rate:
        return stat_rate
    if not device_id:
        return None
    same = [p for p in power if p.device_id == device_id]
    if not same:
        return None
    same.sort(key=lambda p: (bool(re.search(r"(fase|phase|_l[123]\b)", p.entity_id)), len(p.entity_id)))
    return same[0].entity_id


def session_entity_rank(entity_id: str, device_class: str | None, same_device: bool) -> tuple:
    """Sort key for session entities: same device first, connectivity last, then status-like names."""
    low = entity_id.lower()
    connectivity = device_class == "connectivity" or any(t in low for t in CONNECTIVITY_TOKENS)
    return (connectivity, not same_device, "status" not in low, entity_id)


def grid_suggestions(prefs: dict[str, Any]) -> dict[str, Any]:
    """Meters and prices from the Energy dashboard: every grid and solar counter, not just the first.

    A smart meter with separate normal and low tariff counters has two import counters; a house
    with two inverters has two solar sources. Prices only come from the import flow (the export
    flow has its own compensation price).
    """
    found: dict[str, Any] = {"import": [], "export": [], "solar": [], "battery_charge": [], "battery_discharge": [],
                             "price_entity": None, "price_fixed": None, "export_price_entity": None, "export_price_fixed": None}

    def add(key: str, value: Any) -> None:
        if isinstance(value, str) and "." in value and value not in found[key]:
            found[key].append(value)

    def first(key: str, value: Any) -> None:
        if found[key] is None and value is not None and value != "":
            found[key] = value

    def walk(obj: Any, kind: str | None) -> None:
        if isinstance(obj, dict):
            kind = obj.get("type", kind)
            if kind == "grid" and "stat_energy_from" in obj:
                add("import", obj["stat_energy_from"])
                first("price_entity", obj.get("entity_energy_price"))
                first("price_fixed", obj.get("number_energy_price"))
            elif kind == "grid" and "stat_energy_to" in obj:
                add("export", obj["stat_energy_to"])
                first("export_price_entity", obj.get("entity_energy_price"))
                first("export_price_fixed", obj.get("number_energy_price"))
            elif kind == "solar" and "stat_energy_from" in obj:
                add("solar", obj["stat_energy_from"])
            elif kind == "battery" and "stat_energy_from" in obj and "stat_energy_to" in obj:
                # From the battery is discharge, to the battery is charge.
                add("battery_discharge", obj["stat_energy_from"])
                add("battery_charge", obj["stat_energy_to"])
            for value in obj.values():
                if isinstance(value, (dict, list)):
                    walk(value, kind)
        elif isinstance(obj, list):
            for item in obj:
                walk(item, kind)

    walk(prefs.get("energy_sources") or [], None)
    return found


def pick_price_entity(sensors: list[tuple[str, str | None, dict[str, Any], str]]) -> str | None:
    """A price entity to suggest when the Energy dashboard has none: a sensor per kWh with a forecast.

    `sensors` are (entity_id, unit, attributes, state). Quarter-hour prices beat hourly ones.
    Only a suggestion: the user chooses the price entity in the panel.
    """
    best: tuple[tuple, str] | None = None
    for entity_id, unit, attributes, state in sensors:
        if not is_price_unit(unit):
            continue
        try:
            value = float(state)
        except (TypeError, ValueError):
            continue
        series = parse_forecast(attributes, value, None).price
        if not series:
            continue
        spacing = min((b - a).total_seconds() for a, b in zip(series.starts, series.ends))
        key = (spacing > 900, entity_id)
        if best is None or key < best[0]:
            best = (key, entity_id)
    return best[1] if best else None


def is_price_unit(unit: str | None) -> bool:
    """A price per energy unit: EUR/kWh, ct/kWh, öre/kWh, €/MWh and similar."""
    low = (unit or "").lower().replace(" ", "")
    return low.endswith("/kwh") or low.endswith("/mwh")


def price_unit_note(unit: str | None) -> float | None:
    """The conversion factor when the unit is not a main currency per kWh, else None (for the panel)."""
    factor = unit_factor(unit)
    return None if factor == 1.0 else factor


def counts_down(series: list[tuple[Any, float]], min_drop: float = 0.01, min_times: int = 3) -> bool:
    """A meter that counts down while exporting (a single net meter) instead of separate counters.

    A reset falls to (near) zero; a net meter drops a little, many times. Energydash needs separate
    import and export counters, because a drop is otherwise read as a new counter (docs/02 §1).
    """
    drops = 0
    for (_, prev), (_, value) in zip(series, series[1:]):
        if value < prev - min_drop and value > prev * 0.5:
            drops += 1
            if drops >= min_times:
                return True
    return False

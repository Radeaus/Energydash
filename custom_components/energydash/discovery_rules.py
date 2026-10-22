"""Filters and suggestions for discovered meters (docs/03). Pure module."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .const import TYPE_CHARGER, TYPE_CONTINUOUS, TYPE_SESSIONS

PERIODIC_TOKENS = (
    "today", "vandaag", "yesterday", "gisteren", "daily", "_dag_", "_dag", "dag_",
    "week", "month", "maand", "year", "jaar", "last_", "cycle", "_hour", "_uur",
)
DERIVED_PLATFORMS = {
    "integration", "template", "utility_meter", "statistics", "derivative", "min_max",
    "group", "filter", "energydash", "powercalc", "compensation",
}
CHARGER_TOKENS = ("laadpaal", "charger", "wallbox", "evse", "laadstation", "easee", "zaptec", "alfen")
SESSION_TOKENS = ("wasmachine", "washer", "washing", "droger", "dryer", "vaatwasser", "dishwasher", "oven", "airfryer", "magnetron")
# Says whether the device is online, not whether it is in use: never a session source.
CONNECTIVITY_TOKENS = ("verbinding", "connect", "online", "wifi", "rssi", "signal", "update", "firmware", "bereikbaar", "available")
CONTINUOUS_TOKENS = ("server", "koelkast", "fridge", "vriezer", "freezer", "airco", "warmtepomp", "heat_pump", "heatpump", "router", "nas", "boiler", "aquarium")


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
    obj = entity_id.split(".", 1)[-1].lower()
    return any(tok in obj for tok in PERIODIC_TOKENS)


def suggest_type(text: str) -> tuple[str, str]:
    """Suggest a device type from names; returns (type, reason)."""
    low = text.lower()
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

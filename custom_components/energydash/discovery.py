"""Find meters, suggest devices and check data quality (docs/03)."""

from __future__ import annotations

import asyncio
from datetime import timedelta
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util

from .const import (
    CONF_EXPORT_ENTITY,
    CONF_IMPORT_ENTITY,
    CONF_SOLAR_ENTITY,
    SESSION_FROM_ENTITY,
    TYPE_CHARGER,
    TYPE_CONTINUOUS,
    TYPE_SESSIONS,
)
from .discovery_rules import (
    CHARGER_TOKENS,
    DERIVED_PLATFORMS,
    Candidate,
    filter_candidates,
    grid_suggestions,
    is_periodic,
    pick_power_entity,
    pick_price_entity,
    session_entity_rank,
    suggest_type,
)
from .history import (
    INVALID,
    StepLookup,
    async_get_states,
    count_invalid,
    downsample,
    median_interval,
    numeric_series,
    text_series,
    unit_of,
)
from .onboarding import (
    SESSION_ENTITY_TRIES,
    assess,
    build_device,
    mark_duplicates,
    order,
    pick_type,
    session_states_ok,
    summarize,
)
from .sessions import detect_power_sessions, suggest_power_settings
from .settings import entity_ids

_LOGGER = logging.getLogger(__name__)
ANALYZE_DAYS = 7
SUGGEST_MAX = 20  # quick start looks at this many meters at most; the rest is in the advanced wizard
SUGGEST_PARALLEL = 4


async def async_energy_prefs(hass: HomeAssistant) -> dict[str, Any]:
    try:
        from homeassistant.components.energy.data import async_get_manager  # noqa: PLC0415

        manager = await async_get_manager(hass)
        return dict(manager.data or {})
    except Exception:  # noqa: BLE001 - energy not set up
        return {}


def _collect_stats(obj: Any, out: set[str]) -> None:
    """All stat_* entity ids in energy_sources, whatever the exact prefs format is."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key.startswith("stat_") and isinstance(value, str) and "." in value:
                out.add(value)
            else:
                _collect_stats(value, out)
    elif isinstance(obj, list):
        for item in obj:
            _collect_stats(item, out)


async def async_suggest_settings(hass: HomeAssistant) -> dict[str, Any]:
    """Starting values from the Energy dashboard: meters, and a price entity to suggest.

    The type of price (entity or fixed) and the export price are never assumed: the user chooses
    them in the panel's quick start (docs/04).
    """
    found = grid_suggestions(await async_energy_prefs(hass))
    if not found["price_entity"]:
        found["price_entity"] = pick_price_entity([
            (st.entity_id, st.attributes.get("unit_of_measurement"), dict(st.attributes), st.state)
            for st in hass.states.async_all("sensor")
        ])
    return found


async def async_discover(hass: HomeAssistant, settings: dict[str, Any], used: set[str]) -> dict[str, Any]:
    prefs = await async_energy_prefs(hass)
    ent_reg = er.async_get(hass)
    dev_reg = dr.async_get(hass)
    area_reg = ar.async_get(hass)

    excluded: set[str] = set()
    _collect_stats(prefs.get("energy_sources") or [], excluded)
    for key in (CONF_IMPORT_ENTITY, CONF_EXPORT_ENTITY, CONF_SOLAR_ENTITY):
        excluded.update(entity_ids(settings.get(key)))
    excluded_devices = set()
    for eid in excluded:
        entry = ent_reg.async_get(eid)
        if entry and entry.device_id:
            excluded_devices.add(entry.device_id)

    consumption = {}
    for item in prefs.get("device_consumption") or []:
        if item.get("stat_consumption"):
            consumption[item["stat_consumption"]] = item

    energy: list[Candidate] = []
    power: list[Candidate] = []
    for state in hass.states.async_all("sensor"):
        dc = state.attributes.get("device_class")
        if dc not in ("energy", "power"):
            continue
        entry = ent_reg.async_get(state.entity_id)
        device = dev_reg.async_get(entry.device_id) if entry and entry.device_id else None
        area_id = (entry.area_id if entry else None) or (device.area_id if device else None)
        area = area_reg.async_get_area(area_id) if area_id else None
        pref = consumption.get(state.entity_id)
        try:
            value = float(state.state)
        except ValueError:
            value = None
        cand = Candidate(
            entity_id=state.entity_id,
            name=str(state.attributes.get("friendly_name") or state.entity_id),
            device_class=dc,
            unit=state.attributes.get("unit_of_measurement"),
            state_class=state.attributes.get("state_class"),
            platform=entry.platform if entry else None,
            device_id=device.id if device else None,
            device_name=(device.name_by_user or device.name) if device else None,
            area=area.name if area else None,
            in_energy_prefs=pref is not None,
            prefs_name=(pref or {}).get("name"),
            stat_rate=(pref or {}).get("stat_rate"),
            value=value,
        )
        (energy if dc == "energy" else power).append(cand)

    kept, _dropped = filter_candidates(energy, excluded, excluded_devices, used)
    suggested: list[dict[str, Any]] = []
    others: list[dict[str, Any]] = []
    devices_with_counter = {c.device_id for c in kept if c.device_id}
    for cand in kept:
        item = _candidate_dict(cand, power)
        (suggested if (cand.in_energy_prefs or cand.device_id) else others).append(item)

    for cand in power:
        if (
            cand.device_id
            and cand.device_id not in devices_with_counter
            and cand.device_id not in excluded_devices
            and cand.entity_id not in used
            and cand.platform not in DERIVED_PLATFORMS
            and not is_periodic(cand.entity_id)
            and pick_power_entity(power, cand.device_id, None) == cand.entity_id
        ):
            item = _candidate_dict(cand, power)
            item["power_only"] = True
            others.append(item)

    suggested.sort(key=lambda c: (not c["in_energy_prefs"], c["name"].lower()))
    others.sort(key=lambda c: c["name"].lower())
    return {"suggested": suggested, "others": others}


def _candidate_dict(cand: Candidate, power: list[Candidate]) -> dict[str, Any]:
    name = cand.prefs_name or cand.device_name or cand.name
    dev_type, reason = suggest_type(" ".join(filter(None, [name, cand.entity_id, cand.device_name])))
    return {
        "entity_id": cand.entity_id,
        "name": name,
        "unit": cand.unit,
        "device_name": cand.device_name,
        "area": cand.area,
        "in_energy_prefs": cand.in_energy_prefs,
        "power_entity": None if cand.device_class == "power" else pick_power_entity(power, cand.device_id, cand.stat_rate),
        "power_only": cand.device_class == "power",
        "type": dev_type,
        "type_reason": reason,
        "session_entities": [],
    }


def session_entity_candidates(hass: HomeAssistant, energy_entity: str) -> list[dict[str, Any]]:
    """Status sensors and binary sensors of the same device, plus charger-like entities."""
    ent_reg = er.async_get(hass)
    entry = ent_reg.async_get(energy_entity)
    device_id = entry.device_id if entry else None
    out = []
    for state in hass.states.async_all(("sensor", "binary_sensor", "input_boolean", "switch")):
        e = ent_reg.async_get(state.entity_id)
        same = device_id is not None and e is not None and e.device_id == device_id
        low = state.entity_id.lower()
        numeric = True
        try:
            float(state.state)
        except ValueError:
            numeric = False
        if state.entity_id.startswith("sensor.") and (numeric and state.state not in INVALID):
            continue
        looks = any(t in low for t in ("status", "kabel", "cable", "plug", "oplaad", "charging", "bezig", "running", "state"))
        if same or (looks and any(t in low for t in CHARGER_TOKENS + ("tesla", "car", "auto", "was", "droger"))):
            options = state.attributes.get("options") or []
            out.append({"entity_id": state.entity_id, "name": state.attributes.get("friendly_name") or state.entity_id,
                        "same_device": same, "state": state.state, "options": list(options),
                        "rank": session_entity_rank(state.entity_id, state.attributes.get("device_class"), same)})
    out.sort(key=lambda c: c.pop("rank"))
    return out[:30]


async def async_analyze(hass: HomeAssistant, req: dict[str, Any]) -> dict[str, Any]:
    """Gegevenscheck + suggested type and settings from the last 7 days of history."""
    energy_id: str = req["energy_entity"]
    energy_is_power = bool(req.get("energy_is_power"))
    power_id = req.get("power_entity") or (energy_id if energy_is_power else None)
    session_id = req.get("session_entity")
    end = dt_util.utcnow()
    start = end - timedelta(days=ANALYZE_DAYS)
    states = await async_get_states(hass, [energy_id, power_id, session_id], start, end)
    checks: list[dict[str, Any]] = []
    cur = hass.states.get(energy_id)
    attrs = cur.attributes if cur else {}
    e_unit = attrs.get("unit_of_measurement")

    if energy_is_power:
        checks.append({"level": "warn", "code": "power_only", "value": e_unit or "W"})
    else:
        sc = attrs.get("state_class")
        checks.append({"level": "ok" if attrs.get("device_class") == "energy" else "warn", "code": "unit", "value": f"{e_unit or '?'}, {attrs.get('device_class') or '?'}"})
        checks.append({"level": "ok" if sc in ("total", "total_increasing") else "bad", "code": "state_class", "value": sc or "-"})

    e_states = states.get(energy_id, [])
    if energy_is_power:
        series = numeric_series(e_states, "power", e_unit)
        interval = median_interval([t for t, _ in series])
    else:
        series = numeric_series(e_states, "energy", e_unit)
        resets = sum(1 for (_, a), (_, b) in zip(series, series[1:]) if b < a)
        rising = [t for (t0, a), (t, b) in zip(series, series[1:]) if b > a]
        interval = median_interval(rising)
        checks.append({"level": "ok", "code": "resets" if resets else "no_resets", "value": resets})
    if interval is None:
        checks.append({"level": "warn", "code": "refresh_unknown", "value": None})
    else:
        lvl = "ok" if interval <= 90 else "warn"
        if energy_is_power and interval > 120:
            lvl = "bad"
        checks.append({"level": lvl, "code": "refresh", "value": round(interval)})
    gaps = count_invalid(e_states)
    checks.append({"level": "ok" if gaps <= 3 else "warn", "code": "interruptions", "value": gaps})
    name_text = f"{energy_id} {attrs.get('friendly_name', '')}".lower()
    if "charge_energy_added" in name_text or ("tesla" in name_text and "added" in name_text):
        checks.append({"level": "warn", "code": "in_car_meter", "value": None})

    # Power samples for session suggestions: real power entity or derived from counter steps.
    p_states = states.get(power_id, []) if power_id else []
    p_series = numeric_series(p_states, "power", unit_of(hass, power_id)) if power_id else []
    if not p_series and not energy_is_power:
        p_series = _derived_power(series)
    hist_type, hist_reason = _type_from_history(p_series)
    name_type, name_reason = suggest_type(name_text)
    suggested_type = name_type if name_reason == "name" else hist_type
    reason = name_reason if name_reason == "name" else hist_reason

    result: dict[str, Any] = {
        "checks": checks,
        "suggested_type": suggested_type,
        "type_reason": reason,
        "power_settings": suggest_power_settings(p_series),
        "session_candidates": session_entity_candidates(hass, energy_id),
        "history_days": ANALYZE_DAYS,
        "has_history": bool(series),
    }
    if session_id:
        s_states = states.get(session_id, [])
        txt = text_series(s_states)
        seen = sorted({s for _, s in txt if s not in INVALID} | set((hass.states.get(session_id).attributes.get("options") or []) if hass.states.get(session_id) else []))
        result["session_states"] = seen
        result["session_suggested_states"] = _active_states(txt, series)
        s_interval = median_interval([t for t, _ in txt])
        result["session_check"] = {"level": "ok" if (s_interval or 0) <= 360 else "warn", "code": "session_refresh", "value": round(s_interval) if s_interval else None}
    return result


def _derived_power(energy: list[tuple[Any, float]]) -> list[tuple[Any, float]]:
    out = []
    for (t0, a), (t1, b) in zip(energy, energy[1:]):
        hours = (t1 - t0).total_seconds() / 3600
        if hours <= 0:
            continue
        de = b - a if b >= a else b
        out.append((t0, de / hours * 1000))
        out.append((t1 - timedelta(seconds=1), de / hours * 1000))
    return out


def _type_from_history(power: list[tuple[Any, float]]) -> tuple[str, str]:
    if not power:
        return TYPE_SESSIONS, "no_history"
    values = [w for _, w in power]
    if min(values) > 30:
        return TYPE_CONTINUOUS, "never_below"
    long_high = 0
    run_start = None
    for t, w in power:
        if w > 7000:
            run_start = run_start or t
        elif run_start is not None:
            if (t - run_start).total_seconds() > 3600:
                long_high += 1
            run_start = None
    if long_high >= 1:
        return TYPE_CHARGER, "high_power"
    above = sum(1 for v in values if v > 30) / len(values)
    if above > 0.6:
        return TYPE_CONTINUOUS, "mostly_on"
    return TYPE_SESSIONS, "on_off"


def _active_states(states: list[tuple[Any, str]], energy: list[tuple[Any, float]]) -> list[str]:
    """States during which the counter increased."""
    if not states or not energy:
        return []
    lookup = StepLookup([(t, i) for i, (t, _) in enumerate(states)])
    hits: dict[str, float] = {}
    for (t0, a), (t1, b) in zip(energy, energy[1:]):
        if b <= a:
            continue
        idx = lookup.at(t1 - timedelta(seconds=1))
        if idx is None:
            continue
        st = states[int(idx)][1]
        if st not in INVALID:
            hits[st] = hits.get(st, 0.0) + (b - a)
    total = sum(hits.values()) or 1
    return [s for s, v in sorted(hits.items(), key=lambda kv: -kv[1]) if v / total > 0.02]


async def async_preview(hass: HomeAssistant, req: dict[str, Any]) -> dict[str, Any]:
    """Sessions that would have been found in the last days with the given settings."""
    days = int(req.get("days") or ANALYZE_DAYS)
    end = dt_util.utcnow()
    start = end - timedelta(days=days)
    energy_id = req["energy_entity"]
    energy_is_power = bool(req.get("energy_is_power"))
    power_id = req.get("power_entity") or (energy_id if energy_is_power else None)
    session_id = req.get("session_entity") if req.get("session_source") == SESSION_FROM_ENTITY else None
    states = await async_get_states(hass, [energy_id, power_id, session_id], start, end)
    energy = [] if energy_is_power else numeric_series(states.get(energy_id, []), "energy", unit_of(hass, energy_id))
    power = numeric_series(states.get(power_id, []), "power", unit_of(hass, power_id)) if power_id else _derived_power(energy)

    if session_id:
        active = set(req.get("session_states") or [])
        found = []
        run = None
        for t, s in text_series(states.get(session_id, [])):
            if s in INVALID:
                continue
            if s in active and run is None:
                run = t
            elif s not in active and run is not None:
                found.append((run, t))
                run = None
        if run is not None:
            found.append((run, end))
    else:
        found = detect_power_sessions(
            power,
            float(req.get("threshold_w") or 3),
            float(req.get("off_delay_min") or 5),
            float(req.get("min_duration_min") or 10),
            end,
        )
    counter = StepLookup(energy) if energy else None
    kwh_total = sum(b - a if b >= a else b for (_, a), (_, b) in zip(energy, energy[1:])) if energy else None
    kwh_hours = (end - energy[0][0]).total_seconds() / 3600 if energy else None
    sessions = []
    for a, b in found:
        kwh = None
        if counter:
            v0, v1 = counter.at(a), counter.at(b + timedelta(minutes=10))
            if v0 is not None and v1 is not None:
                kwh = round(v1 - v0 if v1 >= v0 else v1, 3)
        if kwh is None and power:
            lk = StepLookup(power)
            total, t = 0.0, a
            while t < b:
                w = lk.at(t) or 0.0
                total += w / 60 / 1000
                t += timedelta(minutes=1)
            kwh = round(total, 3)
        sessions.append({"start": a.isoformat(), "end": b.isoformat(), "minutes": round((b - a).total_seconds() / 60), "kwh": kwh})
    return {
        "start": start.isoformat(), "end": end.isoformat(), "power": downsample(power, start, end), "sessions": sessions,
        "kwh": round(kwh_total, 3) if kwh_total is not None else None, "kwh_hours": round(kwh_hours, 2) if kwh_hours else None,
    }


async def async_suggest(hass: HomeAssistant, settings: dict[str, Any], used: set[str]) -> dict[str, Any]:
    """Quick start: every discovered meter as a ready device, with a verdict whether to add it (docs/03)."""
    found = await async_discover(hass, settings, used)
    cands = (found["suggested"] + found["others"])[:SUGGEST_MAX]
    sem = asyncio.Semaphore(SUGGEST_PARALLEL)

    async def one(cand: dict[str, Any]) -> dict[str, Any] | None:
        async with sem:
            try:
                return await _suggest_one(hass, cand)
            except Exception:  # noqa: BLE001 - one odd meter must not break the list
                _LOGGER.exception("Quick start could not check %s", cand["entity_id"])
                return None

    items = [i for i in await asyncio.gather(*(one(c) for c in cands)) if i]
    mark_duplicates(items)
    return {"items": order(items), "days": ANALYZE_DAYS}


async def _suggest_one(hass: HomeAssistant, cand: dict[str, Any]) -> dict[str, Any]:
    req = {"energy_entity": cand["entity_id"], "energy_is_power": cand["power_only"], "power_entity": None if cand["power_only"] else cand["power_entity"]}
    analysis = await async_analyze(hass, req)
    session_entity, session_states = None, None
    if pick_type(cand, analysis) == TYPE_CHARGER:
        # First entity whose states really mark a session; otherwise sessions come from the power.
        for option in analysis["session_candidates"][:SESSION_ENTITY_TRIES]:
            with_entity = await async_analyze(hass, {**req, "session_entity": option["entity_id"]})
            if session_states_ok(with_entity.get("session_suggested_states"), with_entity.get("session_states")):
                session_entity, session_states = option["entity_id"], with_entity["session_suggested_states"]
                break
    device = build_device(cand, analysis, session_entity, session_states)
    preview = await async_preview(hass, {**device, "days": ANALYZE_DAYS})
    summary = summarize(device, preview, ANALYZE_DAYS)
    checked, reason = assess(cand, analysis, device, summary)
    return {
        "device": device, "candidate": cand, "summary": summary, "checked": checked, "reason": reason,
        "in_energy_prefs": cand["in_energy_prefs"], "area": cand["area"],
    }

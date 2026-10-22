"""Replay recorder history through the trackers ("Recalculate"). Pure module.

States are duck-typed (`.state`, `.last_changed`), so tests can use simple stand-ins.
"""

from __future__ import annotations

from bisect import bisect_right
from datetime import datetime, timedelta, timezone
from typing import Any

from .aggregate import Aggregator
from .const import HOUSE_KEY, HOUSE_TICK_S, SESSION_FROM_ENTITY, SESSION_FROM_POWER, TYPE_CONTINUOUS
from .engine import to_kwh, to_watt
from .tracker import DeviceTracker, HouseTracker

INVALID = ("unavailable", "unknown", "", None)


def point(st: Any) -> tuple[datetime, str | None]:
    """(time, state) from a State, a minimal-response dict or a compressed-format dict."""
    if isinstance(st, dict):
        if "s" in st:
            ts = st.get("lc", st.get("lu"))
            return datetime.fromtimestamp(float(ts), tz=timezone.utc), st["s"]
        t = st.get("last_changed")
        return (t if isinstance(t, datetime) else datetime.fromisoformat(str(t))), st.get("state")
    return st.last_changed, st.state


def numeric_series(states: list[Any], kind: str = "energy", unit: str | None = None) -> list[tuple[datetime, float]]:
    """(time, value) for valid numeric states; energy in kWh, power in W."""
    out: list[tuple[datetime, float]] = []
    for st in states:
        t, raw = point(st)
        if raw in INVALID:
            continue
        try:
            val = float(raw)  # type: ignore[arg-type]
        except ValueError:
            continue
        val = to_kwh(val, unit) if kind == "energy" else to_watt(val, unit)
        if out and t <= out[-1][0]:
            t = out[-1][0] + timedelta(microseconds=1)
        out.append((t, val))
    return out


def sum_counters(series: list[list[tuple[datetime, float]]]) -> list[tuple[datetime, float]]:
    """Several kWh counters as one (normal and low tariff, two inverters).

    One counter is returned as is. For more, the sum is built from each counter's own steps, so a
    reset of one counter (a drop) adds its new value instead of making the total drop (docs/02 §2).
    The total starts once every counter has a value.
    """
    series = [s for s in series if s]
    if len(series) <= 1:
        return list(series[0]) if series else []
    events = sorted((t, i, v) for i, s in enumerate(series) for t, v in s)
    last: dict[int, float] = {}
    total = 0.0
    out: list[tuple[datetime, float]] = []
    for t, i, v in events:
        prev = last.get(i)
        if prev is not None:
            total += v - prev if v >= prev else v
        else:
            total += v
        last[i] = v
        if len(last) == len(series):
            if out and t <= out[-1][0]:
                out[-1] = (out[-1][0], total)
            else:
                out.append((t, total))
    return out


def count_invalid(states: list[Any]) -> int:
    count = 0
    prev_invalid = False
    for st in states:
        invalid = point(st)[1] in ("unavailable", "unknown")
        if invalid and not prev_invalid:
            count += 1
        prev_invalid = invalid
    return count


class StepLookup:
    """Value of a step function (last known value at or before t)."""

    def __init__(self, series: list[tuple[datetime, float]]) -> None:
        self.times = [t for t, _ in series]
        self.values = [v for _, v in series]

    def at(self, t: datetime) -> float | None:
        idx = bisect_right(self.times, t) - 1
        return self.values[idx] if idx >= 0 else None


def text_series(states: list[Any]) -> list[tuple[datetime, str]]:
    return [(t, str(v)) for t, v in map(point, states)]


def self_use_series(
    solar: list[tuple[datetime, float]],
    export: list[tuple[datetime, float]],
    charge: list[tuple[datetime, float]] | None = None,
    discharge: list[tuple[datetime, float]] | None = None,
) -> list[tuple[datetime, float]]:
    """Cumulative own power used in the house: solar production minus export (export 0 when there
    is no export counter), plus battery discharge minus battery charge when a battery is known.

    The value can go down (a battery charging from the grid); only differences are used.
    """
    battery = bool(charge) and bool(discharge)
    if not solar and not battery:
        return []
    sol, exp = StepLookup(solar), StepLookup(export)
    chg, dis = StepLookup(charge or []), StepLookup(discharge or [])
    firsts = ([solar[0][0]] if solar else []) + ([charge[0][0], discharge[0][0]] if battery else [])  # type: ignore[index]
    begin = max(firsts)
    times = sorted(
        {t for s in (solar, export, charge or [], discharge or []) for t, _ in s if t >= begin} | {begin}
    )
    out = []
    for t in times:
        value = 0.0
        if solar:
            value += sol.at(t) - (exp.at(t) or 0.0)  # type: ignore[operator]
        if battery:
            value += dis.at(t) - chg.at(t)  # type: ignore[operator]
        out.append((t, value))
    return out


def replay_device(dev, states, imp_series, prices, start, end, tz, energy_unit, power_unit, solar_series=None):
    """Feed history to a fresh tracker in time order (runs in the executor)."""
    tracker = DeviceTracker(dev)
    agg = Aggregator()
    imp = StepLookup(imp_series)
    sol = StepLookup(solar_series or [])
    events: list[tuple[datetime, int, str, Any]] = []
    if dev.get("energy_is_power"):
        for t, w in numeric_series(states.get(dev["energy_entity"], []), "power", energy_unit):
            events.append((t, 1, "power", w))
    else:
        energy = numeric_series(states.get(dev["energy_entity"], []), "energy", energy_unit)
        for t, v in energy:
            events.append((t, 2, "energy", v))
        if dev.get("power_entity") and dev.get("session_source") == SESSION_FROM_POWER and dev.get("type") != TYPE_CONTINUOUS:
            for t, w in numeric_series(states.get(dev["power_entity"], []), "power", power_unit):
                events.append((t, 1, "power", w))
    if dev.get("session_source") == SESSION_FROM_ENTITY and dev.get("session_entity") and dev.get("type") != TYPE_CONTINUOUS:
        for t, s in text_series(states.get(dev["session_entity"], [])):
            events.append((t, 0, "session", s))
    counter = StepLookup(numeric_series(states.get(dev["energy_entity"], []), "energy", energy_unit)) if not dev.get("energy_is_power") else None
    t = start.replace(second=0, microsecond=0)
    while t < end:
        t += timedelta(seconds=HOUSE_TICK_S)
        events.append((t, 3, "tick", None))
    events.sort(key=lambda e: (e[0], e[1]))
    for t, _, kind, value in events:
        if kind == "energy":
            out = tracker.on_counter(t, value, imp.at(t), prices, sol.at(t))
        elif kind == "power":
            out = tracker.on_power(t, value, imp.at(t), prices, sol.at(t))
        elif kind == "session":
            out = tracker.on_session_state(t, value)
        else:
            out = tracker.tick(t, counter.at(t) if counter else None, imp.at(t), prices, sol.at(t))
        for step in out.steps:
            agg.add_step(dev["id"], step, tz)
        for sess in out.sessions:
            agg.add_session(sess)
    return tracker, agg


def replay_house(series, prices, start, end, tz):
    """`series`: import, export, solar, and optionally battery charge and discharge."""
    house = HouseTracker()
    agg = Aggregator()
    series = list(series) + [[]] * (5 - len(series))
    lookups = [StepLookup(s) for s in series]
    has = [bool(s) for s in series]
    t = start.replace(second=0, microsecond=0)
    while t < end:
        t += timedelta(seconds=HOUSE_TICK_S)
        vals = [lk.at(t) if h else None for lk, h in zip(lookups, has)]
        step = house.tick(t, vals[0], vals[1], vals[2], prices, vals[3], vals[4])
        if step is not None:
            agg.add_step(HOUSE_KEY, step, tz, log=False)
            agg.add_export(step.t0, step.t1, house.exported, prices, tz)
    return house, agg

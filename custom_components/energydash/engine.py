"""Pure calculation core (docs/02): counter steps, solar/grid split and cost per step.

No Home Assistant imports, so this module is unit-testable on its own.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Protocol

from .const import (
    F_ALL_NET,
    F_KWH,
    F_NET_COST,
    F_ZON,
    F_ZON_EXPORT,
    N_FIELDS,
    SOLAR_MODE_EXPORT,
    SOLAR_MODE_FREE,
    SOLAR_MODE_GRID,
)

QUARTER = timedelta(minutes=15)


class Prices(Protocol):
    def price(self, t0: datetime, t1: datetime) -> float | None: ...

    def export_price(self, t0: datetime, t1: datetime) -> float: ...


UNIT_FACTORS = {"wh": 0.001, "kwh": 1.0, "mwh": 1000.0, "gwh": 1_000_000.0}


def to_kwh(value: float, unit: str | None) -> float:
    """Convert an energy reading to kWh (unknown units are assumed kWh)."""
    return value * UNIT_FACTORS.get((unit or "kwh").lower(), 1.0)


def to_watt(value: float, unit: str | None) -> float:
    unit = (unit or "w").lower()
    if unit == "kw":
        return value * 1000.0
    if unit == "mw":
        return value * 1_000_000.0
    return value


def counter_delta(previous: float | None, new: float) -> tuple[float, bool]:
    """Energy of one counter step. A drop means a new counter: count the new value (rule 2).

    Returns (delta_kwh, was_reset).
    """
    if previous is None:
        return 0.0, False
    if new >= previous:
        return new - previous, False
    return max(new, 0.0), True


def split_net(de: float, d_import: float | None, d_solar: float | None = None) -> tuple[float, float]:
    """Rule 3: net = min(dE, max(dImport, 0)), zon = dE - net.

    Without a P1 reading the whole step counts as grid power (conservative, never phantom solar).
    With a known solar self-use (production minus export) over the same interval, zon can never
    exceed it: whatever the P1 and the panels together cannot explain counts as grid power.
    """
    if de <= 0:
        return 0.0, 0.0
    if d_import is None:
        return de, 0.0
    net = min(de, max(d_import, 0.0))
    zon = de - net
    if d_solar is not None:
        zon = min(zon, max(d_solar, 0.0))
    return de - zon, zon


def quarter_bounds(t0: datetime, t1: datetime) -> list[tuple[datetime, datetime]]:
    """Split [t0, t1] at quarter-hour boundaries (UTC quarters equal local quarters)."""
    if t1 <= t0:
        return [(t0, t1)]
    out = []
    cursor = t0
    while cursor < t1:
        minute = (cursor.minute // 15) * 15
        q_start = cursor.replace(minute=minute, second=0, microsecond=0)
        nxt = min(q_start + QUARTER, t1)
        out.append((cursor, nxt))
        cursor = nxt
    return out


@dataclass
class Segment:
    """Part of a step inside one quarter hour."""

    start: datetime
    end: datetime
    kwh: float
    zon: float
    price: float
    export_price: float

    @property
    def fields(self) -> list[float]:
        vals = [0.0] * N_FIELDS
        vals[F_KWH] = self.kwh
        vals[F_ZON] = self.zon
        vals[F_NET_COST] = (self.kwh - self.zon) * self.price
        vals[F_ALL_NET] = self.kwh * self.price
        vals[F_ZON_EXPORT] = self.zon * self.export_price
        return vals


@dataclass
class Step:
    t0: datetime
    t1: datetime
    de: float
    d_import: float | None
    net: float
    zon: float
    price: float
    segments: list[Segment] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    @property
    def fields(self) -> list[float]:
        total = [0.0] * N_FIELDS
        for seg in self.segments:
            for i, v in enumerate(seg.fields):
                total[i] += v
        return total

    def as_log(self) -> dict:
        f = self.fields
        return {
            "t0": self.t0.isoformat(),
            "t1": self.t1.isoformat(),
            "kwh": round(self.de, 5),
            "import": None if self.d_import is None else round(self.d_import, 5),
            "net": round(self.net, 5),
            "zon": round(self.zon, 5),
            "price": round(self.price, 5),
            "net_cost": round(f[F_NET_COST], 5),
            "notes": self.notes,
        }


def build_step(
    t0: datetime,
    t1: datetime,
    de: float,
    d_import: float | None,
    prices: Prices,
    notes: list[str] | None = None,
    d_solar: float | None = None,
) -> Step:
    """Turn one counter step into a priced step, split per quarter hour.

    The net/zon split is made for the whole step (same interval for both counters) and then
    distributed over the quarters in proportion to time. Because min(a*f, b*f) = f*min(a, b),
    the per-quarter totals add up exactly to the whole-step split.
    """
    notes = list(notes or [])
    net, zon = split_net(de, d_import, d_solar)
    if d_import is None and de > 0:
        notes.append("no_p1")
    elif d_solar is not None and de > 0 and zon < split_net(de, d_import)[1] - 1e-9:
        notes.append("solar_capped")
    span = (t1 - t0).total_seconds()
    segments: list[Segment] = []
    weighted_price = 0.0
    missing_price = False
    for a, b in quarter_bounds(t0, t1):
        frac = ((b - a).total_seconds() / span) if span > 0 else 1.0
        p = prices.price(a, b) if span > 0 else prices.price(t0, t0)
        if p is None:
            p = 0.0
            missing_price = True
        ep = prices.export_price(a, b) if span > 0 else prices.export_price(t0, t0)
        segments.append(Segment(a, b, de * frac, zon * frac, p, ep))
        weighted_price += p * frac
    if missing_price and de > 0:
        notes.append("no_price")
    return Step(t0, t1, de, d_import, net, zon, weighted_price, segments, notes)


def cost_of(fields: list[float], solar_mode: str) -> float:
    """Total cost for stored fields under the chosen solar valuation (rule 5)."""
    net_cost = fields[F_NET_COST]
    if solar_mode == SOLAR_MODE_FREE:
        return net_cost
    if solar_mode == SOLAR_MODE_GRID:
        return fields[F_ALL_NET]
    return net_cost + fields[F_ZON_EXPORT]


def zon_cost_of(fields: list[float], solar_mode: str) -> float:
    if solar_mode == SOLAR_MODE_FREE:
        return 0.0
    if solar_mode == SOLAR_MODE_GRID:
        return fields[F_ALL_NET] - fields[F_NET_COST]
    return fields[F_ZON_EXPORT]


def add_fields(target: list[float], source: list[float], factor: float = 1.0) -> list[float]:
    for i in range(N_FIELDS):
        target[i] += source[i] * factor
    return target


__all__ = [
    "SOLAR_MODE_EXPORT",
    "Segment",
    "Step",
    "add_fields",
    "build_step",
    "cost_of",
    "counter_delta",
    "quarter_bounds",
    "split_net",
    "to_kwh",
    "to_watt",
    "zon_cost_of",
]

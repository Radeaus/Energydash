"""History older than the recorder window, from Home Assistant's long-term statistics. Pure module.

The recorder keeps states for ~10 days; long-term statistics keep an hourly total per counter for
good. Each hour becomes one step with the same rules as a live step (docs/02), only coarser:
- energy per hour = the statistic's `change` (resets are already handled by Home Assistant);
- the solar/grid split is made per hour. Because min(sum a, sum b) >= sum min(a, b), an hourly
  split never shows more solar than a finer one would (no phantom solar);
- price = the hourly mean of the price entity, or the hourly cost / import of the Energy
  dashboard's cost sensor when the price entity has no statistics.
Sessions cannot be recovered from hourly totals; only costs per hour, day and month.
"""

from __future__ import annotations

from datetime import datetime, timedelta, tzinfo

from .aggregate import Aggregator
from .const import HOUSE_KEY, MAX_PLAUSIBLE_W
from .engine import Prices, build_step

HOUR = timedelta(hours=1)
Hourly = dict[datetime, float]  # hour start (UTC) -> value


def sum_hourly(parts: list[Hourly]) -> Hourly:
    """Hourly changes of several counters added up; an hour missing in one counter counts as 0."""
    out: Hourly = {}
    for part in parts:
        for h, v in part.items():
            out[h] = out.get(h, 0.0) + v
    return out


def self_use_hourly(
    solar: Hourly | None, export: Hourly | None, charge: Hourly | None = None, discharge: Hourly | None = None
) -> Hourly:
    """Own power used in the house per hour: production minus export (no export counter: production),
    plus battery discharge minus battery charge. With solar, only hours with solar data count."""
    out: Hourly = {}
    if solar:
        out = dict(solar) if export is None else {h: v - export[h] for h, v in solar.items() if h in export}
    if charge is not None and discharge is not None:
        hours = set(out) if solar else set(charge) | set(discharge)
        for h in hours:
            out[h] = out.get(h, 0.0) + discharge.get(h, 0.0) - charge.get(h, 0.0)
    return out


def prices_from_cost(cost: Hourly, imp: Hourly) -> Hourly:
    """Hourly price from the Energy dashboard's cost sensor: cost / import of that hour."""
    return {h: c / imp[h] for h, c in cost.items() if imp.get(h, 0.0) > 0.01}


def backfill_device(
    agg: Aggregator,
    series: str,
    energy: Hourly,
    imp: Hourly,
    solar_use: Hourly | None,
    prices: Prices,
    tz: tzinfo,
    before: datetime,
) -> int:
    """Add hourly steps before `before` to `agg`. Returns the number of hours added."""
    added = 0
    for hour in sorted(energy):
        if hour + HOUR > before:
            continue
        de = energy[hour]
        if de <= 0:
            continue
        if de * 1000 > MAX_PLAUSIBLE_W:
            continue  # more than a home connection delivers in an hour: charged elsewhere
        d_solar = solar_use.get(hour) if solar_use is not None else None
        step = build_step(hour, hour + HOUR, de, imp.get(hour), prices, ["hourly"], d_solar)
        agg.add_step(series, step, tz, log=False)
        added += 1
    return added


def backfill_house(
    agg: Aggregator,
    imp: Hourly,
    solar_use: Hourly | None,
    prices: Prices,
    tz: tzinfo,
    before: datetime,
    export: Hourly | None = None,
) -> int:
    """Whole house per hour: import plus solar used in the house (as HouseTracker), and the export."""
    added = 0
    for hour, kwh in (export or {}).items():
        if hour + HOUR <= before:
            agg.add_export(hour, hour + HOUR, kwh, prices, tz)
    for hour in sorted(imp):
        if hour + HOUR > before:
            continue
        d_imp = max(imp[hour], 0.0)
        # Own power can be negative with a battery that charges from the grid.
        house = max(d_imp + solar_use.get(hour, 0.0), 0.0) if solar_use is not None else d_imp
        if house <= 0:
            continue
        agg.add_step(HOUSE_KEY, build_step(hour, hour + HOUR, house, d_imp, prices), tz, log=False)
        added += 1
    return added

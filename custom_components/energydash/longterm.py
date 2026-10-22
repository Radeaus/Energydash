"""What Energydash hands to the rest of Home Assistant: the session event and long-term statistics.

Pure module: builds the event payload and the hourly statistic rows; the coordinator sends them.
"""

from __future__ import annotations

from datetime import datetime, tzinfo
from typing import Any

from .aggregate import _zero, rest_fields
from .const import F_ALL_NET, F_KWH, F_NET_COST, F_ZON, HOUSE_KEY, REST_KEY
from .engine import add_fields, cost_of
from .price import parse_time


def session_event_data(sess: dict[str, Any], name: str, solar_mode: str) -> dict[str, Any]:
    """Payload of `energydash_session_ended`, with the same meaning as the Last session sensor."""
    f = sess["fields"]
    kwh = f[F_KWH]
    cost = cost_of(f, solar_mode)
    start, end = parse_time(sess["start"]), parse_time(sess.get("end"))
    return {
        "device_id": sess["device_id"],
        "device_name": name,
        "session_id": sess["id"],
        "start": sess["start"],
        "end": sess.get("end"),
        "duration_min": round((end - start).total_seconds() / 60, 1) if start and end else None,
        "kwh": round(kwh, 3),
        "solar_kwh": round(f[F_ZON], 3),
        "grid_kwh": round(kwh - f[F_ZON], 3),
        "cost": round(cost, 4),
        "grid_cost": round(f[F_NET_COST], 4),
        "cost_all_grid": round(f[F_ALL_NET], 4),
        "price_per_kwh": round(cost / kwh, 4) if kwh > 0.0005 else None,
    }


def hourly_fields(hours: dict[str, dict[str, list[float]]], device_ids: list[str]) -> dict[str, dict[str, list[float]]]:
    """Fields per hour for each device, the whole house, and the rest of the house.

    Follows `Aggregator.summary`: hours without a house step count the devices as the whole house.
    """
    out: dict[str, dict[str, list[float]]] = {sid: dict(hours.get(sid, {})) for sid in device_ids}
    house_hours = hours.get(HOUSE_KEY, {})
    if not house_hours:
        return out
    whole: dict[str, list[float]] = {}
    rest: dict[str, list[float]] = {}
    for key in set(house_hours).union(*(out[sid] for sid in device_ids)):
        dev_sum = _zero()
        for sid in device_ids:
            vals = out[sid].get(key)
            if vals:
                add_fields(dev_sum, vals)
        house = house_hours.get(key, _zero())
        rest[key] = rest_fields(house, dev_sum)
        whole[key] = house if house[F_KWH] >= dev_sum[F_KWH] else dev_sum
    out[HOUSE_KEY] = whole
    out[REST_KEY] = rest
    return out


def statistic_rows(
    buckets: dict[str, list[float]], solar_mode: str, tz: tzinfo, since_key: str | None = None, until_key: str | None = None
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """(cost rows, energy rows) with a running sum from the first hour, for hours in [since_key, until_key).

    The sum always starts at the first stored hour, so a partial update continues the full series.
    """
    cost_rows: list[dict[str, Any]] = []
    kwh_rows: list[dict[str, Any]] = []
    cost_sum = kwh_sum = 0.0
    for key in sorted(buckets):
        if until_key is not None and key >= until_key:
            break
        vals = buckets[key]
        cost = cost_of(vals, solar_mode)
        kwh = vals[F_KWH]
        cost_sum += cost
        kwh_sum += kwh
        if since_key is not None and key < since_key:
            continue
        start = hour_start(key, tz)
        cost_rows.append({"start": start, "state": round(cost, 4), "sum": round(cost_sum, 4)})
        kwh_rows.append({"start": start, "state": round(kwh, 4), "sum": round(kwh_sum, 4)})
    return cost_rows, kwh_rows


def hour_start(key: str, tz: tzinfo) -> datetime:
    """Start of a local-hour bucket key (`2026-10-22T14`) as an aware datetime."""
    return datetime.strptime(key, "%Y-%m-%dT%H").replace(tzinfo=tz)

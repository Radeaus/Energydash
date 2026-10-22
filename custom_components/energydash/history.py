"""Recorder history helpers."""

from __future__ import annotations

from datetime import datetime, timedelta
from functools import partial
from typing import Any

from homeassistant.components.recorder import get_instance, history
from homeassistant.core import HomeAssistant

from .replay import INVALID, StepLookup, count_invalid, numeric_series, text_series  # noqa: F401  (re-exported)


async def async_get_states(
    hass: HomeAssistant,
    entity_ids: list[str],
    start: datetime,
    end: datetime,
    attributes: bool = False,
) -> dict[str, list[Any]]:
    entity_ids = [e for e in dict.fromkeys(entity_ids) if e]
    if not entity_ids:
        return {}
    recorder = get_instance(hass)
    await recorder.async_db_ready  # right after a restart the database may still be starting
    result = await recorder.async_add_executor_job(
        partial(
            history.get_significant_states,
            hass,
            start,
            end,
            entity_ids,
            None,
            include_start_time_state=True,
            significant_changes_only=False,
            # Compact rows ({"s": state, "lu": timestamp}) unless attributes (price forecast) are needed:
            # a P1 counter can have hundreds of thousands of states in the recorder window.
            minimal_response=not attributes,
            no_attributes=not attributes,
            compressed_state_format=not attributes,
        )
    )
    return {k: list(v) for k, v in result.items()}


def keep_days(hass: HomeAssistant) -> int:
    try:
        return int(get_instance(hass).keep_days)
    except Exception:  # noqa: BLE001
        return 10


def unit_of(hass: HomeAssistant, entity_id: str | None) -> str | None:
    if not entity_id:
        return None
    st = hass.states.get(entity_id)
    return st.attributes.get("unit_of_measurement") if st else None


def median_interval(times: list[datetime]) -> float | None:
    if len(times) < 3:
        return None
    gaps = sorted((b - a).total_seconds() for a, b in zip(times, times[1:]) if (b - a).total_seconds() < 3600)
    if not gaps:
        return None
    return gaps[len(gaps) // 2]


def downsample(series: list[tuple[datetime, float]], start: datetime, end: datetime, points: int = 600) -> list[list[Any]]:
    """Max per bucket (peaks stay visible) for charts."""
    if not series:
        return []
    span = (end - start).total_seconds() / points
    buckets: dict[int, float] = {}
    lookup = StepLookup(series)
    for i in range(points):
        t = start + timedelta(seconds=span * i)
        val = lookup.at(t)
        if val is not None:
            buckets[i] = val
    for t, v in series:
        if start <= t < end:
            idx = int((t - start).total_seconds() // span)
            buckets[idx] = max(buckets.get(idx, v), v)
    return [[(start + timedelta(seconds=span * i)).isoformat(), round(v, 1)] for i, v in sorted(buckets.items())]

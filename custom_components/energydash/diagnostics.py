"""Diagnostics download (Instellingen > Apparaten en diensten > Energydash > Diagnostiek downloaden)."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import HOUSE_KEY, VERSION
from .coordinator import EnergydashCoordinator


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    coord: EnergydashCoordinator = entry.runtime_data
    hours = coord.agg.hours
    return {
        "version": VERSION,
        "settings": coord.settings,
        "devices": coord.devices,
        "archived": coord.config.get("archived"),
        "status": coord.status(),
        "trackers": {k: v.to_dict() for k, v in coord.trackers.items()},
        "house": coord.house.to_dict(),
        "series": {k: {"hours": len(v), "first": min(v) if v else None, "last": max(v) if v else None} for k, v in hours.items()},
        "house_last_24h": dict(sorted(hours.get(HOUSE_KEY, {}).items())[-24:]),
        "sessions_count": len(coord.agg.sessions),
        "last_sessions": coord.agg.sessions[-10:],
        "steplog": {k: v[-50:] for k, v in coord.agg.steplog.items()},
    }

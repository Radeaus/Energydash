"""Websocket API for the panel (docs/05). Reading is open to all users, changing needs admin."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import (
    CONF_CONTRACT,
    CONF_EXPORT_ENTITY,
    CONF_EXPORT_PRICE_ENTITY,
    CONF_EXPORT_PRICE_FIXED,
    CONF_IMPORT_ENTITY,
    CONF_PRICE_ENTITY,
    CONF_PRICE_LOW,
    CONF_PRICE_NORMAL,
    CONF_SOLAR_ENTITY,
    CONF_SOLAR_MODE,
    CONTRACT_DYNAMIC,
    CONTRACT_FIXED,
    DOMAIN,
    SOLAR_MODES,
    VERSION,
)
from .coordinator import EnergydashCoordinator
from .discovery import async_analyze, async_discover, async_preview

SETTINGS_KEYS = (
    CONF_CONTRACT, CONF_PRICE_ENTITY, CONF_PRICE_NORMAL, CONF_PRICE_LOW, CONF_IMPORT_ENTITY, CONF_EXPORT_ENTITY,
    CONF_SOLAR_ENTITY, CONF_SOLAR_MODE, CONF_EXPORT_PRICE_ENTITY, CONF_EXPORT_PRICE_FIXED,
)


def _coord(hass: HomeAssistant) -> EnergydashCoordinator | None:
    return hass.data.get(DOMAIN, {}).get("coordinator")


def _guard(hass: HomeAssistant, connection, msg) -> EnergydashCoordinator | None:
    coord = _coord(hass)
    if coord is None:
        connection.send_error(msg["id"], "not_loaded", "Energydash is not set up")
    return coord


@callback
def async_register(hass: HomeAssistant) -> None:
    for handler in (
        ws_config, ws_settings_save, ws_discover, ws_analyze, ws_preview, ws_devices_save, ws_devices_delete,
        ws_recalculate, ws_sessions, ws_summary, ws_baseload, ws_steps, ws_subscribe, ws_reset, ws_export, ws_import,
    ):
        websocket_api.async_register_command(hass, handler)


@websocket_api.websocket_command({vol.Required("type"): "energydash/config"})
@callback
def ws_config(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    numbers = {d["id"]: coord.device_numbers(d["id"]) for d in coord.devices}
    open_sessions = {}
    for dev_id, tr in coord.trackers.items():
        view = tr.open_session_view()
        if view:
            open_sessions[dev_id] = view
    connection.send_result(msg["id"], {
        "version": VERSION,
        "is_admin": connection.user.is_admin,
        "settings": coord.settings,
        "devices": coord.devices,
        "archived": coord.config["archived"],
        "numbers": numbers,
        "open_sessions": open_sessions,
        "status": coord.status(),
        "currency": hass.config.currency,
        "time_zone": hass.config.time_zone,
    })


@websocket_api.websocket_command({
    vol.Required("type"): "energydash/settings/save",
    vol.Required("settings"): dict,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_settings_save(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    new = {k: v for k, v in msg["settings"].items() if k in SETTINGS_KEYS}
    if new.get(CONF_CONTRACT) not in (CONTRACT_DYNAMIC, CONTRACT_FIXED) or new.get(CONF_SOLAR_MODE) not in SOLAR_MODES:
        connection.send_error(msg["id"], "invalid", "Invalid contract or solar mode")
        return
    if not new.get(CONF_IMPORT_ENTITY):
        connection.send_error(msg["id"], "invalid", "Import entity is required")
        return
    hass.config_entries.async_update_entry(coord.entry, options={**coord.entry.options, **new})
    connection.send_result(msg["id"], {"settings": coord.settings})


@websocket_api.websocket_command({vol.Required("type"): "energydash/discover"})
@websocket_api.async_response
async def ws_discover(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    used = {d["energy_entity"] for d in coord.devices}
    connection.send_result(msg["id"], await async_discover(hass, coord.settings, used))


@websocket_api.websocket_command({
    vol.Required("type"): "energydash/analyze",
    vol.Required("energy_entity"): str,
    vol.Optional("energy_is_power"): bool,
    vol.Optional("power_entity"): vol.Any(str, None),
    vol.Optional("session_entity"): vol.Any(str, None),
})
@websocket_api.async_response
async def ws_analyze(hass, connection, msg):
    if _guard(hass, connection, msg) is None:
        return
    connection.send_result(msg["id"], await async_analyze(hass, msg))


@websocket_api.websocket_command({
    vol.Required("type"): "energydash/preview_sessions",
    vol.Required("energy_entity"): str,
    vol.Optional("energy_is_power"): bool,
    vol.Optional("power_entity"): vol.Any(str, None),
    vol.Optional("session_source"): str,
    vol.Optional("session_entity"): vol.Any(str, None),
    vol.Optional("session_states"): [str],
    vol.Optional("threshold_w"): vol.Coerce(float),
    vol.Optional("off_delay_min"): vol.Coerce(float),
    vol.Optional("min_duration_min"): vol.Coerce(float),
    vol.Optional("days"): int,
})
@websocket_api.async_response
async def ws_preview(hass, connection, msg):
    if _guard(hass, connection, msg) is None:
        return
    connection.send_result(msg["id"], await async_preview(hass, msg))


@websocket_api.websocket_command({
    vol.Required("type"): "energydash/devices/save",
    vol.Required("device"): dict,
    vol.Optional("recalculate", default=True): bool,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_devices_save(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    try:
        dev = await coord.async_save_device(msg["device"], msg["recalculate"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    connection.send_result(msg["id"], {"device": dev})


@websocket_api.websocket_command({
    vol.Required("type"): "energydash/devices/delete",
    vol.Required("device_id"): str,
    vol.Optional("keep_history", default=True): bool,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_devices_delete(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    await coord.async_delete_device(msg["device_id"], msg["keep_history"])
    connection.send_result(msg["id"], {})


@websocket_api.websocket_command({
    vol.Required("type"): "energydash/recalculate",
    vol.Optional("device_id"): str,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_recalculate(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    if msg.get("device_id"):
        coord.start_task(coord.async_recalculate([msg["device_id"]]), msg["device_id"])
    else:
        coord.start_task(coord.async_recalculate(None, include_house=True), "all")
    connection.send_result(msg["id"], {"started": True})


@websocket_api.websocket_command({
    vol.Required("type"): "energydash/sessions",
    vol.Optional("device_id"): str,
    vol.Optional("limit", default=200): int,
})
@callback
def ws_sessions(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    items = [s for s in coord.agg.sessions if not msg.get("device_id") or s["device_id"] == msg["device_id"]]
    connection.send_result(msg["id"], {"sessions": list(reversed(items))[: msg["limit"]], "solar_mode": coord.solar_mode})


@websocket_api.websocket_command({
    vol.Required("type"): "energydash/summary",
    vol.Required("period"): vol.In(["week", "month", "year"]),
    vol.Optional("offset", default=0): int,
})
@callback
def ws_summary(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    today = dt_util.now().date()
    if msg["period"] == "week":
        last = today - timedelta(days=7 * msg["offset"])
        first = last - timedelta(days=6)
        prev_first = first - timedelta(days=7)
    elif msg["period"] == "month":
        month = _add_months(today.replace(day=1), -msg["offset"])
        first = month
        nxt = _add_months(month, 1)
        last = min(nxt - timedelta(days=1), today)
        prev_first = _add_months(month, -1)
    else:
        first = date(today.year - msg["offset"], 1, 1)
        last = min(date(first.year, 12, 31), today)
        prev_first = date(first.year - 1, 1, 1)
    days = (last - first).days + 1
    by_month = msg["period"] == "year"
    result = coord.agg.summary(coord.devices, first, days, coord.solar_mode, by_month)
    prev = coord.agg.summary(coord.devices, prev_first, days, coord.solar_mode, by_month)
    result["previous_total"] = prev["totals"].get("_house", {}).get("cost")
    result["last_day"] = last.isoformat()
    result["period"] = msg["period"]
    connection.send_result(msg["id"], result)


def _add_months(d: date, n: int) -> date:
    month = d.month - 1 + n
    return date(d.year + month // 12, month % 12 + 1, 1)


@websocket_api.websocket_command({vol.Required("type"): "energydash/baseload"})
@callback
def ws_baseload(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    connection.send_result(msg["id"], coord.agg.baseload(coord.devices, dt_util.now().date(), coord.solar_mode))


@websocket_api.websocket_command({vol.Required("type"): "energydash/steps", vol.Required("device_id"): str})
@callback
def ws_steps(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    tr = coord.trackers.get(msg["device_id"])
    connection.send_result(msg["id"], {
        "steps": list(reversed(coord.agg.steplog.get(msg["device_id"], [])))[:100],
        "tracker": tr.to_dict() if tr else None,
    })


@websocket_api.websocket_command({vol.Required("type"): "energydash/subscribe"})
@callback
def ws_subscribe(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return

    @callback
    def forward(payload: dict[str, Any]) -> None:
        connection.send_message(websocket_api.event_message(msg["id"], payload))

    connection.subscriptions[msg["id"]] = coord.subscribe(forward)
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): "energydash/reset",
    vol.Required("scope"): vol.In(["data", "all"]),
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_reset(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    await coord.async_reset(msg["scope"])
    connection.send_result(msg["id"], {})


@websocket_api.websocket_command({vol.Required("type"): "energydash/export"})
@websocket_api.require_admin
@callback
def ws_export(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    connection.send_result(msg["id"], coord.export_config())


@websocket_api.websocket_command({
    vol.Required("type"): "energydash/import",
    vol.Required("data"): dict,
    vol.Optional("apply_settings", default=True): bool,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_import(hass, connection, msg):
    coord = _guard(hass, connection, msg)
    if coord is None:
        return
    try:
        count = await coord.async_import_config(msg["data"], msg["apply_settings"])
    except (ValueError, KeyError, TypeError) as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    connection.send_result(msg["id"], {"devices": count})

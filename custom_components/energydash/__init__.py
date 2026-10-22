"""Energydash: what electricity really costs, per device."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

import voluptuous as vol

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv

from . import websocket
from .const import DOMAIN, PANEL_COMPONENT, PANEL_ICON, PANEL_TITLE, PANEL_URL_PATH, STATIC_URL, VERSION
from .coordinator import EnergydashCoordinator
from .storage import EnergydashStorage

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
PANEL_FILE = Path(__file__).parent / "frontend" / "energydash-panel.js"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    hass.data.setdefault(DOMAIN, {})
    websocket.async_register(hass)

    def _coord() -> EnergydashCoordinator:
        coord = hass.data.get(DOMAIN, {}).get("coordinator")
        if coord is None:
            raise ServiceValidationError("Energydash is not set up", translation_domain=DOMAIN, translation_key="not_loaded")
        return coord

    async def recalculate(call: ServiceCall) -> None:
        coord = _coord()
        device_id = call.data.get("device_id")
        await coord.async_recalculate([device_id] if device_id else None, include_house=not device_id)

    async def reset(call: ServiceCall) -> None:
        await _coord().async_reset(call.data["scope"])

    hass.services.async_register(DOMAIN, "recalculate", recalculate, schema=vol.Schema({vol.Optional("device_id"): cv.string}))
    hass.services.async_register(DOMAIN, "reset", reset, schema=vol.Schema({vol.Required("scope"): vol.In(["data", "all"])}))
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    storage = EnergydashStorage(hass)
    coord = EnergydashCoordinator(hass, entry, storage)
    await coord.async_start()
    hass.data.setdefault(DOMAIN, {})["coordinator"] = coord
    entry.runtime_data = coord

    await _async_register_panel(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    return True


async def _async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    coord: EnergydashCoordinator = entry.runtime_data
    await coord.async_settings_changed()


async def _async_register_panel(hass: HomeAssistant) -> None:
    data = hass.data[DOMAIN]
    if not data.get("static_registered"):
        await hass.http.async_register_static_paths([StaticPathConfig(STATIC_URL, str(PANEL_FILE.parent), False)])
        data["static_registered"] = True
    if data.get("panel_registered"):
        return
    digest = await hass.async_add_executor_job(lambda: hashlib.md5(PANEL_FILE.read_bytes()).hexdigest()[:8])  # noqa: S324
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_COMPONENT,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=f"{STATIC_URL}/energydash-panel.js?v={VERSION}-{digest}",
        require_admin=False,
        config={"version": VERSION},
    )
    data["panel_registered"] = True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        coord: EnergydashCoordinator = entry.runtime_data
        await coord.async_stop()
        data = hass.data.get(DOMAIN, {})
        data.pop("coordinator", None)
        if data.pop("panel_registered", False):
            frontend.async_remove_panel(hass, PANEL_URL_PATH)
    return unloaded


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Removing the integration removes all its stored data: a re-install starts clean."""
    await EnergydashStorage(hass).async_remove()
    _LOGGER.info("Energydash data removed")

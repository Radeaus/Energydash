"""Config flow (installation) and reconfigure ("Opnieuw instellen").

Prices and meters are chosen in the panel's quick start and settings (docs/04), not here: the
installation only takes the Energy dashboard's meters as a starting point.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.helpers import selector

from .const import (
    CONF_CONTRACT,
    CONF_EXPORT_ENTITY,
    CONF_EXPORT_PRICE_ENTITY,
    CONF_EXPORT_PRICE_FIXED,
    CONF_EXPORT_PRICE_MODE,
    CONF_IMPORT_ENTITY,
    CONF_PRICE_ENTITY,
    CONF_PRICE_LOW,
    CONF_PRICE_MARKUP,
    CONF_PRICE_NORMAL,
    CONF_SOLAR_ENTITY,
    CONF_SOLAR_MODE,
    DOMAIN,
)
from .discovery import async_suggest_settings

CONF_RESET = "reset"
RESET_NONE = "none"
RESET_DATA = "data"
RESET_ALL = "all"


class EnergydashConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is None:
            return self.async_show_form(step_id="user", data_schema=vol.Schema({}))
        found = await async_suggest_settings(self.hass)
        return self.async_create_entry(title="Energydash", data={
            CONF_CONTRACT: None,
            CONF_IMPORT_ENTITY: found["import"],
            CONF_EXPORT_ENTITY: found["export"],
            CONF_SOLAR_ENTITY: found["solar"],
            CONF_SOLAR_MODE: None,
            CONF_PRICE_ENTITY: found["price_entity"],
            CONF_PRICE_MARKUP: None,
            CONF_PRICE_NORMAL: found["price_fixed"],
            CONF_PRICE_LOW: None,
            CONF_EXPORT_PRICE_MODE: None,
            CONF_EXPORT_PRICE_ENTITY: found["export_price_entity"],
            CONF_EXPORT_PRICE_FIXED: found["export_price_fixed"],
        })

    async def async_step_reconfigure(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        entry = self._get_reconfigure_entry()
        if user_input is not None:
            reset = user_input.get(CONF_RESET, RESET_NONE)
            coord = self.hass.data.get(DOMAIN, {}).get("coordinator")
            if coord is not None and reset in (RESET_DATA, RESET_ALL):
                await coord.async_reset(reset)
            return self.async_update_reload_and_abort(entry, data={**entry.data, **entry.options}, options={})
        return self.async_show_form(step_id="reconfigure", data_schema=vol.Schema({
            vol.Required(CONF_RESET, default=RESET_NONE): selector.SelectSelector(
                selector.SelectSelectorConfig(options=[RESET_NONE, RESET_DATA, RESET_ALL], translation_key="reset", mode=selector.SelectSelectorMode.LIST)
            ),
        }))

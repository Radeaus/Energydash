"""Config flow (installation), options flow ("Prijzen en zon") and reconfigure ("Opnieuw instellen")."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import selector

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
    SOLAR_MODE_EXPORT,
    SOLAR_MODES,
)
from .discovery import async_suggest_settings

CONF_RESET = "reset"
RESET_NONE = "none"
RESET_DATA = "data"
RESET_ALL = "all"

ENERGY_SENSOR = selector.EntitySelector(selector.EntitySelectorConfig(domain="sensor", device_class="energy"))
ANY_SENSOR = selector.EntitySelector(selector.EntitySelectorConfig(domain="sensor"))
PRICE = selector.NumberSelector(selector.NumberSelectorConfig(min=-2, max=5, step=0.0001, mode=selector.NumberSelectorMode.BOX, unit_of_measurement="€/kWh"))


def _base_schema(defaults: dict[str, Any], with_reset: bool = False) -> vol.Schema:
    def opt(key: str) -> dict[str, Any]:
        return {"suggested_value": defaults.get(key)} if defaults.get(key) is not None else {}

    fields: dict[Any, Any] = {
        vol.Required(CONF_CONTRACT, default=defaults.get(CONF_CONTRACT, CONTRACT_DYNAMIC)): selector.SelectSelector(
            selector.SelectSelectorConfig(options=[CONTRACT_DYNAMIC, CONTRACT_FIXED], translation_key="contract", mode=selector.SelectSelectorMode.LIST)
        ),
        vol.Required(CONF_IMPORT_ENTITY, description=opt(CONF_IMPORT_ENTITY)): ENERGY_SENSOR,
        vol.Required(CONF_SOLAR_MODE, default=defaults.get(CONF_SOLAR_MODE, SOLAR_MODE_EXPORT)): selector.SelectSelector(
            selector.SelectSelectorConfig(options=SOLAR_MODES, translation_key="solar_mode", mode=selector.SelectSelectorMode.LIST)
        ),
        vol.Optional(CONF_EXPORT_ENTITY, description=opt(CONF_EXPORT_ENTITY)): ENERGY_SENSOR,
        vol.Optional(CONF_SOLAR_ENTITY, description=opt(CONF_SOLAR_ENTITY)): ENERGY_SENSOR,
    }
    if with_reset:
        fields[vol.Required(CONF_RESET, default=RESET_NONE)] = selector.SelectSelector(
            selector.SelectSelectorConfig(options=[RESET_NONE, RESET_DATA, RESET_ALL], translation_key="reset", mode=selector.SelectSelectorMode.LIST)
        )
    return vol.Schema(fields)


def _price_schema(contract: str, defaults: dict[str, Any]) -> vol.Schema:
    def opt(key: str) -> dict[str, Any]:
        return {"suggested_value": defaults.get(key)} if defaults.get(key) is not None else {}

    if contract == CONTRACT_FIXED:
        return vol.Schema({
            vol.Required(CONF_PRICE_NORMAL, description=opt(CONF_PRICE_NORMAL)): PRICE,
            vol.Required(CONF_PRICE_LOW, description=opt(CONF_PRICE_LOW)): PRICE,
            vol.Optional(CONF_EXPORT_PRICE_FIXED, description=opt(CONF_EXPORT_PRICE_FIXED)): PRICE,
        })
    return vol.Schema({
        vol.Required(CONF_PRICE_ENTITY, description=opt(CONF_PRICE_ENTITY)): ANY_SENSOR,
        vol.Optional(CONF_EXPORT_PRICE_ENTITY, description=opt(CONF_EXPORT_PRICE_ENTITY)): ANY_SENSOR,
        vol.Optional(CONF_EXPORT_PRICE_FIXED, description=opt(CONF_EXPORT_PRICE_FIXED)): PRICE,
    })


def _validate_price(hass: HomeAssistant, data: dict[str, Any]) -> dict[str, str]:
    errors: dict[str, str] = {}
    if CONF_PRICE_ENTITY in data:
        st = hass.states.get(data[CONF_PRICE_ENTITY])
        try:
            float(st.state) if st else float("x")
        except ValueError:
            errors[CONF_PRICE_ENTITY] = "price_not_numeric"
    return errors


ALL_KEYS = (
    CONF_CONTRACT, CONF_IMPORT_ENTITY, CONF_SOLAR_MODE, CONF_EXPORT_ENTITY, CONF_SOLAR_ENTITY,
    CONF_PRICE_ENTITY, CONF_EXPORT_PRICE_ENTITY, CONF_EXPORT_PRICE_FIXED, CONF_PRICE_NORMAL, CONF_PRICE_LOW,
)


def _clean(data: dict[str, Any]) -> dict[str, Any]:
    """Every key present (cleared optional fields become None), other contract's keys emptied."""
    out = {key: data.get(key) for key in ALL_KEYS}
    if out[CONF_CONTRACT] == CONTRACT_FIXED:
        out[CONF_PRICE_ENTITY] = None
        out[CONF_EXPORT_PRICE_ENTITY] = None
    else:
        out[CONF_PRICE_NORMAL] = None
        out[CONF_PRICE_LOW] = None
    return out


class EnergydashConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}
        self._defaults: dict[str, Any] = {}

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return EnergydashOptionsFlow()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            self._data = dict(user_input)
            return await self.async_step_prices()
        found = await async_suggest_settings(self.hass)
        self._defaults = {
            CONF_IMPORT_ENTITY: found.get(CONF_IMPORT_ENTITY),
            CONF_EXPORT_ENTITY: found.get(CONF_EXPORT_ENTITY),
            CONF_SOLAR_ENTITY: found.get(CONF_SOLAR_ENTITY),
            CONF_PRICE_ENTITY: found.get("price"),
        }
        return self.async_show_form(step_id="user", data_schema=_base_schema(self._defaults))

    async def async_step_prices(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate_price(self.hass, user_input)
            if not errors:
                return self.async_create_entry(title="Energydash", data=_clean({**self._data, **user_input}))
        return self.async_show_form(
            step_id="prices", data_schema=_price_schema(self._data[CONF_CONTRACT], user_input or self._defaults), errors=errors
        )

    async def async_step_reconfigure(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        entry = self._get_reconfigure_entry()
        current = {**entry.data, **entry.options}
        if user_input is not None:
            self._data = dict(user_input)
            return await self.async_step_reconfigure_prices()
        return self.async_show_form(step_id="reconfigure", data_schema=_base_schema(current, with_reset=True))

    async def async_step_reconfigure_prices(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        entry = self._get_reconfigure_entry()
        current = {**entry.data, **entry.options}
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate_price(self.hass, user_input)
            if not errors:
                reset = self._data.pop(CONF_RESET, RESET_NONE)
                coord = self.hass.data.get(DOMAIN, {}).get("coordinator")
                if coord is not None and reset in (RESET_DATA, RESET_ALL):
                    await coord.async_reset(reset)
                return self.async_update_reload_and_abort(entry, data=_clean({**self._data, **user_input}), options={})
        return self.async_show_form(
            step_id="reconfigure_prices", data_schema=_price_schema(self._data[CONF_CONTRACT], user_input or current), errors=errors
        )


class EnergydashOptionsFlow(OptionsFlow):
    """'Prijzen en zon': the same fields as the installation, saved as options (no restart needed)."""

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        current = {**self.config_entry.data, **self.config_entry.options}
        if user_input is not None:
            self._data = dict(user_input)
            return await self.async_step_prices()
        return self.async_show_form(step_id="init", data_schema=_base_schema(current))

    async def async_step_prices(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        current = {**self.config_entry.data, **self.config_entry.options}
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate_price(self.hass, user_input)
            if not errors:
                return self.async_create_entry(data=_clean({**self._data, **user_input}))
        return self.async_show_form(
            step_id="prices", data_schema=_price_schema(self._data[CONF_CONTRACT], user_input or current), errors=errors
        )

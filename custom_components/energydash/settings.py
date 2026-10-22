"""Settings chosen in the panel: validation and the rules that read them (docs/05). Pure module."""

from __future__ import annotations

from typing import Any

from .const import (
    CONF_BATTERY_CHARGE_ENTITY,
    CONF_BATTERY_DISCHARGE_ENTITY,
    CONF_CONTRACT,
    CONF_EXPORT_ENTITY,
    CONF_EXPORT_PRICE_ENTITY,
    CONF_EXPORT_PRICE_FIXED,
    CONF_EXPORT_PRICE_MODE,
    CONF_IMPORT_ENTITY,
    CONF_LOW_END,
    CONF_LOW_START,
    CONF_LOW_WEEKEND,
    CONF_PRICE_ENTITY,
    CONF_PRICE_LOW,
    CONF_PRICE_MARKUP,
    CONF_PRICE_NORMAL,
    CONF_PRICE_VAT,
    CONF_SOLAR_ENTITY,
    CONF_SOLAR_MODE,
    CONTRACT_DYNAMIC,
    CONTRACT_FIXED,
    EXPORT_MODE_AUTO,
    EXPORT_MODE_ENTITY,
    EXPORT_MODE_FIXED,
    EXPORT_MODES,
    SOLAR_MODES,
)
from .price import LowHours, parse_clock

SETTINGS_KEYS = (
    CONF_CONTRACT, CONF_PRICE_ENTITY, CONF_PRICE_NORMAL, CONF_PRICE_LOW, CONF_PRICE_MARKUP, CONF_PRICE_VAT,
    CONF_LOW_START, CONF_LOW_END, CONF_LOW_WEEKEND, CONF_IMPORT_ENTITY, CONF_EXPORT_ENTITY, CONF_SOLAR_ENTITY,
    CONF_BATTERY_CHARGE_ENTITY, CONF_BATTERY_DISCHARGE_ENTITY, CONF_SOLAR_MODE, CONF_EXPORT_PRICE_MODE,
    CONF_EXPORT_PRICE_ENTITY, CONF_EXPORT_PRICE_FIXED,
)
METER_KEYS = (CONF_IMPORT_ENTITY, CONF_EXPORT_ENTITY, CONF_SOLAR_ENTITY, CONF_BATTERY_CHARGE_ENTITY, CONF_BATTERY_DISCHARGE_ENTITY)
BATTERY_KEYS = (CONF_BATTERY_CHARGE_ENTITY, CONF_BATTERY_DISCHARGE_ENTITY)


def entity_ids(value: Any) -> list[str]:
    """A meter setting is one entity id or a list (e.g. separate normal and low tariff counters)."""
    if isinstance(value, str):
        return [value] if value else []
    if isinstance(value, (list, tuple)):
        return list(dict.fromkeys(v for v in value if isinstance(v, str) and v))
    return []


def export_mode(settings: dict[str, Any]) -> str:
    """How the export price is found. Older settings have no mode: they keep the behaviour from before the mode existed."""
    mode = settings.get(CONF_EXPORT_PRICE_MODE)
    if mode in EXPORT_MODES:
        if settings.get(CONF_CONTRACT) == CONTRACT_FIXED and mode in (EXPORT_MODE_AUTO, EXPORT_MODE_ENTITY):
            return EXPORT_MODE_FIXED
        return mode
    if settings.get(CONF_CONTRACT) == CONTRACT_FIXED:
        return EXPORT_MODE_FIXED
    return EXPORT_MODE_ENTITY if settings.get(CONF_EXPORT_PRICE_ENTITY) else EXPORT_MODE_AUTO


def markup(settings: dict[str, Any]) -> float:
    """Amount per kWh added to the price entity (taxes and supplier fee); never for a fixed price."""
    if settings.get(CONF_CONTRACT) == CONTRACT_FIXED:
        return 0.0
    return _num(settings.get(CONF_PRICE_MARKUP)) or 0.0


def vat(settings: dict[str, Any]) -> float:
    """VAT over the price entity plus markup, as a fraction (21% is 0.21); never for a fixed price."""
    if settings.get(CONF_CONTRACT) == CONTRACT_FIXED:
        return 0.0
    return (_num(settings.get(CONF_PRICE_VAT)) or 0.0) / 100


def low_hours(settings: dict[str, Any]) -> LowHours:
    """When the low tariff of a fixed price applies; older settings keep 23:00-07:00 and weekends."""
    return LowHours.parse(settings.get(CONF_LOW_START), settings.get(CONF_LOW_END), settings.get(CONF_LOW_WEEKEND))


def has_battery(settings: dict[str, Any]) -> bool:
    return any(entity_ids(settings.get(key)) for key in BATTERY_KEYS)


def _num(value: Any) -> float | None:
    if value is None or isinstance(value, bool) or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def clean_settings(raw: dict[str, Any]) -> dict[str, Any]:
    """Validate settings from the panel; raises ValueError with a short code."""
    s = {k: raw.get(k) for k in SETTINGS_KEYS}
    if s[CONF_CONTRACT] not in (CONTRACT_DYNAMIC, CONTRACT_FIXED):
        raise ValueError("missing_contract")
    if s[CONF_SOLAR_MODE] not in SOLAR_MODES:
        raise ValueError("missing_solar_mode")
    for key in METER_KEYS:
        s[key] = entity_ids(s[key])
    if not s[CONF_IMPORT_ENTITY]:
        raise ValueError("missing_import")
    for key in (CONF_PRICE_NORMAL, CONF_PRICE_LOW, CONF_PRICE_MARKUP, CONF_PRICE_VAT, CONF_EXPORT_PRICE_FIXED):
        s[key] = _num(s[key])
    if s[CONF_CONTRACT] == CONTRACT_FIXED:
        if s[CONF_PRICE_NORMAL] is None:
            raise ValueError("missing_price")
        s[CONF_PRICE_ENTITY] = None
        s[CONF_PRICE_MARKUP] = None
        s[CONF_PRICE_VAT] = None
        if s[CONF_PRICE_LOW] is None:
            s[CONF_LOW_START] = s[CONF_LOW_END] = s[CONF_LOW_WEEKEND] = None
        else:
            for key in (CONF_LOW_START, CONF_LOW_END):
                if s[key] is not None and parse_clock(s[key]) is None:
                    raise ValueError("invalid_low_hours")
            s[CONF_LOW_WEEKEND] = None if s[CONF_LOW_WEEKEND] is None else bool(s[CONF_LOW_WEEKEND])
    else:
        if not s[CONF_PRICE_ENTITY]:
            raise ValueError("missing_price_entity")
        if s[CONF_PRICE_VAT] is not None and not 0 <= s[CONF_PRICE_VAT] <= 100:
            raise ValueError("invalid_vat")
        s[CONF_PRICE_NORMAL] = None
        s[CONF_PRICE_LOW] = None
        s[CONF_LOW_START] = s[CONF_LOW_END] = s[CONF_LOW_WEEKEND] = None
    mode = s[CONF_EXPORT_PRICE_MODE]
    if mode is not None and mode not in EXPORT_MODES:
        raise ValueError("invalid_export_mode")
    if s[CONF_CONTRACT] == CONTRACT_FIXED and mode in (EXPORT_MODE_AUTO, EXPORT_MODE_ENTITY):
        raise ValueError("invalid_export_mode")
    if mode == EXPORT_MODE_ENTITY and not s[CONF_EXPORT_PRICE_ENTITY]:
        raise ValueError("missing_export_price_entity")
    if mode == EXPORT_MODE_FIXED and s[CONF_EXPORT_PRICE_FIXED] is None:
        raise ValueError("missing_export_price")
    if mode != EXPORT_MODE_ENTITY:
        s[CONF_EXPORT_PRICE_ENTITY] = None
    if mode != EXPORT_MODE_FIXED:
        s[CONF_EXPORT_PRICE_FIXED] = None
    own = s[CONF_EXPORT_ENTITY] or s[CONF_SOLAR_ENTITY] or s[CONF_BATTERY_CHARGE_ENTITY] or s[CONF_BATTERY_DISCHARGE_ENTITY]
    if mode is None and s[CONF_SOLAR_MODE] == "export" and own:
        raise ValueError("missing_export_mode")
    if bool(s[CONF_BATTERY_CHARGE_ENTITY]) != bool(s[CONF_BATTERY_DISCHARGE_ENTITY]):
        raise ValueError("battery_needs_both")
    return s

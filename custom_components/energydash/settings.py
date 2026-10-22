"""Settings chosen in the panel: validation and the rules that read them (docs/05). Pure module."""

from __future__ import annotations

from typing import Any

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
    CONTRACT_DYNAMIC,
    CONTRACT_FIXED,
    EXPORT_MODE_AUTO,
    EXPORT_MODE_ENTITY,
    EXPORT_MODE_FIXED,
    EXPORT_MODES,
    SOLAR_MODES,
)

SETTINGS_KEYS = (
    CONF_CONTRACT, CONF_PRICE_ENTITY, CONF_PRICE_NORMAL, CONF_PRICE_LOW, CONF_PRICE_MARKUP, CONF_IMPORT_ENTITY,
    CONF_EXPORT_ENTITY, CONF_SOLAR_ENTITY, CONF_SOLAR_MODE, CONF_EXPORT_PRICE_MODE, CONF_EXPORT_PRICE_ENTITY,
    CONF_EXPORT_PRICE_FIXED,
)
METER_KEYS = (CONF_IMPORT_ENTITY, CONF_EXPORT_ENTITY, CONF_SOLAR_ENTITY)


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
    for key in (CONF_PRICE_NORMAL, CONF_PRICE_LOW, CONF_PRICE_MARKUP, CONF_EXPORT_PRICE_FIXED):
        s[key] = _num(s[key])
    if s[CONF_CONTRACT] == CONTRACT_FIXED:
        if s[CONF_PRICE_NORMAL] is None:
            raise ValueError("missing_price")
        s[CONF_PRICE_ENTITY] = None
        s[CONF_PRICE_MARKUP] = None
    else:
        if not s[CONF_PRICE_ENTITY]:
            raise ValueError("missing_price_entity")
        s[CONF_PRICE_NORMAL] = None
        s[CONF_PRICE_LOW] = None
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
    if mode is None and s[CONF_SOLAR_MODE] == "export" and (s[CONF_EXPORT_ENTITY] or s[CONF_SOLAR_ENTITY]):
        raise ValueError("missing_export_mode")
    return s

"""Logbook text for the session event.

Home Assistant has no translation key for logbook messages, so the text follows the language
of the Home Assistant installation (English, Dutch, German, Spanish, or French).
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.core import Event, HomeAssistant, callback

from .const import DOMAIN, EVENT_SESSION_ENDED

MESSAGES = {
    "en": ("session ended: {kwh} kWh", "session ended: {kwh} kWh, {cost} {currency}"),
    "nl": ("sessie beëindigd: {kwh} kWh", "sessie beëindigd: {kwh} kWh, {cost} {currency}"),
    "de": ("Sitzung beendet: {kwh} kWh", "Sitzung beendet: {kwh} kWh, {cost} {currency}"),
    "es": ("sesión finalizada: {kwh} kWh", "sesión finalizada: {kwh} kWh, {cost} {currency}"),
    "fr": ("session terminée : {kwh} kWh", "session terminée : {kwh} kWh, {cost} {currency}"),
}


def session_message(language: str | None, kwh: Any, cost: float | None, currency: str) -> str:
    plain, with_cost = MESSAGES.get((language or "en").split("-")[0].lower(), MESSAGES["en"])
    if cost is None:
        return plain.format(kwh=kwh)
    return with_cost.format(kwh=kwh, cost=f"{cost:.2f}", currency=currency)


@callback
def async_describe_events(hass: HomeAssistant, async_describe_event: Callable[[str, str, Callable], None]) -> None:
    @callback
    def describe(event: Event) -> dict[str, Any]:
        data = event.data
        message = session_message(hass.config.language, data.get("kwh"), data.get("cost"), hass.config.currency)
        return {"name": data.get("device_name", "Energydash"), "message": message}

    async_describe_event(DOMAIN, EVENT_SESSION_ENDED, describe)

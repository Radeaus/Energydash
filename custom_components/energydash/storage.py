"""Persistent storage via homeassistant.helpers.storage.Store.

Three files in .storage/:
- energydash.config:  devices (what the user set up)
- energydash.data:    recent results (35 days), tracker state and open sessions; written at most every
                      5 minutes and always at shutdown (Store flushes delayed saves on the final write)
- energydash.archive: older results; written about once a day
"""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY_ARCHIVE, STORAGE_KEY_CONFIG, STORAGE_KEY_DATA, STORAGE_VERSION

SAVE_DELAY_S = 300
ARCHIVE_DELAY_S = 10


class _VersionedStore(Store[dict[str, Any]]):
    async def _async_migrate_func(self, old_major_version: int, old_minor_version: int, old_data: dict[str, Any]) -> dict[str, Any]:
        # Version 1 is the first format. Future migrations go here.
        return old_data


class EnergydashStorage:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._due: dict[str, float] = {}
        self.config_store = _VersionedStore(hass, STORAGE_VERSION, STORAGE_KEY_CONFIG)
        self.data_store = _VersionedStore(hass, STORAGE_VERSION, STORAGE_KEY_DATA)
        self.archive_store = _VersionedStore(hass, STORAGE_VERSION, STORAGE_KEY_ARCHIVE)

    async def async_load(self) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
        config = await self.config_store.async_load() or {}
        data = await self.data_store.async_load() or {}
        archive = await self.archive_store.async_load() or {}
        config.setdefault("devices", [])
        config.setdefault("archived", [])
        return config, data, archive

    async def async_save_config(self, config: dict[str, Any]) -> None:
        await self.config_store.async_save(config)

    def _throttled(self, store: Store, data_func, delay: float) -> None:
        """Write at most once per `delay`, but surely within `delay`.

        Store.async_delay_save is a debounce: every call pushes the write further out, so with
        changes every minute it would only write at shutdown. Only schedule when nothing is pending;
        data_func is evaluated at write time, so the newest data is written anyway.
        """
        now = self.hass.loop.time()
        if self._due.get(store.key, 0.0) > now:
            return
        self._due[store.key] = now + delay
        store.async_delay_save(data_func, delay)

    def schedule_save_data(self, data_func) -> None:
        self._throttled(self.data_store, data_func, SAVE_DELAY_S)

    async def async_save_data(self, data: dict[str, Any]) -> None:
        await self.data_store.async_save(data)

    def schedule_save_archive(self, data_func) -> None:
        self._throttled(self.archive_store, data_func, ARCHIVE_DELAY_S)

    async def async_save_archive(self, data: dict[str, Any]) -> None:
        await self.archive_store.async_save(data)

    async def async_remove(self) -> None:
        await self.config_store.async_remove()
        await self.data_store.async_remove()
        await self.archive_store.async_remove()

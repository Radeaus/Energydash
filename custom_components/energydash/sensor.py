"""Sensors: cost today / this month per device, last session, house totals and baseload."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfPower
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import DOMAIN, HOUSE_KEY, REST_KEY, TYPE_CONTINUOUS, VERSION
from .coordinator import SIGNAL_DEVICES, SIGNAL_UPDATE, EnergydashCoordinator
from .engine import cost_of


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    coord: EnergydashCoordinator = entry.runtime_data
    known: set[str] = set()

    async_add_entities([
        HouseCostSensor(coord, entry, HOUSE_KEY, "today"),
        HouseCostSensor(coord, entry, REST_KEY, "today"),
        BaseloadSensor(coord, entry),
    ])

    @callback
    def sync_devices() -> None:
        ids = {d["id"] for d in coord.devices}
        new = []
        for dev in coord.devices:
            if dev["id"] in known:
                continue
            known.add(dev["id"])
            new += [DeviceCostSensor(coord, entry, dev, "today"), DeviceCostSensor(coord, entry, dev, "month")]
            if dev.get("type") != TYPE_CONTINUOUS:
                new.append(LastSessionSensor(coord, entry, dev))
        if new:
            async_add_entities(new)
        gone = known - ids
        if gone:
            ent_reg = er.async_get(hass)
            dev_reg = dr.async_get(hass)
            for dev_id in gone:
                known.discard(dev_id)
                for ent in er.async_entries_for_config_entry(ent_reg, entry.entry_id):
                    if ent.unique_id.startswith(f"{dev_id}__"):
                        ent_reg.async_remove(ent.entity_id)
                device = dev_reg.async_get_device(identifiers={(DOMAIN, dev_id)})
                if device:
                    dev_reg.async_remove_device(device.id)

    # Clean up entities of devices that were removed while HA was down.
    ent_reg = er.async_get(hass)
    current = {d["id"] for d in coord.devices} | {HOUSE_KEY, REST_KEY, "baseload"}
    for ent in er.async_entries_for_config_entry(ent_reg, entry.entry_id):
        if ent.unique_id.split("__")[0] not in current:
            ent_reg.async_remove(ent.entity_id)

    sync_devices()
    entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_DEVICES, sync_devices))


class _Base(SensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coord: EnergydashCoordinator) -> None:
        self.coord = coord

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_UPDATE, self.async_write_ha_state))


def _house_device(entry: ConfigEntry) -> DeviceInfo:
    return DeviceInfo(
        identifiers={(DOMAIN, HOUSE_KEY)}, name="Energydash", manufacturer="Energydash",
        entry_type=DeviceEntryType.SERVICE, sw_version=VERSION,
    )


class DeviceCostSensor(_Base):
    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_state_class = SensorStateClass.TOTAL
    _attr_suggested_display_precision = 2

    def __init__(self, coord, entry, dev: dict[str, Any], period: str) -> None:
        super().__init__(coord)
        self.dev_id = dev["id"]
        self.period = period
        self._attr_unique_id = f"{dev['id']}__cost_{period}"
        self._attr_translation_key = f"cost_{period}"
        self._attr_native_unit_of_measurement = coord.hass.config.currency
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, dev["id"])}, name=dev["name"], manufacturer="Energydash",
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def native_value(self) -> float | None:
        return round(self.coord.device_numbers(self.dev_id)[self.period]["cost"], 4)

    @property
    def last_reset(self) -> datetime:
        now = dt_util.now()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start.replace(day=1) if self.period == "month" else start

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        n = self.coord.device_numbers(self.dev_id)[self.period]
        return {"kwh": n["kwh"], "solar_kwh": n["zon"], "grid_kwh": n["net"], "grid_cost": n["net_cost"],
                "solar_cost": n["zon_cost"], "cost_all_grid": n["all_net"], "price_per_kwh": n["price_per_kwh"]}


class LastSessionSensor(_Base):
    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_suggested_display_precision = 2
    _attr_translation_key = "last_session"

    def __init__(self, coord, entry, dev: dict[str, Any]) -> None:
        super().__init__(coord)
        self.dev_id = dev["id"]
        self._attr_unique_id = f"{dev['id']}__last_session"
        self._attr_native_unit_of_measurement = coord.hass.config.currency
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, dev["id"])})

    @property
    def native_value(self) -> float | None:
        sess = self.coord.last_session(self.dev_id)
        return round(cost_of(sess["fields"], self.coord.solar_mode), 4) if sess else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        sess = self.coord.last_session(self.dev_id)
        if not sess:
            return {}
        f = sess["fields"]
        return {"start": sess["start"], "end": sess["end"], "kwh": round(f[0], 3), "solar_kwh": round(f[1], 3),
                "grid_kwh": round(f[0] - f[1], 3), "grid_cost": round(f[2], 4), "cost_all_grid": round(f[3], 4)}


class HouseCostSensor(_Base):
    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_state_class = SensorStateClass.TOTAL
    _attr_suggested_display_precision = 2

    def __init__(self, coord, entry, key: str, period: str) -> None:
        super().__init__(coord)
        self.key = key
        self._attr_unique_id = f"{key}__cost_{period}"
        self._attr_translation_key = "house_cost_today" if key == HOUSE_KEY else "rest_cost_today"
        self._attr_native_unit_of_measurement = coord.hass.config.currency
        self._attr_device_info = _house_device(entry)

    def _numbers(self) -> dict[str, Any]:
        t0, t1, _ = self.coord.today_bounds()
        return self.coord.rest_numbers(t0, t1).get(self.key, {})

    @property
    def native_value(self) -> float | None:
        return self._numbers().get("cost", 0.0)

    @property
    def last_reset(self) -> datetime:
        return dt_util.now().replace(hour=0, minute=0, second=0, microsecond=0)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        n = self._numbers()
        return {"kwh": n.get("kwh"), "solar_kwh": n.get("zon"), "price_per_kwh": n.get("price_per_kwh")}


class BaseloadSensor(_Base):
    _attr_device_class = SensorDeviceClass.POWER
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfPower.WATT
    _attr_translation_key = "baseload"
    _attr_unique_id = "baseload__watt"

    def __init__(self, coord, entry) -> None:
        super().__init__(coord)
        self._attr_device_info = _house_device(entry)
        self._cache: tuple[datetime, dict[str, Any]] | None = None

    def _baseload(self) -> dict[str, Any]:
        now = dt_util.utcnow()
        if self._cache is None or (now - self._cache[0]).total_seconds() > 600:
            self._cache = (now, self.coord.agg.baseload(self.coord.devices, dt_util.now().date(), self.coord.solar_mode))
        return self._cache[1]

    @property
    def native_value(self) -> float | None:
        return self._baseload().get("watt")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        b = self._baseload()
        return {"cost_month": b.get("cost_month"), "cost_year": b.get("cost_year"), "unexplained_w": b.get("unexplained_w")}

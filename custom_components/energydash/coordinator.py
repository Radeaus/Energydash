"""Runtime: listens to state changes, runs the trackers, stores results, recalculates history."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from datetime import date, datetime, timedelta
import logging
from typing import Any
from zoneinfo import ZoneInfo

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, HomeAssistant, State, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later, async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util
from homeassistant.util import slugify

from .aggregate import Aggregator, describe, hour_key
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
    CONTRACT_FIXED,
    DEFAULT_MIN_DURATION_MIN,
    DEFAULT_OFF_DELAY_MIN,
    DEFAULT_THRESHOLD_W,
    DEVICE_TYPES,
    DOMAIN,
    HOUSE_KEY,
    HOUSE_TICK_S,
    RECENT_DAYS,
    SESSION_FROM_ENTITY,
    SESSION_FROM_POWER,
    SOLAR_MODE_EXPORT,
    TYPE_CONTINUOUS,
    VERSION,
)
from .engine import to_kwh, to_watt
from .backfill import HOUR, backfill_device, backfill_house, prices_from_cost, self_use_hourly
from .history import INVALID, async_get_hourly, async_get_states, keep_days, numeric_series, unit_of
from .replay import replay_device, replay_house, self_use_series
from .price import PriceProvider, PriceSeries, parse_forecast
from .storage import EnergydashStorage
from .tracker import DeviceTracker, HouseTracker, TrackerOutput

_LOGGER = logging.getLogger(__name__)

SIGNAL_UPDATE = f"{DOMAIN}_update"
SIGNAL_DEVICES = f"{DOMAIN}_devices"
OBSERVED_PRICE_DAYS = 2
MAX_RECALC_DAYS = 30
BACKFILL_DAYS = 366  # older than the recorder window: hourly long-term statistics

DEVICE_FIELDS = (
    "id", "name", "type", "energy_entity", "energy_is_power", "power_entity", "session_source",
    "session_entity", "session_states", "threshold_w", "off_delay_min", "min_duration_min", "color", "added",
)


def _float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class LivePrices:
    """Forecast from the price entity plus its own observed states (for steps in the past)."""

    def __init__(self) -> None:
        self.points: list[tuple[datetime, float]] = []
        self.export_points: list[tuple[datetime, float]] = []
        self.forecast = PriceSeries()
        self.forecast_export = PriceSeries()
        self.current: float | None = None
        self.export_current: float | None = None
        self.forecast_attr: str | None = None
        self.scale = 1.0

    def add_point(self, t: datetime, value: float, export: bool = False) -> None:
        pts = self.export_points if export else self.points
        if pts and pts[-1][1] == value:
            return
        pts.append((t, value))
        cutoff = t - timedelta(days=OBSERVED_PRICE_DAYS)
        while len(pts) > 2 and pts[1][0] < cutoff:
            pts.pop(0)
        if export:
            self.export_current = value
        else:
            self.current = value

    def update_forecast(self, state: State, now: datetime) -> None:
        parsed = parse_forecast(dict(state.attributes), _float(state.state), now)
        self.forecast = parsed.price
        self.forecast_export = parsed.export
        self.forecast_attr = parsed.attribute
        self.scale = parsed.scale


class EnergydashCoordinator:
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, storage: EnergydashStorage) -> None:
        self.hass = hass
        self.entry = entry
        self.storage = storage
        self.tz = ZoneInfo(hass.config.time_zone)
        self.config: dict[str, Any] = {"devices": [], "archived": []}
        self.agg = Aggregator()
        self.trackers: dict[str, DeviceTracker] = {}
        self.house = HouseTracker()
        self.prices = LivePrices()
        self.export_prices = LivePrices()
        self.busy: dict[str, str] = {}
        self._paused: set[str] = set()
        self._unsubs: list[CALLBACK_TYPE] = []
        self._entity_unsub: CALLBACK_TYPE | None = None
        self._subscribers: list[Callable[[dict[str, Any]], None]] = []
        self._notify_unsub: CALLBACK_TYPE | None = None
        self._tasks: set[asyncio.Task] = set()
        self._last_prune: date | None = None
        self._price_cache: tuple[datetime, PriceProvider] | None = None

    # ---------------------------------------------------------------- settings
    @property
    def settings(self) -> dict[str, Any]:
        return {**self.entry.data, **self.entry.options}

    @property
    def solar_mode(self) -> str:
        return self.settings.get(CONF_SOLAR_MODE, SOLAR_MODE_EXPORT)

    @property
    def devices(self) -> list[dict[str, Any]]:
        return self.config["devices"]

    def device(self, device_id: str) -> dict[str, Any] | None:
        return next((d for d in self.devices if d["id"] == device_id), None)

    # --------------------------------------------------------------- lifecycle
    async def async_start(self) -> None:
        self.config, data, archive = await self.storage.async_load()
        self.agg = Aggregator(data.get("aggregator"))
        self.agg.merge(archive.get("aggregator"))
        self.house.restore(data.get("house"))
        trackers = data.get("trackers") or {}
        for dev in self.devices:
            tr = DeviceTracker(dev)
            tr.restore(trackers.get(dev["id"]))
            self.trackers[dev["id"]] = tr
        await self._async_seed_prices()
        self._subscribe_entities()
        self._unsubs.append(async_track_time_interval(self.hass, self._on_tick, timedelta(seconds=HOUSE_TICK_S)))
        if self.config.pop("pending_recalc", False):
            await self.storage.async_save_config(self.config)
            self.start_task(self.async_recalculate(None, include_house=True), "pending")
        elif not self.agg.hours.get(HOUSE_KEY) and self.house.last_time is None:
            self.start_task(self.async_recalculate_house(), "house")
        _LOGGER.debug("Energydash %s started with %d devices", VERSION, len(self.devices))

    async def async_settings_changed(self) -> None:
        """Options were changed (panel or options flow): reload prices and listeners, no restart."""
        await self._async_seed_prices()
        self.house = HouseTracker()
        self._subscribe_entities()
        self._save()
        self.notify()

    async def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._entity_unsub:
            self._entity_unsub()
            self._entity_unsub = None
        if self._notify_unsub:
            self._notify_unsub()
            self._notify_unsub = None
        for task in list(self._tasks):
            task.cancel()
        await self.storage.async_save_data(self._data())
        await self.storage.async_save_archive(self._archive())

    def start_task(self, coro, key: str) -> None:
        task = self.entry.async_create_background_task(self.hass, coro, f"{DOMAIN}_{key}")
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    def _cutoff(self) -> str:
        return (dt_util.now().date() - timedelta(days=RECENT_DAYS)).isoformat()

    def _data(self) -> dict[str, Any]:
        return {
            "aggregator": self.agg.split(self._cutoff())[0],
            "trackers": {k: v.to_dict() for k, v in self.trackers.items()},
            "house": self.house.to_dict(),
        }

    def _archive(self) -> dict[str, Any]:
        return {"aggregator": self.agg.split(self._cutoff())[1]}

    def _save(self, archive: bool = False) -> None:
        self.storage.schedule_save_data(self._data)
        if archive:
            self.storage.schedule_save_archive(self._archive)

    # ----------------------------------------------------------------- prices
    async def _async_seed_prices(self) -> None:
        """Seed observed prices from the recorder so steps right after a restart are priced."""
        s = self.settings
        self._price_cache = None
        self.prices = LivePrices()
        self.export_prices = LivePrices()
        if s.get(CONF_CONTRACT) == CONTRACT_FIXED:
            return
        now = dt_util.utcnow()
        ids = [s.get(CONF_PRICE_ENTITY), s.get(CONF_EXPORT_PRICE_ENTITY)]
        try:
            states = await async_get_states(self.hass, [i for i in ids if i], now - timedelta(days=OBSERVED_PRICE_DAYS), now)
        except Exception:  # noqa: BLE001 - recorder not ready or entity unknown
            _LOGGER.debug("Could not seed prices from history", exc_info=True)
            states = {}
        for target, eid in ((self.prices, ids[0]), (self.export_prices, ids[1])):
            if not eid:
                continue
            for t, v in numeric_series(states.get(eid, []), "power"):
                target.add_point(t, v)
            st = self.hass.states.get(eid)
            if st is not None:
                self._update_price_state(target, st)

    def _update_price_state(self, target: LivePrices, state: State) -> None:
        self._price_cache = None
        val = _float(state.state)
        if val is not None:
            target.add_point(state.last_changed, val)
        target.update_forecast(state, dt_util.utcnow())

    def price_provider(self) -> PriceProvider:
        """Cached for a few seconds: power sensors can update every second."""
        now = dt_util.utcnow()
        if self._price_cache is not None and (now - self._price_cache[0]).total_seconds() < 10:
            return self._price_cache[1]
        provider = self._build_price_provider()
        self._price_cache = (now, provider)
        return provider

    def _build_price_provider(self) -> PriceProvider:
        s = self.settings
        export_fixed = _float(s.get(CONF_EXPORT_PRICE_FIXED))
        if s.get(CONF_CONTRACT) == CONTRACT_FIXED:
            return PriceProvider(
                fixed=(float(s.get(CONF_PRICE_NORMAL) or 0), float(s.get(CONF_PRICE_LOW) or s.get(CONF_PRICE_NORMAL) or 0), self.tz),
                export_fallback=export_fixed,
            )
        end = dt_util.utcnow() + timedelta(days=1)
        observed = PriceSeries.from_steps(self.prices.points, end) if self.prices.points else None
        if s.get(CONF_EXPORT_PRICE_ENTITY):
            export_series = self.export_prices.forecast
            export_observed = PriceSeries.from_steps(self.export_prices.points, end) if self.export_prices.points else None
        else:
            export_series = self.prices.forecast_export
            export_observed = None
        return PriceProvider(
            series=self.prices.forecast,
            export_series=export_series,
            observed=observed,
            export_observed=export_observed,
            fallback=self.prices.current,
            export_fallback=export_fixed,
        )

    # -------------------------------------------------------------- listeners
    def _entity_map(self) -> dict[str, list[tuple[str, str]]]:
        mapping: dict[str, list[tuple[str, str]]] = {}
        for dev in self.devices:
            if dev.get("energy_is_power"):
                mapping.setdefault(dev["energy_entity"], []).append((dev["id"], "power"))
            else:
                mapping.setdefault(dev["energy_entity"], []).append((dev["id"], "energy"))
                if dev.get("power_entity") and dev.get("session_source") == SESSION_FROM_POWER and dev.get("type") != TYPE_CONTINUOUS:
                    mapping.setdefault(dev["power_entity"], []).append((dev["id"], "power"))
                elif dev.get("power_entity"):
                    mapping.setdefault(dev["power_entity"], []).append((dev["id"], "power_info"))
            if dev.get("session_source") == SESSION_FROM_ENTITY and dev.get("session_entity") and dev.get("type") != TYPE_CONTINUOUS:
                mapping.setdefault(dev["session_entity"], []).append((dev["id"], "session"))
        return mapping

    def _subscribe_entities(self) -> None:
        if self._entity_unsub:
            self._entity_unsub()
        self._map = self._entity_map()
        s = self.settings
        ids = set(self._map)
        for key in (CONF_PRICE_ENTITY, CONF_EXPORT_PRICE_ENTITY):
            if s.get(key):
                ids.add(s[key])
        self._entity_unsub = async_track_state_change_event(self.hass, list(ids), self._on_state) if ids else None

    def _state_kwh(self, entity_id: str | None) -> float | None:
        if not entity_id:
            return None
        st = self.hass.states.get(entity_id)
        if st is None or st.state in INVALID:
            return None
        val = _float(st.state)
        return to_kwh(val, st.attributes.get("unit_of_measurement")) if val is not None else None

    def import_now(self) -> float | None:
        return self._state_kwh(self.settings.get(CONF_IMPORT_ENTITY))

    def solar_now(self) -> float | None:
        """Cumulative solar self-use (production minus export); None without a solar counter."""
        solar = self._state_kwh(self.settings.get(CONF_SOLAR_ENTITY))
        if solar is None:
            return None
        export = self._state_kwh(self.settings.get(CONF_EXPORT_ENTITY))
        if self.settings.get(CONF_EXPORT_ENTITY) and export is None:
            return None  # export briefly unavailable: no bound rather than a wrong one
        return solar - (export or 0.0)

    @callback
    def _on_state(self, event: Event[EventStateChangedData]) -> None:
        new = event.data["new_state"]
        if new is None:
            return
        eid = event.data["entity_id"]
        s = self.settings
        if eid == s.get(CONF_PRICE_ENTITY):
            self._update_price_state(self.prices, new)
        if eid == s.get(CONF_EXPORT_PRICE_ENTITY):
            self._update_price_state(self.export_prices, new)
        roles = self._map.get(eid)
        if not roles:
            return
        t = new.last_changed
        prices = self.price_provider()
        imp = self.import_now()
        sol = self.solar_now()
        for dev_id, role in roles:
            tr = self.trackers.get(dev_id)
            if tr is None or dev_id in self._paused:
                continue
            if role == "energy":
                val = _float(new.state) if new.state not in INVALID else None
                if val is None:
                    continue
                out = tr.on_counter(t, to_kwh(val, new.attributes.get("unit_of_measurement")), imp, prices, sol)
            elif role in ("power", "power_info"):
                val = _float(new.state) if new.state not in INVALID else None
                watt = to_watt(val, new.attributes.get("unit_of_measurement")) if val is not None else None
                if role == "power_info":
                    tr.power_w = watt
                    continue
                out = tr.on_power(t, watt, imp, prices, sol)
                if watt is None:
                    tr.power_w = None
            else:
                out = tr.on_session_state(t, new.state)
            self._apply(dev_id, out)

    @callback
    def _on_tick(self, now: datetime) -> None:
        now = dt_util.utcnow()
        prices = self.price_provider()
        imp = self.import_now()
        sol = self.solar_now()
        for dev in self.devices:
            tr = self.trackers.get(dev["id"])
            if tr is None or dev["id"] in self._paused:
                continue
            counter = None if dev.get("energy_is_power") else self._state_kwh(dev["energy_entity"])
            self._apply(dev["id"], tr.tick(now, counter, imp, prices, sol))
        if HOUSE_KEY not in self._paused:
            s = self.settings
            step = self.house.tick(now, imp, self._state_kwh(s.get(CONF_EXPORT_ENTITY)), self._state_kwh(s.get(CONF_SOLAR_ENTITY)), prices)
            if step is not None:
                self.agg.add_step(HOUSE_KEY, step, self.tz)
                self._save()
                self.notify()
        today = dt_util.now().date()
        if self._last_prune != today:
            self._last_prune = today
            self.agg.prune(now, self.tz)
            self._save(archive=True)
            self._check_issues()

    def _apply(self, dev_id: str, out: TrackerOutput) -> None:
        for step in out.steps:
            self.agg.add_step(dev_id, step, self.tz)
        for sess in out.sessions:
            self.agg.add_session(sess)
            _LOGGER.debug("Session finished for %s: %s", dev_id, sess["fields"])
        if out.changed:
            self._save()
            self.notify()

    # ------------------------------------------------------------ notifications
    def subscribe(self, cb: Callable[[dict[str, Any]], None]) -> Callable[[], None]:
        self._subscribers.append(cb)

        def unsub() -> None:
            if cb in self._subscribers:
                self._subscribers.remove(cb)

        return unsub

    @callback
    def notify(self) -> None:
        async_dispatcher_send(self.hass, SIGNAL_UPDATE)
        if self._notify_unsub is None and self._subscribers:
            self._notify_unsub = async_call_later(self.hass, 3, self._send_notify)

    @callback
    def _send_notify(self, _now: datetime | None = None) -> None:
        self._notify_unsub = None
        payload = {"type": "changed", "busy": dict(self.busy)}
        for cb in list(self._subscribers):
            cb(payload)

    # ------------------------------------------------------------------ issues
    def _check_issues(self) -> None:
        s = self.settings
        required = [s.get(CONF_IMPORT_ENTITY)]
        if s.get(CONF_CONTRACT) != CONTRACT_FIXED:
            required.append(s.get(CONF_PRICE_ENTITY))
        required += [d["energy_entity"] for d in self.devices]
        for eid in filter(None, required):
            issue_id = f"missing_{slugify(eid)}"
            if self.hass.states.get(eid) is None:
                ir.async_create_issue(
                    self.hass, DOMAIN, issue_id, is_fixable=False, severity=ir.IssueSeverity.WARNING,
                    translation_key="missing_entity", translation_placeholders={"entity_id": eid},
                )
            else:
                ir.async_delete_issue(self.hass, DOMAIN, issue_id)

    # ----------------------------------------------------------------- devices
    def _clean_device(self, raw: dict[str, Any]) -> dict[str, Any]:
        dev = {k: raw.get(k) for k in DEVICE_FIELDS}
        if dev["type"] not in DEVICE_TYPES:
            raise ValueError("invalid_type")
        if not dev.get("energy_entity"):
            raise ValueError("missing_energy")
        dev["name"] = (dev.get("name") or dev["energy_entity"]).strip()
        dev["energy_is_power"] = bool(dev.get("energy_is_power"))
        dev["session_source"] = dev.get("session_source") or SESSION_FROM_POWER
        dev["session_states"] = [str(x) for x in (dev.get("session_states") or [])]
        if dev["type"] != TYPE_CONTINUOUS and dev["session_source"] == SESSION_FROM_ENTITY:
            if not dev.get("session_entity") or not dev["session_states"]:
                raise ValueError("missing_session_states")
        dev["threshold_w"] = float(dev.get("threshold_w") or DEFAULT_THRESHOLD_W)
        dev["off_delay_min"] = float(dev.get("off_delay_min") or DEFAULT_OFF_DELAY_MIN)
        dev["min_duration_min"] = float(dev.get("min_duration_min") or DEFAULT_MIN_DURATION_MIN)
        if dev["energy_is_power"]:
            dev["power_entity"] = dev["energy_entity"]
        return dev

    async def async_save_device(self, raw: dict[str, Any], recalculate: bool) -> dict[str, Any]:
        dev = self._clean_device(raw)
        existing = self.device(dev["id"]) if dev.get("id") else None
        if existing is None:
            base = slugify(dev["name"]) or "apparaat"
            new_id, n = base, 2
            taken = {d["id"] for d in self.devices} | {d["id"] for d in self.config["archived"]} | {HOUSE_KEY}
            while new_id in taken:
                new_id, n = f"{base}_{n}", n + 1
            dev["id"] = new_id
            dev["added"] = dt_util.utcnow().isoformat()
            used_colors = {d.get("color") for d in self.devices}
            dev["color"] = next(i for i in range(len(self.devices) + 1) if i not in used_colors)
            self.devices.append(dev)
            old_state = None
        else:
            dev["added"] = existing.get("added")
            dev["color"] = existing.get("color")
            self.devices[self.devices.index(existing)] = dev
            old_state = self.trackers[dev["id"]].to_dict() if dev["id"] in self.trackers else None
        tracker = DeviceTracker(dev)
        if old_state and old_state.get("last_time"):
            keep = {k: old_state.get(k) for k in ("last_value", "last_time", "last_import", "last_solar", "last_change", "power_w", "power_t", "synth_kwh")}
            tracker.restore(keep)
        self.trackers[dev["id"]] = tracker
        if tracker.last_time is None and not dev["energy_is_power"]:
            value = self._state_kwh(dev["energy_entity"])
            if value is not None:
                tracker.on_counter(dt_util.utcnow(), value, self.import_now(), self.price_provider(), self.solar_now())
        await self.storage.async_save_config(self.config)
        self._subscribe_entities()
        async_dispatcher_send(self.hass, SIGNAL_DEVICES)
        if recalculate:
            self.start_task(self.async_recalculate([dev["id"]]), dev["id"])
        self._save()
        self.notify()
        return dev

    async def async_delete_device(self, device_id: str, keep_history: bool = True) -> None:
        dev = self.device(device_id)
        if dev is None:
            return
        self.devices.remove(dev)
        self.trackers.pop(device_id, None)
        if keep_history:
            self.config["archived"].append({"id": dev["id"], "name": dev["name"], "type": dev["type"], "removed": dt_util.utcnow().isoformat()})
        else:
            self.agg.clear_series(device_id)
            self._save(archive=True)
        await self.storage.async_save_config(self.config)
        self._subscribe_entities()
        async_dispatcher_send(self.hass, SIGNAL_DEVICES)
        self._save()
        self.notify()

    # ------------------------------------------------------------ recalculation
    def _window(self) -> tuple[datetime, datetime]:
        end = dt_util.utcnow()
        start = end - timedelta(days=min(keep_days(self.hass), MAX_RECALC_DAYS))
        return start.replace(minute=0, second=0, microsecond=0), end

    async def _history_prices(self, start: datetime, end: datetime) -> PriceProvider:
        s = self.settings
        export_fixed = _float(s.get(CONF_EXPORT_PRICE_FIXED))
        if s.get(CONF_CONTRACT) == CONTRACT_FIXED:
            return self.price_provider()
        price_id = s.get(CONF_PRICE_ENTITY)
        export_id = s.get(CONF_EXPORT_PRICE_ENTITY)
        need_attrs = not export_id and self.solar_mode == SOLAR_MODE_EXPORT
        states = await async_get_states(self.hass, [price_id], start, end, attributes=need_attrs)
        price_states = states.get(price_id, [])
        observed = PriceSeries.from_steps(numeric_series(price_states, "power"), end + timedelta(days=1))
        export_series = None
        export_observed = None
        if need_attrs:
            merged: dict[datetime, tuple[datetime, float]] = {}
            for st in price_states:
                parsed = parse_forecast(dict(st.attributes), _float(st.state), st.last_changed)
                for a, b, v in zip(parsed.export.starts, parsed.export.ends, parsed.export.values):
                    merged[a] = (b, v)
            export_series = PriceSeries.from_intervals([(a, b, v) for a, (b, v) in merged.items()])
        elif export_id:
            exp = await async_get_states(self.hass, [export_id], start, end)
            export_observed = PriceSeries.from_steps(numeric_series(exp.get(export_id, []), "power"), end + timedelta(days=1))
        return PriceProvider(
            observed=observed, export_series=export_series, export_observed=export_observed,
            fallback=self.prices.current, export_fallback=export_fixed,
        )

    async def async_recalculate(self, device_ids: list[str] | None = None, include_house: bool = False) -> None:
        """Replace calculated results by a recalculation over the recorder history."""
        ids = device_ids if device_ids is not None else [d["id"] for d in self.devices]
        start, end = self._window()
        prices = await self._history_prices(start, end)
        imp_id = self.settings.get(CONF_IMPORT_ENTITY)
        imp_states = await async_get_states(self.hass, [imp_id], start, end)
        imp_series = numeric_series(imp_states.get(imp_id, []), "energy", unit_of(self.hass, imp_id))
        solar_series = await self._history_solar(start, end)
        older = await self._backfill_inputs(start, prices)
        for dev_id in ids:
            dev = self.device(dev_id)
            if dev is None:
                continue
            self.busy[dev_id] = "recalculating"
            self._paused.add(dev_id)
            self.notify()
            try:
                ent = [dev["energy_entity"], dev.get("power_entity"), dev.get("session_entity")]
                states = await async_get_states(self.hass, [e for e in ent if e], start, end)
                tracker, agg = await self.hass.async_add_executor_job(
                    replay_device, dev, states, imp_series, prices, start, end, self.tz,
                    unit_of(self.hass, dev["energy_entity"]), unit_of(self.hass, dev.get("power_entity")), solar_series,
                )
                await self._backfill_device(agg, dev, older, start)
                self.agg.clear_series(dev_id)
                if agg.hours.get(dev_id):
                    self.agg.hours[dev_id] = agg.hours[dev_id]
                self.agg.steplog[dev_id] = agg.steplog.get(dev_id, [])
                for sess in agg.sessions:
                    self.agg.add_session(sess)
                if self.device(dev_id) is not None:
                    self.trackers[dev_id] = tracker
                _LOGGER.debug("Recalculated %s: %d sessions", dev_id, len(agg.sessions))
            except Exception:
                _LOGGER.exception("Recalculation of %s failed", dev_id)
            finally:
                self._paused.discard(dev_id)
                self.busy.pop(dev_id, None)
        if include_house:
            await self.async_recalculate_house(imp_series=imp_series, prices=prices, older=older)
        elif older and not any(k < hour_key(start, self.tz) for k in self.agg.hours.get(HOUSE_KEY, {})):
            # A first device: also fill the house before the window, so "Rest van het huis" works there.
            house_agg = Aggregator()
            self.busy[HOUSE_KEY] = "recalculating"
            self.notify()
            try:
                await self.hass.async_add_executor_job(
                    backfill_house, house_agg, older["imp"], older["solar"], older["prices"], self.tz, start
                )
                self.agg.hours.setdefault(HOUSE_KEY, {}).update(house_agg.hours.get(HOUSE_KEY, {}))
            finally:
                self.busy.pop(HOUSE_KEY, None)
        self._save(archive=True)
        self.notify()

    async def _backfill_inputs(self, before: datetime, window_prices: PriceProvider) -> dict[str, Any] | None:
        """Hourly statistics before the recorder window: P1 import, solar self-use and prices."""
        s = self.settings
        start = before - timedelta(days=BACKFILL_DAYS)
        imp_id, exp_id, sol_id = s.get(CONF_IMPORT_ENTITY), s.get(CONF_EXPORT_ENTITY), s.get(CONF_SOLAR_ENTITY)
        try:
            change = await async_get_hourly(self.hass, [imp_id, exp_id, sol_id], start, before, "change")
            imp = change.get(imp_id, {})
            solar = None
            if sol_id and change.get(sol_id):
                solar = self_use_hourly(change[sol_id], change.get(exp_id, {}) if exp_id else None)
            prices = await self._backfill_prices(start, before, imp, window_prices)
        except Exception:
            _LOGGER.exception("Reading long-term statistics failed; only the recorder window is used")
            return None
        _LOGGER.debug("Long-term statistics: %d hours of P1 import before %s", len(imp), before)
        return {"imp": imp, "solar": solar, "prices": prices}

    async def _backfill_prices(
        self, start: datetime, before: datetime, imp: dict[datetime, float], window_prices: PriceProvider
    ) -> PriceProvider:
        s = self.settings
        if s.get(CONF_CONTRACT) == CONTRACT_FIXED:
            return self.price_provider()
        price_id, export_id = s.get(CONF_PRICE_ENTITY), s.get(CONF_EXPORT_PRICE_ENTITY)
        mean = (await async_get_hourly(self.hass, [price_id], start, before, "mean")).get(price_id, {})
        imp_id = s.get(CONF_IMPORT_ENTITY)
        if not mean and imp_id:
            # No statistics for the price entity: use the Energy dashboard's cost sensor of the P1 import.
            cost_id = f"{imp_id}_cost"
            cost = (await async_get_hourly(self.hass, [cost_id], start, before, "change")).get(cost_id, {})
            mean = prices_from_cost(cost, imp)
        hourly = lambda values: PriceSeries.from_intervals([(h, h + HOUR, v) for h, v in values.items()])  # noqa: E731
        export: dict[datetime, float] = {}
        if export_id:
            export = (await async_get_hourly(self.hass, [export_id], start, before, "mean")).get(export_id, {})
        export_fixed = _float(s.get(CONF_EXPORT_PRICE_FIXED))
        if not export and export_fixed is None and mean:
            # Export prices only come from the forecast attribute, which statistics do not keep:
            # use the export/import ratio of the recorder window.
            ratio = self._export_ratio(window_prices, before)
            export = {h: v * ratio for h, v in mean.items()}
        return PriceProvider(
            observed=hourly(mean), export_observed=hourly(export),
            fallback=self.prices.current, export_fallback=export_fixed,
        )

    @staticmethod
    def _export_ratio(prices: PriceProvider, window_start: datetime) -> float:
        hour, imp_sum, exp_sum = window_start, 0.0, 0.0
        while hour < dt_util.utcnow() - HOUR:
            p = prices.price(hour, hour + HOUR)
            if p is not None and p > 0:
                imp_sum += p
                exp_sum += prices.export_price(hour, hour + HOUR)
            hour += HOUR
        return exp_sum / imp_sum if imp_sum > 0 else 0.0

    async def _backfill_device(self, agg: Aggregator, dev: dict[str, Any], older: dict[str, Any] | None, before: datetime) -> None:
        if not older:
            return
        start = before - timedelta(days=BACKFILL_DAYS)
        eid = dev["energy_entity"]
        try:
            if dev.get("energy_is_power"):
                watts = (await async_get_hourly(self.hass, [eid], start, before, "mean")).get(eid, {})
                energy = {h: max(w, 0.0) / 1000 for h, w in watts.items()}
            else:
                energy = (await async_get_hourly(self.hass, [eid], start, before, "change")).get(eid, {})
            hours = await self.hass.async_add_executor_job(
                backfill_device, agg, dev["id"], energy, older["imp"], older["solar"], older["prices"], self.tz, before
            )
            _LOGGER.debug("Long-term statistics for %s: %d hours", dev["id"], hours)
        except Exception:
            _LOGGER.exception("Long-term statistics for %s could not be read", dev["id"])

    async def _history_solar(self, start: datetime, end: datetime) -> list:
        """Cumulative solar self-use over the window, for the zon <= self-use bound."""
        s = self.settings
        sol_id, exp_id = s.get(CONF_SOLAR_ENTITY), s.get(CONF_EXPORT_ENTITY)
        if not sol_id:
            return []
        states = await async_get_states(self.hass, [i for i in (sol_id, exp_id) if i], start, end)
        solar = numeric_series(states.get(sol_id, []), "energy", unit_of(self.hass, sol_id))
        export = numeric_series(states.get(exp_id, []), "energy", unit_of(self.hass, exp_id)) if exp_id else []
        return self_use_series(solar, export)

    async def async_recalculate_house(self, imp_series=None, prices: PriceProvider | None = None, older=None) -> None:
        s = self.settings
        start, end = self._window()
        self.busy[HOUSE_KEY] = "recalculating"
        self._paused.add(HOUSE_KEY)
        try:
            if prices is None:
                prices = await self._history_prices(start, end)
            ids = [s.get(CONF_IMPORT_ENTITY), s.get(CONF_EXPORT_ENTITY), s.get(CONF_SOLAR_ENTITY)]
            states = await async_get_states(self.hass, [i for i in ids if i], start, end)
            series = [numeric_series(states.get(i, []), "energy", unit_of(self.hass, i)) if i else [] for i in ids]
            if imp_series is not None:
                series[0] = imp_series
            house, agg = await self.hass.async_add_executor_job(replay_house, series, prices, start, end, self.tz)
            if older is None:
                older = await self._backfill_inputs(start, prices)
            if older:
                await self.hass.async_add_executor_job(
                    backfill_house, agg, older["imp"], older["solar"], older["prices"], self.tz, start
                )
            self.agg.hours[HOUSE_KEY] = agg.hours.get(HOUSE_KEY, {})
            self.house = house
        except Exception:
            _LOGGER.exception("Recalculation of the house failed")
        finally:
            self._paused.discard(HOUSE_KEY)
            self.busy.pop(HOUSE_KEY, None)
        self._save(archive=True)
        self.notify()

    # ------------------------------------------------------------------ resets
    async def async_reset(self, scope: str) -> None:
        """scope 'data': clear calculated results, keep devices. 'all': also remove devices."""
        self.agg.clear_all()
        self.house = HouseTracker()
        if scope == "all":
            self.config = {"devices": [], "archived": []}
            self.trackers = {}
            await self.storage.async_save_config(self.config)
            async_dispatcher_send(self.hass, SIGNAL_DEVICES)
        else:
            self.config["archived"] = []
            await self.storage.async_save_config(self.config)
            for dev in self.devices:
                self.trackers[dev["id"]] = DeviceTracker(dev)
        self._subscribe_entities()
        await self.storage.async_save_data(self._data())
        await self.storage.async_save_archive(self._archive())
        self.notify()

    def export_config(self) -> dict[str, Any]:
        return {"version": 1, "integration_version": VERSION, "exported": dt_util.utcnow().isoformat(),
                "settings": self.settings, "devices": self.devices}

    async def async_import_config(self, data: dict[str, Any], apply_settings: bool) -> int:
        devices = [self._clean_device(d) for d in data.get("devices") or []]
        self.agg.clear_all()
        self.house = HouseTracker()
        self.config = {"devices": [], "archived": []}
        self.trackers = {}
        for dev in devices:
            dev.pop("id", None)
            await self.async_save_device(dev, recalculate=False)
        if apply_settings and isinstance(data.get("settings"), dict):
            self.hass.config_entries.async_update_entry(self.entry, options=dict(data["settings"]))
            await self.async_settings_changed()
        self.start_task(self.async_recalculate(None, include_house=True), "import")
        return len(devices)

    # ------------------------------------------------------------------ queries
    def today_bounds(self) -> tuple[str, str, str]:
        today = dt_util.now().date()
        tomorrow = today + timedelta(days=1)
        month = today.replace(day=1)
        return f"{today.isoformat()}T00", f"{tomorrow.isoformat()}T00", f"{month.isoformat()}T00"

    def device_numbers(self, device_id: str) -> dict[str, Any]:
        t0, t1, m0 = self.today_bounds()
        mode = self.solar_mode
        return {
            "today": describe(self.agg.sum_range(device_id, t0, t1), mode),
            "month": describe(self.agg.sum_range(device_id, m0, t1), mode),
        }

    def rest_numbers(self, start_key: str, end_key: str) -> dict[str, float]:
        summary_days = self.agg.summary(self.devices, date.fromisoformat(start_key[:10]),
                                        (date.fromisoformat(end_key[:10]) - date.fromisoformat(start_key[:10])).days, self.solar_mode)
        return summary_days["totals"]

    def last_session(self, device_id: str) -> dict[str, Any] | None:
        for sess in reversed(self.agg.sessions):
            if sess["device_id"] == device_id:
                return sess
        return None

    def status(self) -> dict[str, Any]:
        return {
            "busy": dict(self.busy),
            "price_attribute": self.prices.forecast_attr,
            "price_scale": self.prices.scale,
            "price_current": self.prices.current,
            "import_now": self.import_now(),
            "house_since": min(self.agg.hours[HOUSE_KEY]) if self.agg.hours.get(HOUSE_KEY) else None,
        }

    def hour_now_key(self) -> str:
        return hour_key(dt_util.utcnow(), self.tz)

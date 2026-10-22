"""Per-device state machine: counter steps, P1 base, sessions. Pure module.

The same tracker is used live (fed by state changes) and for recalculation from history
(fed by recorder states in time order), so both give identical results.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from .const import (
    BASE_IDLE_S,
    BASE_REFRESH_S,
    MAX_STEP_S,
    SESSION_FROM_ENTITY,
    SESSION_GRACE_S,
    TYPE_CONTINUOUS,
)
from .engine import Prices, Step, add_fields, build_step, counter_delta
from .price import parse_time
from .sessions import EntitySessionDetector, PowerSessionDetector, SessionEvent

SYNTH_MIN_STEP_S = 60


@dataclass
class TrackerOutput:
    steps: list[Step] = field(default_factory=list)
    sessions: list[dict[str, Any]] = field(default_factory=list)
    changed: bool = False

    def extend(self, other: TrackerOutput) -> None:
        self.steps.extend(other.steps)
        self.sessions.extend(other.sessions)
        self.changed = self.changed or other.changed


def _new_session(start: datetime) -> dict[str, Any]:
    return {"start": start.isoformat(), "fields": [0.0] * 5, "quarters": {}, "steps": 0, "notes": []}


class DeviceTracker:
    """Tracks one device. `config` is the stored device dict (see storage.py)."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.device_id: str = config["id"]
        self.power_only: bool = bool(config.get("energy_is_power"))
        self.threshold = float(config.get("threshold_w") or 3.0)
        self.last_value: float | None = None
        self.last_time: datetime | None = None
        self.last_import: float | None = None
        self.last_change: datetime | None = None
        # power-only integration
        self.power_w: float | None = None
        self.power_t: datetime | None = None
        self.synth_kwh = 0.0
        # sessions
        self.detector: PowerSessionDetector | EntitySessionDetector | None = None
        if config.get("type") != TYPE_CONTINUOUS:
            if config.get("session_source") == SESSION_FROM_ENTITY and config.get("session_entity"):
                self.detector = EntitySessionDetector(config.get("session_states") or [])
            else:
                self.detector = PowerSessionDetector(
                    self.threshold,
                    float(config.get("off_delay_min") or 5.0),
                    float(config.get("min_duration_min") or 10.0),
                )
        self.open: dict[str, Any] | None = None
        self.finishing: dict[str, Any] | None = None

    # ------------------------------------------------------------------ inputs
    def on_counter(self, t: datetime, value_kwh: float, import_kwh: float | None, prices: Prices) -> TrackerOutput:
        """A new reading of the kWh counter (or the synthetic counter for power-only devices)."""
        out = self._housekeeping(t)
        if self.last_value is None or self.last_time is None:
            self.last_value, self.last_time, self.last_import = value_kwh, t, import_kwh
            out.changed = True
            return out
        if t <= self.last_time:
            return out
        de, reset = counter_delta(self.last_value, value_kwh)
        if de <= 0 and not reset:
            if value_kwh == self.last_value:
                return out
        notes = ["reset"] if reset else []
        if (t - self.last_time).total_seconds() > MAX_STEP_S:
            notes.append("long_gap")
        d_import = None
        if import_kwh is not None and self.last_import is not None:
            d_import, _ = counter_delta(self.last_import, import_kwh)
        step = build_step(self.last_time, t, de, d_import, prices, notes)
        out.steps.append(step)
        out.changed = True
        if de > 0:
            self.last_change = t
        if isinstance(self.detector, PowerSessionDetector) and not self.config.get("power_entity") and not self.power_only:
            hours = (t - self.last_time).total_seconds() / 3600
            if hours > 0:
                out.extend(self._session_events(self.detector.on_interval(self.last_time, t, de / hours * 1000), t))
        self._attribute(step)
        self.last_value, self.last_time, self.last_import = value_kwh, t, import_kwh
        return out

    def on_power(self, t: datetime, watt: float | None, import_kwh: float | None, prices: Prices) -> TrackerOutput:
        out = self._housekeeping(t)
        if self.power_only:
            out.extend(self._integrate(t, import_kwh, prices, watt))
        if watt is not None and isinstance(self.detector, PowerSessionDetector):
            out.extend(self._session_events(self.detector.on_power(t, watt), t))
        if watt is not None:
            self.power_w, self.power_t = watt, t
        return out

    def on_session_state(self, t: datetime, state: str | None) -> TrackerOutput:
        out = self._housekeeping(t)
        if isinstance(self.detector, EntitySessionDetector):
            out.extend(self._session_events(self.detector.on_state(t, state), t))
        return out

    def tick(self, t: datetime, counter_kwh: float | None, import_kwh: float | None, prices: Prices) -> TrackerOutput:
        """Periodic: base refresh (docs/02 'basis vasthouden'), session timeouts, power integration."""
        out = self._housekeeping(t)
        if self.power_only:
            out.extend(self._integrate(t, import_kwh, prices, self.power_w))
        elif counter_kwh is not None and self.last_value is not None and counter_kwh != self.last_value:
            out.extend(self.on_counter(t, counter_kwh, import_kwh, prices))
        if self.last_time is not None and import_kwh is not None and self._idle(t):
            if (t - self.last_time).total_seconds() >= BASE_REFRESH_S:
                self.last_time = t
                self.last_import = import_kwh
                out.changed = True
        return out

    # ----------------------------------------------------------------- helpers
    def _idle(self, t: datetime) -> bool:
        if self.power_only:
            return False  # the synthetic counter advances its own base
        ref = self.last_change or self.last_time
        if ref is None or (t - ref).total_seconds() < BASE_IDLE_S:
            return False
        if self.config.get("power_entity") and self.power_w is not None and self.power_w > self.threshold:
            return False
        return True

    def _integrate(self, t: datetime, import_kwh: float | None, prices: Prices, new_w: float | None) -> TrackerOutput:
        out = TrackerOutput()
        if self.power_t is not None and self.power_w is not None and t > self.power_t:
            self.synth_kwh += max(self.power_w, 0.0) * (t - self.power_t).total_seconds() / 3_600_000
        if new_w is not None or self.power_t is not None:
            self.power_t = t
        if new_w is not None:
            self.power_w = new_w
        if self.last_time is None or (t - self.last_time).total_seconds() >= SYNTH_MIN_STEP_S:
            out.extend(self.on_counter(t, self.synth_kwh, import_kwh, prices))
        return out

    def _housekeeping(self, t: datetime) -> TrackerOutput:
        out = TrackerOutput()
        if self.finishing is not None:
            if t >= parse_time(self.finishing["finalize_at"]):  # type: ignore[operator]
                out.sessions.append(self._finalize(self.finishing))
                self.finishing = None
                out.changed = True
        if self.detector is not None:
            out.extend(self._session_events(self.detector.check(t), t))
        return out

    def _session_events(self, events: list[SessionEvent], now: datetime) -> TrackerOutput:
        out = TrackerOutput()
        for ev in events:
            out.changed = True
            if ev.kind == "start":
                if self.finishing is not None:
                    out.sessions.append(self._finalize(self.finishing))
                    self.finishing = None
                self.open = _new_session(ev.start)
            elif ev.kind == "discard":
                self.open = None
            elif ev.kind == "end" and ev.end is not None:
                sess = self.open or _new_session(ev.start)
                sess["start"] = ev.start.isoformat()
                sess["end"] = ev.end.isoformat()
                sess["finalize_at"] = (max(ev.end, now) + timedelta(seconds=SESSION_GRACE_S)).isoformat()
                self.open = None
                if self.finishing is not None:
                    out.sessions.append(self._finalize(self.finishing))
                self.finishing = sess
        return out

    def _attribute(self, step: Step) -> None:
        target = None
        if self.open is not None and step.t1 > parse_time(self.open["start"]):  # type: ignore[operator]
            target = self.open
        elif self.finishing is not None and step.t0 < parse_time(self.finishing["end"]):  # type: ignore[operator]
            target = self.finishing
        if target is None or step.de <= 0:
            return
        add_fields(target["fields"], step.fields)
        target["steps"] += 1
        for note in step.notes:
            if note not in target["notes"]:
                target["notes"].append(note)
        for seg in step.segments:
            key = seg.start.replace(minute=(seg.start.minute // 15) * 15, second=0, microsecond=0).isoformat()
            q = target["quarters"].setdefault(key, [0.0, 0.0, 0.0, 0.0])
            q[0] += seg.kwh
            q[1] += seg.zon
            q[2] += seg.kwh * seg.price
            q[3] += seg.zon * seg.export_price

    def _finalize(self, sess: dict[str, Any]) -> dict[str, Any]:
        start = parse_time(sess["start"])
        quarters = []
        for key in sorted(sess["quarters"]):
            kwh, zon, value, export_value = sess["quarters"][key]
            quarters.append(
                [
                    key,
                    round(kwh, 5),
                    round(zon, 5),
                    round(value / kwh, 5) if kwh > 0 else 0.0,
                    round(export_value / zon, 5) if zon > 0 else 0.0,
                ]
            )
        return {
            "id": f"{self.device_id}-{int(start.timestamp()) if start else 0}",
            "device_id": self.device_id,
            "start": sess["start"],
            "end": sess.get("end"),
            "fields": [round(v, 6) for v in sess["fields"]],
            "quarters": quarters,
            "steps": sess["steps"],
            "notes": sess["notes"],
        }

    def open_session_view(self) -> dict[str, Any] | None:
        sess = self.open or self.finishing
        if sess is None:
            return None
        view = self._finalize(sess)
        view["running"] = self.open is not None
        return view

    # ------------------------------------------------------------- persistence
    def to_dict(self) -> dict[str, Any]:
        iso = lambda d: d.isoformat() if d else None  # noqa: E731
        return {
            "last_value": self.last_value,
            "last_time": iso(self.last_time),
            "last_import": self.last_import,
            "last_change": iso(self.last_change),
            "power_w": self.power_w,
            "power_t": iso(self.power_t),
            "synth_kwh": self.synth_kwh,
            "detector": self.detector.to_dict() if self.detector else None,
            "open": self.open,
            "finishing": self.finishing,
        }

    def restore(self, data: dict[str, Any] | None) -> None:
        if not data:
            return
        self.last_value = data.get("last_value")
        self.last_time = parse_time(data.get("last_time"))
        self.last_import = data.get("last_import")
        self.last_change = parse_time(data.get("last_change"))
        self.power_w = data.get("power_w")
        self.power_t = parse_time(data.get("power_t"))
        self.synth_kwh = float(data.get("synth_kwh") or 0.0)
        if self.detector and data.get("detector"):
            self.detector.restore(data["detector"])
        self.open = data.get("open")
        self.finishing = data.get("finishing")


class HouseTracker:
    """Whole-house consumption: import + (solar production - export) when solar is known."""

    def __init__(self) -> None:
        self.last: dict[str, float | None] = {"import": None, "export": None, "solar": None}
        self.last_time: datetime | None = None

    def tick(
        self,
        t: datetime,
        import_kwh: float | None,
        export_kwh: float | None,
        solar_kwh: float | None,
        prices: Prices,
    ) -> Step | None:
        if import_kwh is None:
            return None
        if self.last_time is None or self.last["import"] is None:
            self.last = {"import": import_kwh, "export": export_kwh, "solar": solar_kwh}
            self.last_time = t
            return None
        if t <= self.last_time:
            return None
        d_imp, _ = counter_delta(self.last["import"], import_kwh)
        house = d_imp
        if solar_kwh is not None and self.last["solar"] is not None:
            d_sol, _ = counter_delta(self.last["solar"], solar_kwh)
            d_exp = 0.0
            if export_kwh is not None and self.last["export"] is not None:
                d_exp, _ = counter_delta(self.last["export"], export_kwh)
            house += max(d_sol - d_exp, 0.0)
        step = build_step(self.last_time, t, house, d_imp, prices)
        self.last = {
            "import": import_kwh,
            "export": export_kwh if export_kwh is not None else self.last["export"],
            "solar": solar_kwh if solar_kwh is not None else self.last["solar"],
        }
        self.last_time = t
        return step

    def to_dict(self) -> dict[str, Any]:
        return {"last": self.last, "last_time": self.last_time.isoformat() if self.last_time else None}

    def restore(self, data: dict[str, Any] | None) -> None:
        if not data:
            return
        self.last = data.get("last") or self.last
        self.last_time = parse_time(data.get("last_time"))

"""Session detection (docs/02 §5). Pure module: no Home Assistant imports."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from statistics import median
from typing import Any

from .price import parse_time


@dataclass
class SessionEvent:
    kind: str  # "start", "end" or "discard"
    start: datetime
    end: datetime | None = None


class PowerSessionDetector:
    """'Sessions from the power use': start above a threshold, end after `off_delay` below it."""

    def __init__(self, threshold_w: float, off_delay_min: float, min_duration_min: float) -> None:
        self.threshold = float(threshold_w)
        self.off_delay = timedelta(minutes=float(off_delay_min))
        self.min_duration = timedelta(minutes=float(min_duration_min))
        self.running = False
        self.start: datetime | None = None
        self.last_above: datetime | None = None
        self.cur_above = False

    def on_power(self, t: datetime, watt: float) -> list[SessionEvent]:
        """Instantaneous power sample: the value holds until the next sample."""
        events: list[SessionEvent] = []
        above = watt > self.threshold
        if above:
            if not self.running:
                self.running = True
                self.start = t
                events.append(SessionEvent("start", t))
            self.last_above = t
        elif self.cur_above and self.running:
            self.last_above = t
        self.cur_above = above
        events.extend(self.check(t))
        return events

    def on_interval(self, t0: datetime, t1: datetime, watt: float) -> list[SessionEvent]:
        """Average power over [t0, t1], derived from counter steps when there is no power sensor."""
        events: list[SessionEvent] = []
        if watt > self.threshold:
            if not self.running:
                self.running = True
                self.start = t0
                events.append(SessionEvent("start", t0))
            self.last_above = t1
        self.cur_above = False
        events.extend(self.check(t1))
        return events

    def check(self, now: datetime) -> list[SessionEvent]:
        if not self.running or self.start is None:
            return []
        if self.cur_above:
            self.last_above = now
            return []
        last = self.last_above or self.start
        if now - last < self.off_delay:
            return []
        self.running = False
        start, end = self.start, last
        self.start = None
        kind = "end" if end - start >= self.min_duration else "discard"
        return [SessionEvent(kind, start, end)]

    def to_dict(self) -> dict[str, Any]:
        return {
            "running": self.running,
            "start": self.start.isoformat() if self.start else None,
            "last_above": self.last_above.isoformat() if self.last_above else None,
            "cur_above": self.cur_above,
        }

    def restore(self, data: dict[str, Any]) -> None:
        self.running = bool(data.get("running"))
        self.start = parse_time(data.get("start"))
        self.last_above = parse_time(data.get("last_above"))
        self.cur_above = bool(data.get("cur_above"))
        if self.running and self.start is None:
            self.running = False


class EntitySessionDetector:
    """'Sessions from an entity': a session runs while the entity has one of the chosen states."""

    def __init__(self, states: list[str]) -> None:
        self.states = {str(s) for s in states}
        self.running = False
        self.start: datetime | None = None

    def on_state(self, t: datetime, state: str | None) -> list[SessionEvent]:
        if state in (None, "unavailable", "unknown"):
            return []  # keep the current status through interruptions
        active = state in self.states
        if active and not self.running:
            self.running = True
            self.start = t
            return [SessionEvent("start", t)]
        if not active and self.running and self.start is not None:
            self.running = False
            start, self.start = self.start, None
            return [SessionEvent("end", start, t)]
        return []

    def check(self, now: datetime) -> list[SessionEvent]:
        return []

    def to_dict(self) -> dict[str, Any]:
        return {"running": self.running, "start": self.start.isoformat() if self.start else None}

    def restore(self, data: dict[str, Any]) -> None:
        self.running = bool(data.get("running"))
        self.start = parse_time(data.get("start"))
        if self.running and self.start is None:
            self.running = False


def detect_power_sessions(
    samples: list[tuple[datetime, float]],
    threshold_w: float,
    off_delay_min: float,
    min_duration_min: float,
    end: datetime,
) -> list[tuple[datetime, datetime]]:
    """Run the power detector over a history (used by the wizard preview)."""
    det = PowerSessionDetector(threshold_w, off_delay_min, min_duration_min)
    found: list[tuple[datetime, datetime]] = []
    for t, w in samples:
        for ev in det.on_power(t, w):
            if ev.kind == "end" and ev.end:
                found.append((ev.start, ev.end))
    for ev in det.check(end + det.off_delay):
        if ev.kind == "end" and ev.end:
            found.append((ev.start, ev.end))
    return found


def suggest_power_settings(samples: list[tuple[datetime, float]]) -> dict[str, float]:
    """Derive threshold and off-delay from history (docs/02 'drempels afleiden').

    Standby = median of the lower half of the samples; threshold sits a little above it.
    'Klaar na' = longest pause inside activity blocks x 1.5, bounded to 2-30 minutes.
    """
    if not samples:
        return {"threshold_w": 3.0, "off_delay_min": 5.0, "min_duration_min": 10.0}
    values = sorted(w for _, w in samples)
    low = values[: max(len(values) // 2, 1)]
    standby = median(low)
    high = values[-1]
    threshold = max(3.0, round(standby * 2 + 2, 0))
    if high > 0 and threshold > high / 4:
        threshold = max(1.0, round(high / 10, 0))

    # Pauses: below-threshold stretches shorter than 30 minutes between above-threshold samples.
    pauses: list[float] = []
    below_since: datetime | None = None
    seen_above = False
    for t, w in samples:
        if w > threshold:
            if below_since is not None and seen_above:
                gap = (t - below_since).total_seconds() / 60
                if gap < 30:
                    pauses.append(gap)
            below_since = None
            seen_above = True
        elif below_since is None:
            below_since = t
    longest = max(pauses) if pauses else 3.0
    off_delay = min(max(round(longest * 1.5), 2), 30)
    return {"threshold_w": float(threshold), "off_delay_min": float(off_delay), "min_duration_min": 10.0, "standby_w": round(standby, 2)}

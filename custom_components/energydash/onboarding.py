"""Quick start: turn discovered meters into ready devices and decide which ones are safe to add. Pure module."""

from __future__ import annotations

from typing import Any

from .const import (
    DEFAULT_MIN_DURATION_MIN,
    DEFAULT_OFF_DELAY_MIN,
    DEFAULT_THRESHOLD_W,
    SESSION_FROM_ENTITY,
    SESSION_FROM_POWER,
    TYPE_CHARGER,
    TYPE_CONTINUOUS,
)

CHARGER_OFF_DELAY_MIN = 60.0  # smart charging pauses for whole quarters; those stay one session
SPARK_POINTS = 80


def pick_type(candidate: dict[str, Any], analysis: dict[str, Any]) -> str:
    """Name wins, then history; without history the candidate's own guess."""
    if candidate.get("type_reason") == "name":
        return candidate["type"]
    if analysis.get("type_reason") not in (None, "no_history"):
        return analysis["suggested_type"]
    return candidate.get("type") or "sessions"


def build_device(
    candidate: dict[str, Any],
    analysis: dict[str, Any],
    session_entity: str | None = None,
    session_states: list[str] | None = None,
) -> dict[str, Any]:
    """Device config as the add wizard would make it with all suggestions accepted."""
    dev_type = pick_type(candidate, analysis)
    power_only = bool(candidate.get("power_only"))
    use_entity = dev_type != TYPE_CONTINUOUS and bool(session_entity) and bool(session_states)
    p = analysis.get("power_settings") or {}
    off_delay = float(p.get("off_delay_min") or DEFAULT_OFF_DELAY_MIN)
    if dev_type == TYPE_CHARGER:
        off_delay = max(off_delay, CHARGER_OFF_DELAY_MIN)
    return {
        "name": candidate.get("name") or candidate["entity_id"],
        "type": dev_type,
        "energy_entity": candidate["entity_id"],
        "energy_is_power": power_only,
        "power_entity": candidate["entity_id"] if power_only else candidate.get("power_entity"),
        "session_source": SESSION_FROM_ENTITY if use_entity else SESSION_FROM_POWER,
        "session_entity": session_entity if use_entity else None,
        "session_states": list(session_states or []) if use_entity else [],
        "threshold_w": float(p.get("threshold_w") or DEFAULT_THRESHOLD_W),
        "off_delay_min": off_delay,
        "min_duration_min": float(p.get("min_duration_min") or DEFAULT_MIN_DURATION_MIN),
    }


def summarize(device: dict[str, Any], preview: dict[str, Any] | None, days: int) -> dict[str, Any]:
    """What we found in the history, in numbers the list can show in one line."""
    preview = preview or {}
    sessions = preview.get("sessions") or []
    power = [float(w) for _, w in (preview.get("power") or []) if w is not None]
    out: dict[str, Any] = {"days": days, "sessions": None, "kwh_avg": None, "avg_w": None, "kwh_day": None}
    if device["type"] == TYPE_CONTINUOUS:
        kwh, hours = preview.get("kwh"), preview.get("kwh_hours")
        if kwh is not None and hours and hours >= 1:
            out["kwh_day"] = round(kwh / hours * 24, 2)
            out["avg_w"] = round(kwh / hours * 1000)
        elif power:
            # Power-only meter; the chart series keeps peaks, so this leans a little high.
            avg = sum(power) / len(power)
            out["avg_w"] = round(avg)
            out["kwh_day"] = round(avg * 24 / 1000, 2)
    else:
        out["sessions"] = len(sessions)
        kwhs = [s["kwh"] for s in sessions if s.get("kwh") is not None]
        if kwhs:
            out["kwh_avg"] = round(sum(kwhs) / len(kwhs), 2)
    out["spark"] = spark(power)
    return out


def spark(values: list[float], points: int = SPARK_POINTS) -> list[float]:
    """Max per bucket, so short sessions stay visible in a small chart."""
    if len(values) <= points:
        return [round(v, 1) for v in values]
    size = len(values) / points
    return [round(max(values[int(i * size): max(int((i + 1) * size), int(i * size) + 1)]), 1) for i in range(points)]


def assess(candidate: dict[str, Any], analysis: dict[str, Any], device: dict[str, Any], summary: dict[str, Any]) -> tuple[bool, str]:
    """(checked, reason). Only what is clearly right is checked; everything else says why not."""
    codes = {c["code"]: c["level"] for c in analysis.get("checks") or []}
    if candidate.get("power_only"):
        return False, "power_only"
    if "in_car_meter" in codes:
        return False, "in_car"
    if any(level == "bad" for level in codes.values()):
        return False, "data"
    trusted = bool(candidate.get("in_energy_prefs"))
    if not analysis.get("has_history"):
        return trusted, "no_history"
    if device["type"] != TYPE_CONTINUOUS and summary.get("sessions") == 0:
        return trusted, "no_sessions"
    if not trusted and not candidate.get("device_name"):
        return False, "loose"
    return True, "in_prefs" if trusted else "device"


def mark_duplicates(items: list[dict[str, Any]]) -> None:
    """Two checked chargers usually measure the same sessions (charger and car): keep the one in the Energy dashboard."""
    seen_charger = False
    for item in sorted(items, key=lambda i: not i["in_energy_prefs"]):
        if not item["checked"] or item["device"]["type"] != TYPE_CHARGER:
            continue
        if seen_charger:
            item["checked"] = False
            item["reason"] = "duplicate_charger"
        seen_charger = True


def order(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Checked first (Energy dashboard before others), then the rest; by name within each group."""
    return sorted(items, key=lambda i: (not i["checked"], not i["in_energy_prefs"], i["device"]["name"].lower()))

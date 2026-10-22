"""Storage of calculated results and the queries the panel needs. Pure module.

Results are kept per series (device id, `_house`) in local-hour buckets with five fields:
[kWh, zon kWh, net cost, all-net cost, zon export value]. The solar valuation is applied at
query time, so changing "What does power from your own solar panels cost?" works retroactively and consistently.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, tzinfo
from statistics import median
from typing import Any, Iterable

from .const import (
    EXPORT_KEY,
    F_ALL_NET,
    F_KWH,
    F_NET_COST,
    F_ZON,
    F_ZON_EXPORT,
    HOURLY_RETENTION_DAYS,
    HOUSE_KEY,
    MAX_SESSIONS,
    N_FIELDS,
    REST_KEY,
    STEP_LOG_SIZE,
    TYPE_CONTINUOUS,
)
from .engine import Step, add_fields, cost_of, zon_cost_of


def hour_key(t: datetime, tz: tzinfo) -> str:
    return t.astimezone(tz).strftime("%Y-%m-%dT%H")


def _zero() -> list[float]:
    return [0.0] * N_FIELDS


def rest_fields(house: list[float], devices: list[float]) -> list[float]:
    """'Rest of the house' = house minus devices, never negative."""
    if house[F_KWH] - devices[F_KWH] <= 1e-9:
        return _zero()
    return [max(house[i] - devices[i], 0.0) if i in (F_KWH, F_ZON) else house[i] - devices[i] for i in range(N_FIELDS)]


def describe(fields: list[float], solar_mode: str) -> dict[str, float]:
    kwh = fields[F_KWH]
    zon = fields[F_ZON]
    cost = cost_of(fields, solar_mode)
    return {
        "kwh": round(kwh, 4),
        "zon": round(zon, 4),
        "net": round(kwh - zon, 4),
        "net_cost": round(fields[F_NET_COST], 4),
        "zon_cost": round(zon_cost_of(fields, solar_mode), 4),
        "all_net": round(fields[F_ALL_NET], 4),
        "cost": round(cost, 4),
        "price_per_kwh": round(cost / kwh, 4) if kwh > 0.0005 else None,
        "grid_price_per_kwh": round(fields[F_ALL_NET] / kwh, 4) if kwh > 0.0005 else None,
    }


class Aggregator:
    def __init__(self, data: dict[str, Any] | None = None) -> None:
        data = data or {}
        self.hours: dict[str, dict[str, list[float]]] = {k: dict(v) for k, v in (data.get("hours") or {}).items()}
        self.sessions: list[dict[str, Any]] = list(data.get("sessions") or [])
        self.steplog: dict[str, list[dict[str, Any]]] = dict(data.get("steplog") or {})

    def to_dict(self) -> dict[str, Any]:
        return {"hours": self.hours, "sessions": self.sessions, "steplog": self.steplog}

    def split(self, cutoff_day: str) -> tuple[dict[str, Any], dict[str, Any]]:
        """(recent, archive) for storage: recent is rewritten often, the archive about once a day."""
        cutoff_key = f"{cutoff_day}T00"
        recent: dict[str, dict[str, list[float]]] = {}
        archive: dict[str, dict[str, list[float]]] = {}
        for series, buckets in self.hours.items():
            recent.setdefault(series, {})  # an empty series still says "calculated"
            for key, vals in buckets.items():
                target = recent if key >= cutoff_key else archive
                target.setdefault(series, {})[key] = [round(v, 6) for v in vals]
        return (
            {"hours": recent, "sessions": [x for x in self.sessions if x["start"] >= cutoff_day], "steplog": self.steplog},
            {"hours": archive, "sessions": [x for x in self.sessions if x["start"] < cutoff_day]},
        )

    def merge(self, archive: dict[str, Any] | None) -> None:
        """Add the archive part after loading the recent part."""
        if not archive:
            return
        for series, buckets in (archive.get("hours") or {}).items():
            target = self.hours.setdefault(series, {})
            for key, vals in buckets.items():
                target.setdefault(key, vals)
        known = {x["id"] for x in self.sessions}
        older = [x for x in archive.get("sessions") or [] if x["id"] not in known]
        self.sessions = sorted(older + self.sessions, key=lambda x: x["start"])

    # ------------------------------------------------------------------ writes
    def add_step(self, series: str, step: Step, tz: tzinfo, log: bool = True) -> None:
        if step.de > 0:
            buckets = self.hours.setdefault(series, {})
            for seg in step.segments:
                key = hour_key(seg.start, tz)
                add_fields(buckets.setdefault(key, _zero()), seg.fields)
        if log and series != HOUSE_KEY:
            entries = self.steplog.setdefault(series, [])
            entries.append(step.as_log())
            if len(entries) > STEP_LOG_SIZE:
                del entries[: len(entries) - STEP_LOG_SIZE]

    def add_export(self, t0: datetime, t1: datetime, kwh: float, prices: Any, tz: tzinfo) -> None:
        """Solar export of the house, with what it earned at the export price over [t0, t1]."""
        if kwh <= 0:
            return
        vals = _zero()
        vals[F_KWH] = kwh
        vals[F_ZON_EXPORT] = kwh * prices.export_price(t0, t1)
        add_fields(self.hours.setdefault(EXPORT_KEY, {}).setdefault(hour_key(t0, tz), _zero()), vals)

    def add_session(self, session: dict[str, Any]) -> None:
        self.sessions = [s for s in self.sessions if s["id"] != session["id"]]
        self.sessions.append(session)
        self.sessions.sort(key=lambda s: s["start"])
        if len(self.sessions) > MAX_SESSIONS:
            del self.sessions[: len(self.sessions) - MAX_SESSIONS]

    def clear_series(self, series: str) -> None:
        self.hours.pop(series, None)
        self.steplog.pop(series, None)
        self.sessions = [s for s in self.sessions if s["device_id"] != series]

    def clear_all(self) -> None:
        self.hours = {}
        self.sessions = []
        self.steplog = {}

    def prune(self, now: datetime, tz: tzinfo) -> None:
        cutoff = hour_key(now - timedelta(days=HOURLY_RETENTION_DAYS), tz)
        for buckets in self.hours.values():
            for key in [k for k in buckets if k < cutoff]:
                del buckets[key]

    # ----------------------------------------------------------------- queries
    def sum_range(self, series: str, start_key: str, end_key: str) -> list[float]:
        total = _zero()
        for key, vals in self.hours.get(series, {}).items():
            if start_key <= key < end_key:
                add_fields(total, vals)
        return total

    def series_hours(self, series: str, start_key: str, end_key: str) -> dict[str, list[float]]:
        return {k: v for k, v in self.hours.get(series, {}).items() if start_key <= k < end_key}

    def summary(
        self,
        devices: list[dict[str, Any]],
        first_day: date,
        days: int,
        solar_mode: str,
        by_month: bool = False,
    ) -> dict[str, Any]:
        """Dashboard data for `days` local days starting at `first_day` (rows per day or per month)."""
        day_keys = [(first_day + timedelta(days=i)) for i in range(days)]
        start_key = f"{day_keys[0].isoformat()}T00"
        end_key = f"{(day_keys[-1] + timedelta(days=1)).isoformat()}T00"
        ids = [d["id"] for d in devices]
        has_house = bool(self.hours.get(HOUSE_KEY))

        per_hour: dict[str, dict[str, list[float]]] = defaultdict(dict)
        for sid in ids + [HOUSE_KEY]:
            for key, vals in self.series_hours(sid, start_key, end_key).items():
                per_hour[key][sid] = vals

        row_key = (lambda day: f"{day[:7]}-01") if by_month else (lambda day: day)  # noqa: E731
        day_rows: dict[str, dict[str, list[float]]] = {row_key(d.isoformat()): defaultdict(_zero) for d in day_keys}
        totals: dict[str, list[float]] = defaultdict(_zero)
        day_whole: dict[str, list[float]] = defaultdict(_zero)  # whole house per row, for the solar part
        profile = [[0.0, 0.0] for _ in range(24)]  # kWh, all-net value
        for key, by_series in per_hour.items():
            day = row_key(key[:10])
            hour = int(key[11:13])
            dev_sum = _zero()
            for sid in ids:
                vals = by_series.get(sid)
                if vals:
                    add_fields(dev_sum, vals)
                    add_fields(day_rows[day][sid], vals)
                    add_fields(totals[sid], vals)
            if has_house:
                house = by_series.get(HOUSE_KEY, _zero())
                rest = rest_fields(house, dev_sum)
                add_fields(day_rows[day][REST_KEY], rest)
                add_fields(totals[REST_KEY], rest)
                # Hours without a house step (P1 not calculated yet) still count the devices.
                whole = house if house[F_KWH] >= dev_sum[F_KWH] else dev_sum
                add_fields(totals[HOUSE_KEY], whole)
            else:
                whole = dev_sum
            add_fields(day_whole[day], whole)
            profile[hour][0] += whole[F_KWH]
            profile[hour][1] += whole[F_ALL_NET]
        if not has_house:
            totals[HOUSE_KEY] = add_fields(_zero(), [sum(totals[i][f] for i in ids) for f in range(N_FIELDS)])

        exported = self.sum_range(EXPORT_KEY, start_key, end_key)
        day_export: dict[str, list[float]] = defaultdict(_zero)
        for key, vals in self.series_hours(EXPORT_KEY, start_key, end_key).items():
            add_fields(day_export[row_key(key[:10])], vals)

        def solar(d: str) -> dict[str, float]:
            """What the panels gave per row: kWh used directly with the grid power it saved, and export with its earnings."""
            whole, exp = day_whole[d], day_export[d]
            return {
                "kwh": round(whole[F_ZON], 4),
                "value": round(whole[F_ALL_NET] - whole[F_NET_COST], 4),
                "export_kwh": round(exp[F_KWH], 4),
                "export_value": round(exp[F_ZON_EXPORT], 4),
            }

        n_days = max(days, 1)
        return {
            "first_day": day_keys[0].isoformat(),
            "days": [
                {"date": d, "series": {sid: describe(v, solar_mode) for sid, v in rows.items()}, "solar": solar(d)}
                for d, rows in day_rows.items()
            ],
            "totals": {sid: describe(v, solar_mode) for sid, v in totals.items()},
            "has_house": has_house,
            "export": {
                "available": EXPORT_KEY in self.hours,
                "kwh": round(exported[F_KWH], 4),
                "value": round(exported[F_ZON_EXPORT], 4),
            },
            "hours": [
                {
                    "hour": h,
                    "kwh": round(profile[h][0] / n_days, 4),
                    "price": round(profile[h][1] / profile[h][0], 4) if profile[h][0] > 0.0005 else None,
                }
                for h in range(24)
            ],
        }

    def baseload(self, devices: list[dict[str, Any]], today: date, solar_mode: str, weeks: int = 8) -> dict[str, Any]:
        """Baseload: what the house always uses (docs/02 §6).

        Per night hour 02:00-05:00: house minus the devices that run in sessions (a car charging
        at night or a dishwasher on a timer is not baseload). Per night the lowest of those
        hours counts; the baseload is the median over the nights.
        """
        house = self.hours.get(HOUSE_KEY, {})
        session_ids = [d["id"] for d in devices if d.get("type") != TYPE_CONTINUOUS]
        nights: dict[str, float] = {}
        first = today - timedelta(weeks=weeks)
        d = first
        while d <= today:
            keys = [f"{d.isoformat()}T{h:02d}" for h in (2, 3, 4)]
            if all(k in house for k in keys):
                vals = []
                for k in keys:
                    sessions = sum(self.hours.get(sid, {}).get(k, (0.0,))[F_KWH] for sid in session_ids)
                    vals.append(max(house[k][F_KWH] - sessions, 0.0))
                nights[d.isoformat()] = min(vals) * 1000
            d += timedelta(days=1)

        recent = [v for k, v in nights.items() if k >= (today - timedelta(days=7)).isoformat()]
        if not recent:
            return {"available": bool(house), "nights": len(nights)}
        base_w = median(recent)

        def night_avg(series: str) -> float:
            vals = []
            for key in nights:
                if key < (today - timedelta(days=7)).isoformat():
                    continue
                hs = [self.hours.get(series, {}).get(f"{key}T{h:02d}") for h in (2, 3, 4)]
                vals.append(sum(v[F_KWH] for v in hs if v) / 3 * 1000)
            return sum(vals) / len(vals) if vals else 0.0

        parts = []
        explained = 0.0
        for dev in devices:
            if dev.get("type") != TYPE_CONTINUOUS:
                continue  # sessions are taken out of the baseload above
            watt = night_avg(dev["id"])
            if watt < 0.5:
                continue
            explained += watt
            parts.append({"device_id": dev["id"], "name": dev["name"], "watt": round(watt, 1), "continuous": dev.get("type") == TYPE_CONTINUOUS})
        start_key = f"{(today - timedelta(days=30)).isoformat()}T00"
        end_key = f"{(today + timedelta(days=1)).isoformat()}T00"
        month = self.sum_range(HOUSE_KEY, start_key, end_key)
        price = cost_of(month, solar_mode) / month[F_KWH] if month[F_KWH] > 0.01 else None
        kwh_day = base_w * 24 / 1000

        weekly: dict[str, list[float]] = defaultdict(list)
        for key, watt in nights.items():
            y, w, _ = date.fromisoformat(key).isocalendar()
            weekly[f"{y}-W{w:02d}"].append(watt)
        return {
            "available": True,
            "watt": round(base_w, 1),
            "kwh_day": round(kwh_day, 3),
            "price": round(price, 4) if price is not None else None,
            "cost_month": round(kwh_day * 30.4 * price, 2) if price is not None else None,
            "cost_year": round(kwh_day * 365 * price, 2) if price is not None else None,
            "explained": parts,
            "unexplained_w": round(max(base_w - explained, 0.0), 1),
            "weeks": [{"week": k, "watt": round(median(v), 1)} for k, v in sorted(weekly.items())][-weeks:],
            "nights": len(nights),
        }

    def device_totals(self, device_ids: Iterable[str], start_key: str, end_key: str, solar_mode: str) -> dict[str, dict[str, float]]:
        return {sid: describe(self.sum_range(sid, start_key, end_key), solar_mode) for sid in device_ids}

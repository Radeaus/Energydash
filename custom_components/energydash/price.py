"""Price handling: forecast parsing and time-weighted prices (docs/02 §3).

Pure module: no Home Assistant imports.
"""

from __future__ import annotations

from bisect import bisect_right
from dataclasses import dataclass, field
from datetime import datetime, timedelta, tzinfo
import math
from typing import Any

START_KEYS = ("start_date", "start", "starts_at", "from", "time", "datetime", "date_time", "begin")
END_KEYS = ("end_date", "end", "ends_at", "till", "to", "until")
PRICE_KEYS = (
    "price_tax_included",
    "price_incl_tax",
    "all_in_price",
    "total",
    "price",
    "value",
    "electricity_price",
    "market_price",
)
EXPORT_KEYS = ("price_tax_excluded", "price_excl_tax", "market_price_excl", "feed_in_price")
FORECAST_ATTRS = (
    "forecast",
    "prices",
    "raw_today",
    "raw_tomorrow",
    "prices_today",
    "prices_tomorrow",
    "today_prices",
    "tomorrow_prices",
)


def parse_time(value: Any) -> datetime | None:
    """Parse an ISO timestamp (or datetime) into an aware datetime."""
    if isinstance(value, datetime):
        return value if value.tzinfo else None
    if not isinstance(value, str):
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else None


def _num(value: Any) -> tuple[float | None, bool]:
    """Return (number, is_amount_dict). Amount dicts (Zonneplan) are in 1e-7 euro."""
    if isinstance(value, dict):
        if "amount" in value:
            try:
                return float(value["amount"]) / 10_000_000, True
            except (TypeError, ValueError):
                return None, True
        return None, False
    if isinstance(value, bool):
        return None, False
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None, False
    return (num if math.isfinite(num) else None), False


@dataclass
class PriceSeries:
    """Sorted, non-overlapping intervals with a constant price each."""

    starts: list[datetime] = field(default_factory=list)
    ends: list[datetime] = field(default_factory=list)
    values: list[float] = field(default_factory=list)

    def __bool__(self) -> bool:
        return bool(self.values)

    @classmethod
    def from_intervals(cls, items: list[tuple[datetime, datetime, float]]) -> PriceSeries:
        items = sorted((i for i in items if i[1] > i[0]), key=lambda i: i[0])
        series = cls()
        for start, end, value in items:
            if series.ends and start < series.ends[-1]:
                start = series.ends[-1]
                if end <= start:
                    continue
            series.starts.append(start)
            series.ends.append(end)
            series.values.append(value)
        return series

    @classmethod
    def from_steps(cls, points: list[tuple[datetime, float]], end: datetime) -> PriceSeries:
        """Build from state history: each value holds until the next change."""
        points = sorted(points, key=lambda p: p[0])
        items = []
        for i, (start, value) in enumerate(points):
            stop = points[i + 1][0] if i + 1 < len(points) else end
            items.append((start, stop, value))
        return cls.from_intervals(items)

    def value_at(self, t: datetime) -> float | None:
        idx = bisect_right(self.starts, t) - 1
        if idx >= 0 and t < self.ends[idx]:
            return self.values[idx]
        return None

    def weighted(self, t0: datetime, t1: datetime) -> float | None:
        """Time-weighted average over [t0, t1]; None when nothing overlaps."""
        if t1 <= t0:
            return self.value_at(t0)
        total = 0.0
        weight = 0.0
        idx = max(bisect_right(self.starts, t0) - 1, 0)
        while idx < len(self.starts) and self.starts[idx] < t1:
            overlap = (min(self.ends[idx], t1) - max(self.starts[idx], t0)).total_seconds()
            if overlap > 0:
                total += overlap * self.values[idx]
                weight += overlap
            idx += 1
        return total / weight if weight > 0 else None

    def coverage(self, t0: datetime, t1: datetime) -> float:
        """Fraction of [t0, t1] covered by intervals."""
        span = (t1 - t0).total_seconds()
        if span <= 0:
            return 1.0 if self.value_at(t0) is not None else 0.0
        covered = 0.0
        idx = max(bisect_right(self.starts, t0) - 1, 0)
        while idx < len(self.starts) and self.starts[idx] < t1:
            covered += max((min(self.ends[idx], t1) - max(self.starts[idx], t0)).total_seconds(), 0)
            idx += 1
        return covered / span


@dataclass
class ParsedForecast:
    price: PriceSeries
    export: PriceSeries
    attribute: str | None = None
    scale: float = 1.0


def _items_from_attributes(attributes: dict[str, Any]) -> tuple[list[Any], str | None]:
    items: list[Any] = []
    used: list[str] = []
    for key in FORECAST_ATTRS:
        value = attributes.get(key)
        if isinstance(value, list) and value and isinstance(value[0], dict):
            items.extend(value)
            used.append(key)
    return items, (", ".join(used) if used else None)


def parse_forecast(attributes: dict[str, Any], state_value: float | None, now: datetime | None) -> ParsedForecast:
    """Parse a forecast-like attribute into price series.

    Supports Zonneplan (start_date/end_date/price_tax_included.amount in 1e-7 €), Nord Pool
    (raw_today/raw_tomorrow with start/end/value) and similar shapes. When the current state is
    known, a power-of-ten scale difference (cents, 1e-7 units) is corrected automatically.
    """
    items, attr = _items_from_attributes(attributes or {})
    rows: list[tuple[datetime, datetime | None, float, float | None, bool]] = []
    for item in items:
        start = next((parse_time(item.get(k)) for k in START_KEYS if k in item), None)
        if start is None:
            continue
        end = next((parse_time(item.get(k)) for k in END_KEYS if k in item), None)
        price = None
        is_amount = False
        for key in PRICE_KEYS:
            if key in item:
                price, is_amount = _num(item[key])
                if price is not None:
                    break
        if price is None:
            continue
        export = None
        for key in EXPORT_KEYS:
            if key in item:
                export, _ = _num(item[key])
                if export is not None:
                    break
        rows.append((start, end, price, export, is_amount))

    rows.sort(key=lambda r: r[0])
    # Fill missing end times from the next start (or the typical spacing).
    spacing = timedelta(minutes=15)
    if len(rows) > 1:
        gaps = sorted((rows[i + 1][0] - rows[i][0]) for i in range(len(rows) - 1))
        spacing = gaps[len(gaps) // 2] or spacing
    price_items: list[tuple[datetime, datetime, float]] = []
    export_items: list[tuple[datetime, datetime, float]] = []
    for i, (start, end, price, export, _) in enumerate(rows):
        if end is None:
            end = rows[i + 1][0] if i + 1 < len(rows) else start + spacing
        price_items.append((start, end, price))
        if export is not None:
            export_items.append((start, end, export))

    price_series = PriceSeries.from_intervals(price_items)
    export_series = PriceSeries.from_intervals(export_items)

    scale = 1.0
    if price_series and state_value and now is not None:
        current = price_series.value_at(now)
        if current:
            ratio = state_value / current
            if ratio > 0:
                exp = math.log10(ratio)
                if abs(exp - round(exp)) < 0.05 and round(exp) != 0:
                    scale = 10.0 ** round(exp)
    if scale != 1.0:
        price_series.values = [v * scale for v in price_series.values]
        export_series.values = [v * scale for v in export_series.values]
    return ParsedForecast(price_series, export_series, attr, scale)


def is_low_tariff(t: datetime, tz: tzinfo) -> bool:
    """Dutch default: low tariff 23:00-07:00 on weekdays and all day in weekends."""
    local = t.astimezone(tz)
    if local.weekday() >= 5:
        return True
    return local.hour >= 23 or local.hour < 7


def fixed_tariff_series(t0: datetime, t1: datetime, normal: float, low: float, tz: tzinfo) -> PriceSeries:
    """Build an hourly series covering [t0, t1] for a normal/low fixed tariff."""
    start = t0.astimezone(tz).replace(minute=0, second=0, microsecond=0)
    items = []
    cursor = start
    while cursor < t1:
        nxt = cursor + timedelta(hours=1)
        items.append((cursor, nxt, low if is_low_tariff(cursor, tz) else normal))
        cursor = nxt
    return PriceSeries.from_intervals(items)


class PriceProvider:
    """Answers `price(t0, t1)` and `export_price(t0, t1)` for the engine."""

    def __init__(
        self,
        series: PriceSeries | None = None,
        export_series: PriceSeries | None = None,
        fallback: float | None = None,
        export_fallback: float | None = None,
        fixed: tuple[float, float, tzinfo] | None = None,
        observed: PriceSeries | None = None,
        export_observed: PriceSeries | None = None,
    ) -> None:
        """`series` is a forecast (preferred); `observed` is built from the entity's past states."""
        self.series = series or PriceSeries()
        self.export_series = export_series or PriceSeries()
        self.observed = observed or PriceSeries()
        self.export_observed = export_observed or PriceSeries()
        self.fallback = fallback
        self.export_fallback = export_fallback
        self.fixed = fixed

    def price(self, t0: datetime, t1: datetime) -> float | None:
        if self.fixed is not None:
            normal, low, tz = self.fixed
            return fixed_tariff_series(t0, t1, normal, low, tz).weighted(t0, t1)
        value = _pick(self.series, self.observed, t0, t1)
        return value if value is not None else self.fallback

    def export_price(self, t0: datetime, t1: datetime) -> float:
        value = _pick(self.export_series, self.export_observed, t0, t1)
        if value is None:
            value = self.export_fallback
        return value if value is not None else 0.0


def _pick(primary: PriceSeries, secondary: PriceSeries, t0: datetime, t1: datetime) -> float | None:
    """Forecast when it covers the interval, else observed states, else partial forecast."""
    if primary and primary.coverage(t0, t1) >= 0.98:
        return primary.weighted(t0, t1)
    if secondary:
        value = secondary.weighted(t0, t1)
        if value is not None:
            return value
    return primary.weighted(t0, t1) if primary else None

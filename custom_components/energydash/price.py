"""Price handling: forecast parsing and time-weighted prices (docs/02 §3).

Pure module: no Home Assistant imports.
"""

from __future__ import annotations

from bisect import bisect_right
from dataclasses import dataclass, field
from datetime import datetime, timedelta, tzinfo
import math
from typing import Any

# Key names used by price integrations (Zonneplan, Nord Pool, ENTSO-e, EPEX Spot, Tibber, Amber,
# Octopus Energy, Energi Data Service, Frank Energie, EnergyZero, easyEnergy, and others).
START_KEYS = (
    "start_date", "start", "start_time", "starts_at", "startsAt", "valid_from", "from", "time",
    "datetime", "date_time", "begin", "hour", "timestamp",
)
END_KEYS = ("end_date", "end", "end_time", "ends_at", "endsAt", "valid_to", "till", "to", "until")
PRICE_KEYS = (
    "price_tax_included",
    "price_incl_tax",
    "value_inc_vat",
    "all_in_price",
    "total",
    "per_kwh",
    "price_per_kwh",
    "price_ct_per_kwh",
    "price",
    "value",
    "electricity_price",
    "market_price",
    "price_eur_per_mwh",
)
EXPORT_KEYS = ("price_tax_excluded", "price_excl_tax", "market_price_excl", "feed_in_price")
FORECAST_ATTRS = (
    "forecast",
    "forecasts",
    "prices",
    "raw_today",
    "raw_tomorrow",
    "prices_today",
    "prices_tomorrow",
    "today_prices",
    "tomorrow_prices",
    "today",
    "tomorrow",
    "rates",
    "data",
)

# Subunits of a currency: a price in these is 100 times the price in the main unit.
SUBUNITS = {"ct", "cent", "cents", "c", "¢", "p", "pence", "öre", "ore", "øre", "gr", "grosz", "rp", "kop", "eurocent"}
SUBUNIT_EXACT = {"GBp", "c€", "€c", "ct€", "€ct"}


def unit_factor(unit: str | None) -> float:
    """Factor that turns a price in `unit` into a price per kWh in the main currency unit.

    `ct/kWh` and `öre/kWh` give 0.01, `€/MWh` gives 0.001, `EUR/kWh` and unknown units give 1.
    """
    if not unit or "/" not in unit:
        return 1.0
    num, den = (part.strip() for part in unit.replace(" ", "").rsplit("/", 1))
    den = den.lower()
    if den == "kwh":
        factor = 1.0
    elif den == "mwh":
        factor = 0.001
    elif den == "wh":
        factor = 1000.0
    else:
        return 1.0
    if num in SUBUNIT_EXACT or num.lower() in SUBUNITS or "cent" in num.lower():
        factor /= 100
    return factor


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

    def scaled(self, factor: float) -> PriceSeries:
        """The same intervals with every price multiplied by `factor` (unit conversion)."""
        if factor == 1.0:
            return self
        return PriceSeries(list(self.starts), list(self.ends), [v * factor for v in self.values])

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


def _is_interval(item: Any) -> bool:
    return isinstance(item, dict) and any(k in item for k in START_KEYS)


def _items_from_attributes(attributes: dict[str, Any]) -> tuple[list[Any], str | None]:
    items: list[Any] = []
    used: list[str] = []
    for key in FORECAST_ATTRS:
        value = attributes.get(key)
        if isinstance(value, list) and value and _is_interval(value[0]):
            items.extend(value)
            used.append(key)
    return items, (", ".join(used) if used else None)


def interval_groups(response: Any) -> list[list[dict[str, Any]]]:
    """Every list of price intervals in an action response, however deeply nested.

    Nord Pool returns `{area: [...]}` (one list per price area), Tibber
    `{"prices": {home: [...]}}`, EnergyZero and easyEnergy `{"prices": [...]}`.
    """
    out: list[list[dict[str, Any]]] = []
    if isinstance(response, list):
        if response and all(_is_interval(i) for i in response):
            return [list(response)]
        for item in response:
            out.extend(interval_groups(item))
    elif isinstance(response, dict):
        for value in response.values():
            out.extend(interval_groups(value))
    return out


def best_forecast(
    groups: list[list[dict[str, Any]]], state_value: float | None, now: datetime, name: str, tolerance: float = 0.05
) -> ParsedForecast | None:
    """The group whose price now matches the entity's state (after scaling), or None.

    With several price areas or homes in one response, only the one the entity belongs to
    matches. A forecast that matches none (a different VAT setting, another area) is not used.
    """
    if not state_value:
        return None
    best: tuple[float, ParsedForecast] | None = None
    for group in groups:
        parsed = parse_items(group, state_value, now, name)
        current = parsed.price.value_at(now)
        if current is None:
            continue
        error = abs(current - state_value) / abs(state_value)
        if error <= tolerance and (best is None or error < best[0]):
            best = (error, parsed)
    return best[1] if best else None


def parse_forecast(attributes: dict[str, Any], state_value: float | None, now: datetime | None) -> ParsedForecast:
    """Parse a forecast-like attribute into price series.

    Supports Zonneplan (start_date/end_date/price_tax_included.amount in 1e-7 €), Nord Pool
    (raw_today/raw_tomorrow with start/end/value) and similar shapes. When the current state is
    known, a power-of-ten scale difference (cents, 1e-7 units) is corrected automatically.
    """
    items, attr = _items_from_attributes(attributes or {})
    return parse_items(items, state_value, now, attr)


def parse_items(items: list[Any], state_value: float | None, now: datetime | None, attr: str | None = None) -> ParsedForecast:
    """Price intervals (dicts with a start, an optional end, and a price) into price series."""
    rows: list[tuple[datetime, datetime | None, float, float | None, bool]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
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


def export_relation(price: PriceSeries, export: PriceSeries) -> tuple[float, float] | None:
    """Export price as a linear function of the import price, `a * price + b`, from the forecast.

    The recorder does not keep large attributes (over 16 kB, such as Zonneplan's forecast), so
    for history only the import price (the entity's state) is known. Suppliers derive both from
    the same market price: all-in = (market + tax) x VAT, export = market. That is linear, so
    a least-squares fit over the forecast gives the export price for any past import price.
    """
    pairs = []
    for start, end, exp in zip(export.starts, export.ends, export.values):
        imp = price.weighted(start, end)
        if imp is not None:
            pairs.append((imp, exp))
    if len(pairs) < 4:
        return None
    n = len(pairs)
    mx = sum(p for p, _ in pairs) / n
    my = sum(e for _, e in pairs) / n
    var = sum((p - mx) ** 2 for p, _ in pairs)
    if var < 1e-8:
        return (my / mx, 0.0) if abs(mx) > 1e-6 else None
    a = sum((p - mx) * (e - my) for p, e in pairs) / var
    return a, my - a * mx


@dataclass(frozen=True)
class LowHours:
    """When the low tariff applies: from `start` to `end` (minutes after midnight, local time),
    and optionally all weekend. The default is the Dutch one: 23:00-07:00 and weekends."""

    start: int = 23 * 60
    end: int = 7 * 60
    weekend: bool = True

    @classmethod
    def parse(cls, start: Any, end: Any, weekend: Any) -> LowHours:
        s, e = parse_clock(start), parse_clock(end)
        default = cls()
        return cls(
            start=default.start if s is None else s,
            end=default.end if e is None else e,
            weekend=True if weekend is None else bool(weekend),
        )


def parse_clock(value: Any) -> int | None:
    """`"23:00"` (or `"23:00:00"`) into minutes after midnight; None when it is not a time."""
    if not isinstance(value, str):
        return None
    parts = value.strip().split(":")
    try:
        hours, minutes = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
    except ValueError:
        return None
    if not (0 <= hours < 24 and 0 <= minutes < 60):
        return None
    return hours * 60 + minutes


def is_low_tariff(t: datetime, tz: tzinfo, hours: LowHours | None = None) -> bool:
    """Low tariff at `t`; without `hours` the Dutch default (23:00-07:00 and weekends)."""
    hours = hours or LowHours()
    local = t.astimezone(tz)
    if hours.weekend and local.weekday() >= 5:
        return True
    minute = local.hour * 60 + local.minute
    if hours.start == hours.end:
        return False
    if hours.start < hours.end:
        return hours.start <= minute < hours.end
    return minute >= hours.start or minute < hours.end


def fixed_tariff_series(
    t0: datetime, t1: datetime, normal: float, low: float, tz: tzinfo, hours: LowHours | None = None
) -> PriceSeries:
    """Build a quarter-hourly series covering [t0, t1] for a normal/low fixed tariff."""
    start = t0.astimezone(tz)
    start = start.replace(minute=(start.minute // 15) * 15, second=0, microsecond=0)
    items = []
    cursor = start
    while cursor < t1:
        nxt = cursor + timedelta(minutes=15)
        items.append((cursor, nxt, low if is_low_tariff(cursor, tz, hours) else normal))
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
        fixed: tuple[float, float, tzinfo] | tuple[float, float, tzinfo, LowHours] | None = None,
        observed: PriceSeries | None = None,
        export_observed: PriceSeries | None = None,
        export_from_import: tuple[float, float] | None = None,
        markup: float = 0.0,
        export_same: bool = False,
        vat: float = 0.0,
    ) -> None:
        """`series` is a forecast (preferred); `observed` is built from the entity's past states.

        `export_from_import` (a, b) derives the export price from the import price when no export
        price is known for an interval (see export_relation). `markup` is added to the entity's
        price (taxes and fees the entity leaves out); the derived export price uses the entity's
        own price. `export_same`: export is paid at the import price, markup included.
        `vat` (a fraction, 0.21 for 21%) is added over the entity's price plus the markup.
        """
        self.series = series or PriceSeries()
        self.export_series = export_series or PriceSeries()
        self.observed = observed or PriceSeries()
        self.export_observed = export_observed or PriceSeries()
        self.fallback = fallback
        self.export_fallback = export_fallback
        self.export_from_import = export_from_import
        self.fixed = fixed
        self.markup = markup
        self.export_same = export_same
        self.vat = vat

    def _entity_price(self, t0: datetime, t1: datetime) -> float | None:
        if self.fixed is not None:
            normal, low, tz, *rest = self.fixed
            return fixed_tariff_series(t0, t1, normal, low, tz, rest[0] if rest else None).weighted(t0, t1)
        value = _pick(self.series, self.observed, t0, t1)
        return value if value is not None else self.fallback

    def price(self, t0: datetime, t1: datetime) -> float | None:
        value = self._entity_price(t0, t1)
        return (value + self.markup) * (1 + self.vat) if value is not None else None

    def export_price(self, t0: datetime, t1: datetime) -> float:
        if self.export_same:
            same = self.price(t0, t1)
            return same if same is not None else 0.0
        value = _pick(self.export_series, self.export_observed, t0, t1)
        if value is None:
            value = self.export_fallback
        if value is None and self.export_from_import is not None:
            imp = self._entity_price(t0, t1)
            if imp is not None:
                a, b = self.export_from_import
                value = a * imp + b
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

"""Generate the data for the Energydash demo by running the real calculation core.

A household is simulated at 5-minute resolution: dynamic quarter-hour prices, solar panels, a
washing machine, dryer, dishwasher, EV charger with smart charging, server, and heat pump. The
last LIVE_DAYS go through the same trackers as a live installation (sessions, counter steps);
the time before that is back-calculated per hour, as with the long-term statistics.

Times are written as minutes or hours since the first simulated day, so the demo page can
place the data relative to the visitor's today. The simulation runs in UTC as "local" time.

Usage: python demo/generate.py <output.json>
"""

from __future__ import annotations

import json
import math
import random
import sys
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path

PKG = Path(__file__).resolve().parent.parent / "custom_components" / "energydash"
pkg = types.ModuleType("edcore")
pkg.__path__ = [str(PKG)]  # type: ignore[attr-defined]
sys.modules["edcore"] = pkg

from edcore.aggregate import Aggregator  # noqa: E402
from edcore.backfill import backfill_device, backfill_house  # noqa: E402
from edcore.const import HOUSE_KEY  # noqa: E402
from edcore.price import PriceProvider, PriceSeries  # noqa: E402
from edcore.tracker import DeviceTracker, HouseTracker  # noqa: E402

DAYS = 400
LIVE_DAYS = 60
STEP_MIN = 5
TZ = timezone.utc
DAY0 = datetime(2025, 9, 18, tzinfo=TZ)  # any date: the page shifts everything to the visitor's today
random.seed(20261022)

DEVICES = [
    {"id": "washer", "name": "Washing machine", "type": "sessions", "energy_entity": "sensor.washing_machine_energy",
     "power_entity": "sensor.washing_machine_power", "session_source": "power", "threshold_w": 3.0, "off_delay_min": 5.0,
     "min_duration_min": 10.0, "color": 0, "icon": "mdi:washing-machine"},
    {"id": "dryer", "name": "Dryer", "type": "sessions", "energy_entity": "sensor.dryer_energy",
     "power_entity": "sensor.dryer_power", "session_source": "power", "threshold_w": 5.0, "off_delay_min": 5.0,
     "min_duration_min": 10.0, "color": 1, "icon": "mdi:tumble-dryer"},
    {"id": "dishwasher", "name": "Dishwasher", "type": "sessions", "energy_entity": "sensor.dishwasher_energy",
     "power_entity": "sensor.dishwasher_power", "session_source": "power", "threshold_w": 3.0, "off_delay_min": 30.0,
     "min_duration_min": 10.0, "color": 2, "icon": "mdi:dishwasher"},
    {"id": "charger", "name": "Charger", "type": "charger", "energy_entity": "sensor.charger_session_energy",
     "power_entity": "sensor.charger_power", "session_source": "entity", "session_entity": "sensor.charger_status",
     "session_states": ["Connected", "Charging"], "threshold_w": 3.0, "off_delay_min": 60.0, "min_duration_min": 10.0,
     "color": 3, "icon": "mdi:ev-station"},
    {"id": "server", "name": "Server", "type": "continuous", "energy_entity": "sensor.server_energy",
     "power_entity": "sensor.server_power", "session_source": "power", "threshold_w": 3.0, "off_delay_min": 5.0,
     "min_duration_min": 10.0, "color": 4, "icon": "mdi:server"},
    {"id": "heat_pump", "name": "Heat pump", "type": "continuous", "energy_entity": "sensor.heat_pump_energy",
     "power_entity": "sensor.heat_pump_power", "session_source": "power", "threshold_w": 3.0, "off_delay_min": 5.0,
     "min_duration_min": 10.0, "color": 6, "icon": "mdi:heat-pump"},
]
for d in DEVICES:
    d.setdefault("energy_is_power", False)
    d.setdefault("session_entity", None)
    d.setdefault("session_states", [])


def season(day: int) -> float:
    """1 in midsummer, -1 in midwinter."""
    date = DAY0 + timedelta(days=day)
    return math.cos(2 * math.pi * (date.timetuple().tm_yday - 172) / 365)


# ------------------------------------------------------------------ weather and prices
weather = []
for day in range(DAYS):
    s = season(day)
    sun = min(1.0, max(0.05, random.betavariate(2.2, 1.6) + 0.15 * s))
    temp = 10.5 + 8.5 * s + random.gauss(0, 2.5)
    weather.append((sun, temp))

quarters = DAYS * 96
market = []
for q in range(quarters):
    day, hour = q // 96, (q % 96) / 4
    s, (sun, _) = season(day), weather[day]
    base = 0.085 - 0.015 * s
    shape = (
        -0.035 * math.exp(-((hour - 3.5) ** 2) / 6)
        + 0.045 * math.exp(-((hour - 8) ** 2) / 2)
        + 0.07 * math.exp(-((hour - 19) ** 2) / 3)
        - (0.09 * s + 0.04) * sun * math.exp(-((hour - 13.5) ** 2) / 5) * (1 if s > -0.3 else 0.3)
    )
    weekend = (DAY0 + timedelta(days=day)).weekday() >= 5
    market.append(round(base + shape - (0.012 if weekend else 0) + random.gauss(0, 0.006), 5))
TAX = 0.1316  # energy tax and supplier fee per kWh
all_in = [round((m + TAX) * 1.21, 5) for m in market]


def q_start(q: int) -> datetime:
    return DAY0 + timedelta(minutes=15 * q)


price_series = PriceSeries.from_intervals([(q_start(q), q_start(q + 1), all_in[q]) for q in range(quarters)])
export_series = PriceSeries.from_intervals([(q_start(q), q_start(q + 1), market[q]) for q in range(quarters)])
prices = PriceProvider(series=price_series, export_series=export_series)

# ------------------------------------------------------------------ appliance schedules
TICKS = DAYS * 24 * 60 // STEP_MIN
watts = {d["id"]: [0.0] * TICKS for d in DEVICES}
charger_status = ["Standby"] * TICKS
charger_plug = [False] * TICKS


def put(dev: str, start_min: int, profile: list[tuple[int, float]]) -> int:
    """Add a power profile [(minutes, W), ...] from start_min; returns the end minute."""
    t = start_min
    for minutes, w in profile:
        for m in range(t, t + minutes, STEP_MIN):
            i = m // STEP_MIN
            if 0 <= i < TICKS:
                watts[dev][i] += w
        t += minutes
    return t


WASH = [(20, 2050.0), (15, 180.0), (5, 420.0), (35, 150.0), (10, 380.0), (10, 520.0)]
DRY = [(95, 820.0), (15, 300.0)]
DISH = [(20, 1950.0), (55, 45.0), (20, 1800.0), (40, 8.0)]

for day in range(DAYS):
    base = day * 1440
    sun, temp = weather[day]
    weekend = (DAY0 + timedelta(days=day)).weekday() >= 5
    if random.random() < (0.7 if weekend else 0.4):
        start = base + random.choice([9, 10, 11, 13, 14, 19]) * 60 + random.randint(0, 50)
        end = put("washer", start, WASH)
        if random.random() < 0.65:
            put("dryer", end + random.randint(10, 80), DRY)
    if random.random() < 0.85:
        sunny = sun > 0.65 and season(day) > -0.2
        start = base + (12 * 60 if sunny else 22 * 60) + random.randint(0, 20)
        put("dishwasher", start, DISH)

# EV charger: plugged in at about 18:30, smart charging in the cheapest quarters until 07:00;
# on sunny weekend days also charging around noon on solar power.
day = 0
while day < DAYS - 1:
    day += random.choice([2, 2, 3, 3, 4])
    if day >= DAYS - 1:
        break
    weekend = (DAY0 + timedelta(days=day)).weekday() >= 5
    sun = weather[day][0]
    energy = random.uniform(9, 26)
    if weekend and sun > 0.6 and season(day) > 0:
        plug, unplug, kw = day * 1440 + 11 * 60, day * 1440 + 17 * 60, 3.7
        slots = list(range(plug // 15, unplug // 15))
    else:
        plug, unplug, kw = day * 1440 + 18 * 60 + random.randint(0, 60), (day + 1) * 1440 + 7 * 60 + random.randint(0, 45), 11.0
        window = list(range(plug // 15 + 1, (day + 1) * 96 + 28))
        need = min(len(window), math.ceil(energy / (kw / 4)))
        slots = sorted(sorted(window, key=lambda q: all_in[q])[:need])
    left = energy
    for q in slots:
        if left <= 0:
            break
        take = min(kw / 4, left)
        left -= take
        for m in range(q * 15, q * 15 + 15, STEP_MIN):
            watts["charger"][m // STEP_MIN] += take * 4000
    for m in range(plug, unplug, STEP_MIN):
        i = m // STEP_MIN
        charger_plug[i] = True
        charger_status[i] = "Charging" if watts["charger"][i] > 0 else "Connected"

for i in range(TICKS):
    day, minute = divmod(i * STEP_MIN, 1440)
    hour = minute / 60
    temp = weather[day][1] + 3 * math.sin(2 * math.pi * (hour - 9) / 24)
    watts["server"][i] = 42 + random.gauss(0, 2.5)
    heating = max(0.0, 15 - temp) * 48 * (0.45 if hour < 6 else 1.5 if hour < 9 else 1.0)  # night setback, morning warm-up
    hot_water = 1450 if 5 * 60 <= minute < 5 * 60 + 40 else 0
    watts["heat_pump"][i] = heating + hot_water + 6

# Rest of the house and solar production
rest = [0.0] * TICKS
solar = [0.0] * TICKS
for i in range(TICKS):
    day, minute = divmod(i * STEP_MIN, 1440)
    hour = minute / 60
    sun, _ = weather[day]
    s = season(day)
    w = 165 + random.gauss(0, 12)  # fridge, router, standby
    if 6.75 <= hour < 7.5:
        w += 650
    if 17.5 <= hour < 18.5 and random.random() < 0.9:
        w += 1300
    if 18.5 <= hour < 23:
        w += 230
    rest[i] = w
    daylen = 12 + 4.3 * s
    rise = 13.5 - daylen / 2
    if rise < hour < rise + daylen:
        clouds = sun * (0.75 + 0.25 * random.random())
        solar[i] = 4300 * (0.55 + 0.45 * s) * math.sin(math.pi * (hour - rise) / daylen) * clouds

# ------------------------------------------------------------------ counters
kwh = lambda w: w * STEP_MIN / 60000  # noqa: E731
counter = {d["id"]: 0.0 for d in DEVICES}
counters = {d["id"]: [0.0] * TICKS for d in DEVICES}
imp, exp, prod = [0.0] * TICKS, [0.0] * TICKS, [0.0] * TICKS
c_imp = c_exp = c_prod = 0.0
for i in range(TICKS):
    if charger_plug[i] and (i == 0 or not charger_plug[i - 1]):
        counter["charger"] = 0.0  # the charger's session counter starts at 0 for each session
    load = rest[i]
    for d in DEVICES:
        counter[d["id"]] += kwh(watts[d["id"]][i])
        counters[d["id"]][i] = counter[d["id"]]
        load += watts[d["id"]][i]
    net = load - solar[i]
    c_imp += kwh(max(net, 0))
    c_exp += kwh(max(-net, 0))
    c_prod += kwh(solar[i])
    imp[i], exp[i], prod[i] = c_imp, c_exp, c_prod


def at(i: int) -> datetime:
    return DAY0 + timedelta(minutes=i * STEP_MIN)


# ------------------------------------------------------------------ history before the live window
agg = Aggregator()
live_from = (DAYS - LIVE_DAYS) * 24 * 60 // STEP_MIN
per_hour = 60 // STEP_MIN
H = timedelta(hours=1)


def hourly(values: list[float], until: int) -> dict[datetime, float]:
    out = {}
    for h in range(until // per_hour):
        a, b = h * per_hour, (h + 1) * per_hour
        prev = values[a - 1] if a > 0 else 0.0
        out[DAY0 + h * H] = values[b - 1] - prev
    return out


def hourly_device(dev: str, until: int) -> dict[datetime, float]:
    return {DAY0 + h * H: sum(kwh(w) for w in watts[dev][h * per_hour:(h + 1) * per_hour]) for h in range(until // per_hour)}


h_imp, h_exp, h_prod = hourly(imp, live_from), hourly(exp, live_from), hourly(prod, live_from)
self_use = {h: h_prod[h] - h_exp[h] for h in h_prod}
before = at(live_from)
backfill_house(agg, h_imp, self_use, prices, TZ, before, h_exp)
for d in DEVICES:
    backfill_device(agg, d["id"], hourly_device(d["id"], live_from), h_imp, self_use, prices, TZ, before)

# ------------------------------------------------------------------ live window through the trackers
trackers = {d["id"]: DeviceTracker(d) for d in DEVICES}
house = HouseTracker()
last_watt = {d["id"]: None for d in DEVICES}
last_status = None
for i in range(live_from - 1, TICKS):
    t = at(i)
    p1, sol = imp[i], prod[i] - exp[i]
    step = house.tick(t, p1, exp[i], prod[i], prices)
    if step is not None:
        agg.add_step(HOUSE_KEY, step, TZ, log=False)
        agg.add_export(step.t0, step.t1, house.exported, prices, TZ)
    for d in DEVICES:
        dev, tr = d["id"], trackers[d["id"]]
        outs = []
        if dev == "charger" and charger_status[i] != last_status:
            outs.append(tr.on_session_state(t, charger_status[i]))
            last_status = charger_status[i]
        w = round(watts[dev][i], 1)
        if w != last_watt[dev]:
            outs.append(tr.on_power(t, w, p1, prices, sol))
            last_watt[dev] = w
        outs.append(tr.on_counter(t, counters[dev][i], p1, prices, sol))
        outs.append(tr.tick(t, counters[dev][i], p1, prices, sol))
        for out in outs:
            for s in out.steps:
                agg.add_step(dev, s, TZ)
            for sess in out.sessions:
                agg.add_session(sess)
# Sessions still open at the end of the simulated day
for d in DEVICES:
    view = trackers[d["id"]].open_session_view()
    if view and view.get("end"):
        agg.add_session({k: v for k, v in view.items() if k != "running"})


# ------------------------------------------------------------------ output
def minutes(iso: str | None) -> int | None:
    if iso is None:
        return None
    return round((datetime.fromisoformat(iso) - DAY0).total_seconds() / 60)


def hour_index(key: str) -> int:
    return round((datetime.strptime(key, "%Y-%m-%dT%H").replace(tzinfo=TZ) - DAY0).total_seconds() / 3600)


r = lambda v: round(v, 5)  # noqa: E731
hours = {
    series: [[hour_index(k), *[r(v) for v in vals]] for k, vals in sorted(buckets.items())]
    for series, buckets in agg.hours.items()
}
sessions = [
    {
        "id": s["id"], "device_id": s["device_id"], "start": minutes(s["start"]), "end": minutes(s.get("end")),
        "fields": [r(v) for v in s["fields"]], "steps": s["steps"], "notes": s["notes"],
        "quarters": [[minutes(q[0]), *q[1:]] for q in s["quarters"]],
    }
    for s in agg.sessions
]
steplog = {
    dev: [{**e, "t0": minutes(e["t0"]), "t1": minutes(e["t1"])} for e in entries]
    for dev, entries in agg.steplog.items()
}
week = 7 * 24 * 60 // STEP_MIN
power = {dev: [[i * STEP_MIN, round(max(w[i:i + 3]), 1)] for i in range(TICKS - week, TICKS, 3)] for dev, w in watts.items()}
out = {
    "generated_with": "demo/generate.py",
    "days": DAYS,
    "devices": DEVICES,
    "hours": hours,
    "sessions": sessions,
    "steplog": steplog,
    "power": power,
    "prices": {"all_in": all_in[-2 * 96:], "market": market[-2 * 96:]},  # yesterday and today, per quarter
    "meters": {"import": round(imp[-1], 3), "export": round(exp[-1], 3), "solar": round(prod[-1], 3)},
    "counters": {dev: [[i * STEP_MIN, round(c[i], 4)] for i in range(TICKS - 288, TICKS, 6)] for dev, c in counters.items()},
}
target = Path(sys.argv[1] if len(sys.argv) > 1 else "demo/data.json")
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
print(f"{target}: {target.stat().st_size // 1024} kB, {len(sessions)} sessions, "
      f"{sum(len(v) for v in hours.values())} hourly rows, series {sorted(hours)}")

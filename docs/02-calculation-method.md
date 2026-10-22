# 02 – Calculation method

This is the heart of the integration. All rules below have been checked against real data (see [Validation on real data](#8-validation-on-real-data)).

## 1. Energy: always from a kWh counter

Each device has one energy source:

- kWh counter (`device_class: energy`, `state_class: total_increasing` or `total`): preferred. Every increase of the counter is a measurement step `dE`.
- Power (`device_class: power`, W): only when there is no counter. The integration integrates it to kWh itself (trapezoid/left). The **Data check** shows a warning, and with slow refreshing it shows **Not recommended**.

### Counter resets
- A drop of the counter means a new counter (the session counter of a charger, a power outage, a replacement).
- In that case: `dE = new value` (not the negative difference).
- Skip `unavailable`/`unknown`. The next valid value gives the difference over the whole interruption.

### Several counters for one meter
Import, export, and production can consist of several counters: a smart meter with separate counters for normal and off-peak, or two inverters. Energydash adds them up. In the history, this is done per counter with the same reset rule, so a reset of one counter doesn't make the sum drop. The sum only starts once every counter has a value.

### Impossible steps
If the counter rises faster than a home connection can deliver (more than 25 kW on average since the previous counter reading), that step is not counted and `implausible` is shown in the measurement steps. This happens with a counter in the car (`charge_energy_added`) after charging on the road, for example 38.8 kWh in 30 minutes at a fast charger. It also happens with a counter that briefly falls back to 0 and then returns to its old reading.

### Why not power (demonstrated)
The charger (`sensor.charge_laadpaal_laadpaalvermogen`) refreshes through the Zonneplan cloud every 5 minutes. The P1 refreshes every second. The old method calculated `solar = charging power − P1`:

- At every start, the charging power stayed too low for up to ~6 minutes, so energy was missed.
- At every stop, ~11 kW was still shown for up to 5 minutes while the car had already stopped. The difference with the P1 was counted as solar, even at night ("phantom solar").

## 2. Solar or grid: per measurement step with the P1 import counter

Per measurement step (interval `[t0, t1]`, energy `dE` of the device):

```
dImport = P1_import(t1) − P1_import(t0)      # kWh counter, not power
net     = min(dE, max(dImport, 0))
zon     = dE − net
# with a production counter: zon ≤ the panels' own use in the same interval
zon     = min(zon, dOpwek − dExport)
net     = dE − zon
```

In the formulas, `net` is the grid part, `zon` the solar part, and `dOpwek` the production in the interval.

Meaning: solar first covers the rest of the house. Only what the device needed beyond what was left came from the grid. This is also the marginal cost: without the device, the import in that interval would have been lower by `net`.

Properties:
- `zon + net = dE`, so the sum always matches the device's counter.
- At night, `dImport ≥ dE` (house + device), so `zon = 0`. Phantom solar isn't possible.
- Using the same interval for both counters is essential.
- If a production counter is set, `zon` can never be more than what the panels themselves delivered into the house in that interval (production minus export). What the P1 and the panels together don't explain counts as grid power (note `solar_capped`). Without a production counter, this limit doesn't apply.

### Home battery
With a home battery, "own power" is solar power or power from the battery. The battery counters (into and out of the battery, as in the Energy dashboard) change two things:

- The bound on `zon` uses the own power of the interval: `dOpwek − dExport + dOut − dIn`. At night, a device can only count as own power for as much as the battery delivered.
- The whole house is `dImport + (dOpwek − dExport) + dOut − dIn`, never below 0. Charging the battery from the grid is in the import, but not used in the house.

Battery losses are not counted separately. Without a production counter, the bound only uses the battery: solar panels without a production counter would then be capped too, so set both.

### Keeping the base between sessions
While the device isn't using power, the P1 base (`P1_import(t0)` and `t0`) is refreshed periodically (for example, every 5 minutes). Then the first measurement step after a start only covers the last few minutes, not the whole idle hour before it.

This is only allowed if the counter refreshes fast enough. A counter that only reports a reading every 30 minutes (the counter in a Tesla, fetched through the cloud) reports half an hour of use with its first reading. If the P1 were then measured over only the last 5 minutes, most of it would look like solar, even at night. That's why:
- The tracker remembers how often the counter changes during use (median of the last 15 intervals, up to 3 hours).
- A measurement step starts at the newest base that lies at least one such interval before the new reading. The older base points (up to 4 hours) are kept for this.
- If that interval would also give an impossible power (> 25 kW), the step starts at the previous counter reading.

### Known limitation
A cloud counter lags slightly behind the real-time P1 (cloud latency). With constant use this doesn't matter. With quickly changing sunshine, the split per step can shift a little. The total energy stays exact, because it comes from the device's counter.

## 3. Price: time-weighted quarter-hour price

You choose how the price is entered. Energydash assumes nothing (see `04-ux-and-design.md`, quick start):

- **Price from an entity**: any sensor per kWh or MWh, from any supplier. You're asked whether this is the price you actually pay. If not (for example, a bare market price from Nord Pool or ENTSO-e), an **Extra per kWh** (energy tax and supplier fee) and optionally a **VAT (%)** are added: `prijs = (prijs_entiteit + opslag) × (1 + btw)`. With the VAT left empty, the extra can include the VAT, as before.
- **Fixed price**: one price, or normal and low. The low tariff runs from a start to an end time in local time (default 23:00–07:00, past midnight when the end is before the start) and optionally all weekend (default on). The series is built per quarter hour, so times like 21:30 work.

### Units
The unit of the price entity is converted to the main currency per kWh: a subunit (`ct`, `c`, `cent`, `p`, `GBp`, `öre`, `øre`, `gr`, `rp`, `kop`) divides by 100, per MWh divides by 1000, per Wh multiplies by 1000. Other units count as the main currency per kWh. The same factor applies to the forecast, the recorder history, and the hourly statistics of the price entity, and to an export price entity with its own unit. The panel shows the current price after conversion.

### Forecast prices
- From an attribute: a list of intervals with a start (`start_date`, `start`, `start_time`, `startsAt`, `valid_from`, `hour`, `timestamp`, and similar), an optional end, and a price (`price_tax_included`, `value_inc_vat`, `total`, `per_kwh`, `price_per_kwh`, `price`, `value`, and similar). Without an end, the next start is the end.
- Through an action, for integrations in Home Assistant itself without such an attribute: `nordpool.get_prices_for_date` (today and tomorrow), `tibber.get_prices`, `energyzero.get_energy_prices`, and `easyenergy.get_energy_usage_prices` (with VAT). Fetched hourly, and every 10 minutes until the first prices arrive. A response with several lists (Nord Pool areas, Tibber homes) uses the list whose current price matches the entity's state within 5%; a response that matches none is not used.
- A power-of-ten difference between the forecast and the state (cents, 1e-7 units, per MWh) is corrected when the current price matches.

With a price entity:
- If it has a forecast attribute with prices per quarter hour or hour (like Zonneplan):

```
prijs(t0, t1) = Σ over kwartieren q: overlap(q, [t0,t1]) × prijs_q  /  Σ overlap
```

- Without a forecast: the price at the moment of measurement.
- Zonneplan-specific format (example, don't hardcode): `forecast[i].start_date`, `end_date`, `price_tax_included.amount` in units of 1e-7 € (so `/ 10_000_000`).

Cost per step:
```
netkosten  = net × prijs
zonkosten  = zon × zonprijs        # see section 4
kosten     = netkosten + zonkosten
alles_net  = dE × prijs            # for comparison ("without solar panels")
```

## 4. What does your own solar power cost? (setting, applies to all devices)

The choices in the panel, with the resulting `zonprijs`:

- **What you would otherwise have received**: the export price of that quarter hour (see below). The fairest choice without net metering (net metering ends in 2027).
- **Nothing**: 0. For people who want to see solar as free.
- **The same as grid power**: equal to `prijs`. Shows what each device costs without solar panels.

The export price is also your choice. It's only asked when there is an export counter or a production counter:

- **From your price entity** (only with a price entity): the price without taxes from the forecast. If it isn't in there, or for history, it's derived from the entity's price (without the extra per kWh) using the ratio from the forecast.
- **From another entity** (only with a price entity): that entity.
- **A fixed amount**: that amount (0 is allowed).

The backend also knows `same` (export price = electricity price). The panel doesn't offer that choice. With a fixed price, the export price is always a fixed amount.

Older settings without this choice keep the old behavior: with an export price entity **From another entity**, otherwise **From your price entity** (with a fixed rate, the fixed amount, or 0).

## 5. Sessions

Each device has one of three types:

- **Sessions** – **From the power use**: starts above a threshold (for example, 3 W), ends after X minutes below the threshold, with a minimum duration Y. For example, a washing machine, dryer, or dishwasher.
- **Sessions** – **From an entity**: the session runs as long as a chosen entity has one of the chosen states. For example, a charger (status `VehicleDetected`/`Charging`), a car's cable sensor, a smart washing machine, a thermostat, or a threshold helper.
- **Continuous**: no sessions, cost per day and month. For example, a server, fridge, or air conditioner.

### Deriving thresholds from one example ("point out one wash")
- Standby = median power outside the session, so the threshold goes just above it (for example, standby 0.6 W gives a threshold of 3 W).
- Longest pause within the example × ~1.5 gives **Done after** (for example, 3 min gives 5 min).
- Short peaks (draining) are filtered out by a **Minimum duration** (for example, 10 min).
- Validation directly in the wizard: "found exactly 1 wash", or an explanation of what's wrong and which way to change the setting.

### Charger-specific
- Smart charging pauses within one plug-in session stay one session (status entity, not power use).
- Sessions from the power use with a charger: **Done after** defaults to at least 60 minutes (adjustable up to 4 hours). With a dynamic contract, smart charging often pauses for one or more quarter hours. Those pauses belong to the same session.
- When unplugging during charging, the last measurement step (≤ 5 min) can be lost: the counter jumps to 0 before the last reading comes in. This also applies to the supplier itself.

## 6. Baseload and "Rest of the house"
- Per night: for each hour between 02:00 and 05:00, the house use minus the devices with sessions (charger, car, a washing machine on a timer). Those don't belong to the base load. Otherwise every overnight charging session would count as baseload.
- Of those three hours, the quietest one counts. This also filters out a device without its own meter that runs briefly at night.
- Base load = the median of that over the last 7 nights.
- Split into: continuous devices with a meter, and "unexplained". Devices with sessions aren't included.
- **Rest of the house** on the dashboard = the whole house (import plus own power used, see section 2) minus the added devices, so everything adds up to the whole house.

## 7. History from before the recorder

The recorder usually keeps readings for 10 days. For the period before that (up to a year back), **Recalculate** uses the long-term statistics of Home Assistant, which are kept permanently per hour:

- Energy per hour = the `change` of the counter's statistic (Home Assistant has already handled resets). For a power sensor: the hourly average.
- Solar or grid per hour with the same rule as per measurement step, including the limit from the production counter. Because `min(Σa, Σb) ≥ Σ min(a, b)`, an hourly split never gives more solar than a finer one: no phantom solar, at most slightly too little.
- Price per hour = the hourly average of the price entity, converted to the main currency per kWh. If it has no statistics, the cost sensor of the Energy dashboard (`<import counter>_cost`) is used: the cost of that hour divided by the import of that hour.
- Extra per kWh and VAT: also counted here.
- Home battery: the hourly changes of both battery counters are part of the own power per hour, with the same rules as per measurement step.
- Export price: according to the choice in section 4. With **From your price entity**, the ratio of export to import price from the forecast.
- Hours with more than 25 kWh aren't counted (charging on the road).
- Sessions can't be recovered from hourly totals. That period only shows cost per hour, day, and month.

## 8. Validation on real data

### Charging session October 20–21, 2026 (overnight charging, 23:01–05:46)

| | kWh | Solar | Cost |
|---|---|---|---|
| Charger counter | 49.897 | – | – |
| Old method (power − P1) | 48.39 | 0.72 (phantom solar, at night) | €16.56 |
| New method (counter × time-weighted quarter-hour price) | 49.897 | 0 | €17.33 (€0.347/kWh) |
| Zonneplan sensor `sessiekosten` | – | – | €15.98 |

- The phantom solar sat exactly at the stop moments (01:41, 03:01, 04:36, 05:46), each time ~0.18 kWh (≈ 11 kW × 1 minute).
- The shortfall sat at the start moments (charging power first showed ~5.2 kW or 0 while ~11 kW was already being charged).
- Zonneplan's own session cost matches kWh × all-in quarter-hour price to the cent at the 5-minute level, _except_ between 00:00 and 01:46: there it shows €5.26 for 19.2 kWh (€0.274/kWh) at quarter-hour prices of €0.336–0.347. That explains €1.35 of the difference. Whether Zonneplan subtracts solar couldn't be tested (no solar charging session in the 10 days of history).

### Sunny day September 26, 2026
- From 18:00 to 19:00, the old method counted 0.21 kWh of solar while the inverter produced 0. At 17:00, it counted 0.40 kWh of solar with 0.33 kWh of production. This confirms the same mechanism during the day.
- Hourly totals of the old method differed by up to 0.8 kWh from the charger's counter.

### Test cases for the calculation core
1. The overnight session above: expect 49.897 kWh, 0 solar, €17.33 ± €0.05 with the given quarter-hour prices.
2. Counter reset in the middle of a series: no negative step.
3. Measurement step across a quarter-hour boundary: time-weighted price.
4. Solar surplus larger than device use: `net = 0`, `zon = dE`.
5. House already imports without the device (`dImport ≥ dE`): `zon = 0`.
6. Interruption (`unavailable`) of 20 minutes: one step over the whole interval, no loss.

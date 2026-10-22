# 03 – Detecting entities automatically

The integration suggests devices and sources; you decide. Each suggestion says what it is based on.

## Signals

- `device_class` (state attributes or entity registry): `energy` is a kWh counter, `power` is power.
- `unit_of_measurement` (state attributes): kWh, Wh, or MWh for energy; W or kW for power.
- `state_class` (state attributes): `total_increasing` or `total` is a usable counter. Missing means a forecast or a derived value.
- Energy dashboard preferences (`energy/get_prefs`): `energy_sources` (grid, solar, gas) and `device_consumption` with `stat_consumption` and optionally `stat_rate` (the matching power sensor).
- Device and area (device and area registry): link the counter and the power sensor of the same plug, and show the name and area.
- History (recorder): refresh rate, interruptions, and pattern (sessions or continuous).

## Order of suggestions

1. Energy dashboard `device_consumption`: you already named these devices. Take over the name, the counter, and `stat_rate` if present.
2. Other `energy` counters with `total_increasing` that belong to a device and are not already used.
3. Power only (`power` without a matching counter on the same device): shown with the warning "Power only".

## Filters (not suggested)

- Counters listed as grid (`stat_energy_from` or `stat_energy_to`) or solar in the energy sources, such as the P1 meter or the inverter.
- Periodic counters (today, this week, this month, this year). Recognized by resets at fixed moments in the history, with name parts like `today`, `vandaag`, or `this_month` as a supporting signal.
- Sensors without `state_class`, such as forecasts and calculated values.
- Duplicates of the same physical measurement, such as HomeKit bridges or cloud copies of local data: the same value and pattern as a counter that is already chosen.
- Your own helper sensors derived from other counters (integration or template helpers), unless you choose them explicitly.

## Suggesting the type from history (last 7 days)

- Continuous: never below a threshold (for example, a server never below 30 W), or varying without clear on/off cycles (air conditioner).
- Sessions: repeatedly on, then standby, with clear blocks (washing machine 5 times in 7 days, 80 to 95 minutes).
- Charger: the name or device contains "laadpaal", "charger", "wallbox", or "EVSE", or it ran above 7 kW for more than an hour several times.

## Quick start (`onboarding.py`, `energydash/suggest`)

For each meter found (at most 20), the same analysis runs as in the wizard: type, session entity and statuses (charger), thresholds and **Done after** from 7 days of history, and the session example. The result is a ready-made device plus a verdict:

- `in_prefs`: in the Energy dashboard, data is fine. Checked.
- `device`: counter of a device (plug), not in the Energy dashboard, with history and sessions. Checked.
- `no_history` or `no_sessions`: no history yet, or a session device without sessions in 7 days. Checked only if it is in the Energy dashboard.
- `power_only`: power only. Not checked.
- `in_car`: counter in the car (charging losses don't count, charging on the road does). Not checked.
- `data`: the data check says "Not recommended". Not checked.
- `loose`: not part of a device and not in the Energy dashboard. Not checked.
- `duplicate_charger`: a second charger counter next to a checked one (measures the same sessions). Not checked.

A charger gets its sessions from a status entity if there are statuses in which the counter increased _and_ a status remains in which no session runs ("on" and "off" together don't count). The quick start tries at most three entities. Connection statuses (`connectivity`, "verbinding", "online", and similar) are always at the bottom of each list: they say whether the device is reachable, not whether it is charging. If none works, sessions come from the power use, with **Done after** set to at least 60 minutes. Continuous devices show the average from the counter (kWh per day), not from the chart series.

## Data check (per chosen source)

Shown in the wizard and with the device. Each line has a status (ok, limitation, or not recommended), a value, and the consequence in plain words.

- Unit and type: ok is kWh with `total_increasing`. A limitation is W: "the kWh is calculated from the power".
- Counter type: ok is a counter that always increases. One that starts at 0 per session is recognized and no problem.
- Refresh (measured): ok is about every 10 s. A limitation is about every 5 minutes: "start and end can be up to 5 minutes off".
- Interruptions: ok is none. A limitation is 2 times unavailable: "bridged".
- What it measures: a counter in the car is a limitation: "charging losses are not included".
- Session entity: ok is a status that refreshes about every 5 minutes. A limitation is a cable sensor that refreshes every 30 minutes at rest: "the start time can be late".

Problems that come up later (a sensor often unavailable, a counter that disappeared) are reported through Home Assistant **Repairs** (`issue_registry`), only if you can do something about them.

## Result on the production Home Assistant (scan on October 22, 2026)

52 energy sensors and 25 power sensors were found. After the filters, 6 devices remain:

- Wasmachine (washing machine): counter `sensor.zolder_wasmachine_energy_import`, power `sensor.zolder_wasmachine_vermogen`. From the Energy dashboard.
- Server: counter `sensor.zolder_server_energy_import`, power `sensor.zolder_server_vermogen`. From the Energy dashboard.
- Laadpaal (charger): counter `sensor.charge_laadpaal_laadpaal_energie_geleverd_sessie`, power `sensor.charge_laadpaal_laadpaalvermogen`. From the Energy dashboard.
- Airco Woonkamer (living room air conditioner): counter `sensor.woonkamer_woonkamer_airco_mitsubishi_energieverbruik_totaal`, no power sensor. From the Energy dashboard.
- Airco Slaapkamer (bedroom air conditioner): counter `sensor.slaapkamer_slaapkamer_airco_mitsubishi_energieverbruik_totaal`, no power sensor. From the Energy dashboard.
- Droger (dryer): counter `sensor.zolder_droger_energy_import`, power `sensor.zolder_droger_vermogen`. Energy Socket in the attic, _not_ in the Energy dashboard.

Alternative sources for the charger: `sensor.controlekamer_tesla_model_3_charge_energy_added` (measures in the car, without charging losses), and the session entities `sensor.charge_laadpaal_laadpaalstatus` (recommended) or `binary_sensor.controlekamer_tesla_model_3_oplaadkabel` (refreshed only every 30 minutes at rest).

Full list: `../referentie/ha-scan-2026-10-22.md`.

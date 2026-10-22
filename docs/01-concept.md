# 01 – Concept

## The idea
A dashboard in Home Assistant that shows what electricity really costs, per device:

- Per session: what did this wash, this drying cycle, or this charging session cost?
- Per day and month: for devices that run all the time, such as a server, air conditioner, or fridge.
- Baseload: the base load of the house (median of the P1 import at night) in €/month and €/year, with how much of it is explained by measured devices.

Costs are calculated with the actual price at the moment of use (a dynamic contract per quarter hour, or a fixed rate). Use of your own solar power is settled fairly.

## Who it is for
Home Assistant targets three kinds of users. The design must work for all three:

- Switchers (from big-tech smart home): it must work without YAML, with a wizard and good suggestions.
- Tinkerers: want to choose sources, adjust rules, and see how the calculation works.
- Askers (want more, need help): explanations in the interface, a data check, and clear error messages with a next step.

## What already exists (survey October 21, 2026)

| Project | What it does | What is missing for this goal |
|---|---|---|
| Standard Energy dashboard | Use and cost at house level, devices in kWh | No cost per device or per session |
| WashData (HACS, 1.1k stars, AGPL) | Detects cycles of washing machine, dryer, and dishwasher, learns programs, energy and cost per cycle, own sidebar panel | Only devices with cycles; no charging sessions, no baseload, no house-wide overview, no fair solar settlement |
| Dynamic Energy Cost | Cost per device with a dynamic price sensor (day/month/year) | No sessions, no solar settlement, no dashboard |
| Genergy Dashboard (CC BY-NC-SA) | Good-looking dashboard for solar, battery, and grid; integration + Lit cards + config flow | No cost per device; forecasts through EMHASS/HAEO; strongly focused on home batteries |
| Energy Flow Card Plus, Energy Sankey | Visualization of energy flows | Visualization only |
| PowerCalc | Estimates use of devices without a meter | A complement, not a cost analysis |

Positioning: the cost layer for the whole house. One place where washes, charging sessions, continuous devices, and baseload are shown together in euros, with solar settlement that adds up. Optional later: read cycle events from WashData for people who already use it.

## Why it is needed (background)
In the production Home Assistant, the home-made measurement of charging sessions kept drifting from the Zonneplan data. Research (see `02-calculation-method.md`) showed that the cause was not the price, but the measurement method: combining a slowly refreshed power value with a real-time P1 meter. This integration aims to solve pitfalls like that for everyone.

## Sources
- WashData: https://github.com/3dg1luk43/ha_washdata
- Dynamic Energy Cost: https://github.com/martinarva/dynamic_energy_cost
- Genergy Dashboard: https://github.com/SpengeSec/Genergy-Dashboard
- Energy Flow Card Plus: https://github.com/flixlix/energy-flow-card-plus
- Energy Sankey: https://github.com/davet2001/energy-sankey
- Dynamic Energy Prices (NL/BE): https://github.com/gokhancelik/energy-api-integrations

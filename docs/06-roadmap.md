# 06 – Roadmap, decisions, and open questions

## Phases

> October 22, 2026: phases 1 to 3 were built in one go as version 1.0.0 (see `CHANGELOG.md`). Now: test phase on the test Home Assistant following `docs/08-install-and-test.md`. The "done when" criterion of phase 1 (charger cost equal to `automation.tesla_sessierapport`) is the first thing to check.

### Phase 1 – Calculation core without panel
- Config flow: price entity or fixed rate, P1 import counter, solar choice.
- Device discovery (docs/03) and adding devices through the options flow (temporary, until the panel exists).
- Engine: counter steps, resets, solar/grid split, time-weighted price (docs/02).
- Sessions: from usage, from an entity, continuous.
- Sensors per device: cost today, cost this month, last session (with attributes for kWh, solar, grid, start, and end).
- Storage and surviving a restart.
- Tests with the test cases from docs/02 §7.
- Done when: the charger cost in Home Assistant matches `automation.tesla_sessierapport`, and the washer sessions match reality.

### Phase 2 – Panel (read only)
- **Dashboard**, **Sessions**, **Baseload**, **Devices** (docs/04).
- Light and dark through the Home Assistant theme, narrow screens, accessibility.

### Phase 3 – Add a device in the panel
- Wizard with **Sources**, **Data check**, and mark an example.
- Recalculation on the recorder history.
- Repairs notifications.

### Later
- Read WashData events, dishwasher and air fryer profiles.
- Comparison with the supplier where it reports session cost.
- Publish in the HACS default catalog.

## Decisions made
| Decision | Why |
|---|---|
| Custom integration with its own panel, not an app or add-on | Works on every installation, panel in the sidebar |
| Energy from kWh counters, power only as fallback | Proven deviations with slowly refreshed power (docs/02 §7) |
| Solar/grid per measurement step through P1 import | Matches what is billed; no phantom solar |
| Solar choice applies to all devices | One understandable setting; supplier-specific comparison only for charging sessions |
| Each device its own series + "Rest of the house" | Nothing is merged that the user does not set up; total = whole house |
| Suggestions with a reason, the user chooses | Transparency, works for every brand |

## Open questions
- ~~GitHub repo: name and account~~ → https://github.com/Radeaus/Energydash
- Test environment: a separate test Home Assistant on Proxmox, or directly on the production Home Assistant?
- Final integration name/domain: `energydash` (Dutch) or an English name for wider publication?
- Export compensation: from the same price entity (bare price) or choose a separate entity?
- Include gas (heating is now electric, hot water is still gas)?
- Should "Baseload" count continuous devices (server) or show them separately? (prototype: explained separately)

## Cleanup in the production Home Assistant (after phase 1)
After switching to the integration, these helpers and entities are no longer needed:
- Template sensors `sensor.tesla_laadvermogen_uit_zon`, `sensor.tesla_laadvermogen_uit_net`, `sensor.tesla_netkosten_vermogen`.
- Integration sensors `sensor.tesla_energie_uit_zon_totaal`, `sensor.tesla_energie_uit_net_totaal`, `sensor.tesla_netkosten_totaal`.
- `input_number.tesla_sessie_zon_start`, `_net_start`, `_netkosten_start`.

The automation no longer uses them since October 22, 2026.

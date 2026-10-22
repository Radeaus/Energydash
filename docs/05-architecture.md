# 05 – Architecture

## Form
Energydash is a custom integration. It is not a Home Assistant app or add-on: those run as a separate container and need the Supervisor. The integration provides its own sidebar panel and works on every installation type (OS, Container, Core). It is distributed through HACS as a custom repository, and possibly later through the default catalog.

## Repository structure (proposal)
```
Energydash/
├── hacs.json
├── README.md
├── custom_components/energydash/
│   ├── __init__.py          # setup/unload, panel + static path, services, cleanup on removal
│   ├── manifest.json        # dependencies: http, frontend, panel_custom, websocket_api, recorder; after: energy
│   ├── const.py             # PURE
│   ├── price.py             # PURE: read forecast (+ scale correction), time-weighted price, fixed rate
│   ├── engine.py            # PURE: counter step, reset, solar/grid split, step per quarter hour, cost per solar choice
│   ├── sessions.py          # PURE: sessions from usage / from entity, suggest thresholds
│   ├── tracker.py           # PURE: per device P1 baseline, sessions, integrate power; HouseTracker
│   ├── aggregate.py         # PURE: hourly buckets per series, sessions, dashboard/baseload queries
│   ├── replay.py            # PURE: run recorder history through the trackers (recalculation)
│   ├── discovery_rules.py   # PURE: filters and type suggestion (docs/03)
│   ├── discovery.py         # Home Assistant: find meters, data check, session preview, quick start
│   ├── onboarding.py        # PURE: quick start, suggestion → device + verdict (docs/03)
│   ├── backfill.py          # PURE: convert hourly statistics from before the recorder window
│   ├── longterm.py          # PURE: session event payload, rows for the long-term statistics
│   ├── history.py           # Home Assistant: fetch recorder history (compact format) and hourly statistics
│   ├── coordinator.py       # Home Assistant: state listeners, timers, prices, saving, recalculation, resets
│   ├── storage.py           # Home Assistant: Store (config / recent / archive)
│   ├── sensor.py            # per device: cost today/month, last session; house, rest, baseload
│   ├── websocket.py         # API for the panel
│   ├── config_flow.py       # installation (confirm only), reconfigure with clearing
│   ├── settings.py          # validate settings from the panel; export choice, storage, multiple counters
│   ├── logbook.py           # logbook text for `energydash_session_ended`
│   ├── diagnostics.py
│   ├── services.yaml, icons.json, translations/{en,nl}.json (custom integrations do not use strings.json)
│   └── frontend/energydash-panel.js   # bundled output of /frontend
├── frontend/                # TypeScript + Lit, bundled with esbuild
│   └── src/panel.ts, views.ts, dialogs.ts, onboarding.ts, components.ts, api.ts, i18n.ts, format.ts, styles.ts
└── tests/                   # run without Home Assistant (conftest loads the pure modules)
    ├── test_engine.py       # test cases from docs/02 §7, prices, tracker, restart
    ├── test_replay.py       # recalculation: charger with solar, washer with pump-out, house
    ├── test_discovery.py    # filters on the scan of the production Home Assistant
    ├── test_onboarding.py   # quick start: build device, check off, duplicate charger
    └── test_longterm.py     # session event payload, statistic rows with running sum
```

## Register the panel
From `__init__.py` with `panel_custom.async_register_panel()`:
- `webcomponent_name`: `energydash-panel`
- `frontend_url_path`: `energydash`
- `sidebar_title`: `Energydash`, `sidebar_icon`: for example `mdi:cash-clock`
- `module_url`: the bundled JS file through a registered static path
- `require_admin`: `false` for viewing; settings only for admins (checked in the websocket handlers)
- Register once, also with multiple config entries, and remove it again on unload.

The panel receives `hass`, `narrow`, `route`, and `panel`. It must provide its own header with a menu button for narrow screens. Home Assistant requires this for custom panels.

## Websocket API (proposal)
| Command | Purpose |
|---|---|
| `energydash/config` | Read settings (price, P1, solar choice) |
| `energydash/discover` | Suggested devices + reasons |
| `energydash/suggest` | Quick start: every meter found as a ready-made device, with summary and verdict (admin) |
| `energydash/devices/save_many` | Save multiple new devices and recalculate them together (admin) |
| `energydash/devices/list` / `save` / `delete` | Manage devices |
| `energydash/quality` | Data check for a chosen source |
| `energydash/preview_sessions` | History of a source + detected sessions at given thresholds (for "mark an example") |
| `energydash/sessions` | Sessions with breakdown per quarter hour |
| `energydash/summary` | Dashboard data per period: calendar week (up to and including today), month, or year; per device, rest, solar/grid, export, per hour; per day also `solar` (self-used kWh and the grid cost it saved, export kWh and earnings) |
| `energydash/baseload` | Baseload and breakdown |
| `energydash/subscribe` | Live updates to the panel |
| `energydash/settings/save` | Save price, meters, solar, and export (admin); with `recalculate: true` everything is recalculated afterwards |
| `energydash/analyze` | Data check + suggested type, thresholds, and session states |
| `energydash/recalculate` | Recalculate one device or everything (admin) |
| `energydash/steps` | Latest measurement steps of a device (for checking) |
| `energydash/reset` | `data` (clear the figures and recalculate everything right away) or `all` (devices and figures; the house is recalculated right away) (admin) |
| `energydash/export` / `import` | Devices and settings as JSON (admin) |

In 1.0, `energydash/quality` is called `energydash/analyze`, and `sessions/list`/`get` is a single command `energydash/sessions`.

## Settings (config entry, `data` + `options`)
| Key | Value |
|---|---|
| `contract` | `dynamic` (price from an entity), `fixed` (fixed price), or `null` (not chosen yet) |
| `price_entity`, `price_markup`, `price_vat` | price entity, markup per kWh (0 = the entity is the full price), and VAT in percent over both (empty = 0) |
| `price_normal`, `price_low` | fixed price; `price_low` empty = a single price |
| `low_start`, `low_end`, `low_weekend` | low tariff from `"23:00"` to `"07:00"`, and all weekend; empty = these defaults |
| `import_entity`, `export_entity`, `solar_entity`, `battery_charge_entity`, `battery_discharge_entity` | list of entity IDs (a single string also works, from older settings); counters are added up. The battery needs both or neither |
| `solar_mode` | `export`, `free`, or `grid` |
| `export_price_mode` | `same`, `auto`, `entity`, or `fixed`; empty = old behavior (see 02-calculation-method) |
| `export_price_entity`, `export_price_fixed` | with `entity` and `fixed` |

## Data
- Live: state change listeners on the chosen counters, P1 import, and session entities. Each counter step goes to the engine, then to storage.
- Recalculation: when you add a device, the recorder history (about 10 days by default) of the counter, P1, and price is fetched and run through the same engine. Before that, up to a year back, the long-term hourly statistics are used (`backfill.py`, see docs/02 §7): cost per hour, no sessions.
- Storage: `Store` with version and migrations, in three files. `energydash.config` holds the devices. `energydash.data` holds the last 35 days, tracker state, and open sessions; it is written at most every 5 minutes and always on shutdown. `energydash.archive` holds older data and is written about once a day. This keeps the write load low on an SD card.
- Results are kept per series (device, `_house`) in local hourly buckets with five fields: kWh, solar kWh, grid cost, cost-all-grid, and solar export value. The solar choice is only applied when the data is requested, so switching also works for the past. The `_export` series keeps the export per hour: kWh in the first field, the revenue at the export price in the last. Produced = self-used (solar kWh of `_house`) + export.
- Sensors use `state_class`/`device_class: monetary`, so Home Assistant keeps long-term statistics itself.
- External statistics: per device, `_house`, and `_rest`, the hourly cost (`energydash:cost_<id>`, in the Home Assistant currency) and energy (`energydash:energy_<id>`, kWh), each with a running sum. Statistic ids allow no leading underscore, so `_house` becomes `energydash:cost_house`. After every recalculation all stored hours are written again, so corrections reach the past; every hour the last 3 completed hours are written. Removing a device without history, **Reset Energydash**, and importing settings clear them. `STATS_VERSION` in `coordinator.py` writes everything again once after an update.
- Price units: `price.unit_factor` converts the price entity's unit; `energydash/config` returns it in `status` (`price_unit`, `price_factor`), plus `price_from_action` when the forecast comes from an action (`coordinator._async_fetch_action_prices`).
- Repairs: `missing_entity` (an entity in use no longer exists) and `net_meter` (the import counter went down several times in 2 days, checked daily).
- Event `energydash_session_ended` when a live session ends (not during a recalculation): `device_id`, `device_name`, `session_id`, `start`, `end`, `duration_min`, `kwh`, `solar_kwh`, `grid_kwh`, `cost`, `grid_cost`, `cost_all_grid`, and `price_per_kwh`. `cost` uses the solar choice, like the **Last session** sensor.

## Quality
- Calculation core without Home Assistant dependencies, for fast unit tests.
- `pytest-homeassistant-custom-component` for the config flow and integration.
- Hassfest and HACS validation in GitHub Actions.
- Run on a test Home Assistant first (VM on Proxmox), then on the production Home Assistant.

## Sources
- Custom panels: https://contributors.home-assistant.io/frontend/custom-ui/panel/
- Theming and tokens: https://contributors.home-assistant.io/frontend/architecture/theming/
- Publishing (HACS/Marketplace): https://contributors.home-assistant.io/marketplace/
- Building integrations: https://contributors.home-assistant.io/core/

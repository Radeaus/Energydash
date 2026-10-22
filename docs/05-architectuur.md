# 05 – Architectuur

## Vorm
Een **custom integration** (geen HA "App"/add-on: die draaien als aparte container en vereisen de Supervisor). De integratie levert een eigen **zijbalkpaneel** en werkt op elke installatie (OS, Container, Core). Distributie via **HACS** (custom repository, later eventueel de standaardcatalogus).

## Repo-structuur (voorstel)
```
Energydash/
├── hacs.json
├── README.md
├── custom_components/energydash/
│   ├── __init__.py          # setup/unload, paneel + static path, services, opruimen bij verwijderen
│   ├── manifest.json        # dependencies: http, frontend, panel_custom, websocket_api, recorder; after: energy
│   ├── const.py             # PUUR
│   ├── price.py             # PUUR: forecast lezen (+ schaalcorrectie), tijdgewogen prijs, vast tarief
│   ├── engine.py            # PUUR: tellerstap, reset, zon/net-split, stap per kwartier, kosten per zonkeuze
│   ├── sessions.py          # PUUR: sessies uit verbruik / uit entiteit, drempels voorstellen
│   ├── tracker.py           # PUUR: per apparaat P1-basis, sessies, vermogen integreren; HouseTracker
│   ├── aggregate.py         # PUUR: uurbuckets per reeks, sessies, dashboard/sluipverbruik-queries
│   ├── replay.py            # PUUR: recorder-historie door de trackers halen (terugrekenen)
│   ├── discovery_rules.py   # PUUR: filters en soort-voorstel (docs/03)
│   ├── discovery.py         # HA: meters vinden, gegevenscheck, sessievoorbeeld, snelle start
│   ├── onboarding.py        # PUUR: snelle start, voorstel → apparaat + oordeel (docs/03)
│   ├── backfill.py          # PUUR: uurstatistieken van vóór de recorder omrekenen
│   ├── history.py           # HA: recorder-historie (compact formaat) en uurstatistieken ophalen
│   ├── coordinator.py       # HA: state listeners, timers, prijzen, opslaan, terugrekenen, resets
│   ├── storage.py           # HA: Store (config / recent / archief)
│   ├── sensor.py            # per apparaat: kosten vandaag/maand, laatste sessie; huis, rest, sluipverbruik
│   ├── websocket.py         # API voor het paneel
│   ├── config_flow.py       # installatie (alleen bevestigen), reconfigure met wissen
│   ├── settings.py          # instellingen uit het paneel controleren; terugleverkeuze, opslag, meerdere tellers
│   ├── diagnostics.py
│   ├── services.yaml, icons.json, strings.json, translations/{nl,en}.json
│   └── frontend/energydash-panel.js   # gebundelde output van /frontend
├── frontend/                # TypeScript + Lit, gebundeld met esbuild
│   └── src/panel.ts, views.ts, dialogs.ts, onboarding.ts, components.ts, api.ts, i18n.ts, format.ts, styles.ts
└── tests/                   # draaien zonder Home Assistant (conftest laadt de pure modules)
    ├── test_engine.py       # testcases uit docs/02 §7, prijzen, tracker, herstart
    ├── test_replay.py       # terugrekenen: laadpaal met zon, wasmachine met wegpompen, huis
    ├── test_discovery.py    # filters op de scan van de eigen HA
    └── test_onboarding.py   # snelle start: apparaat bouwen, aanvinken, dubbele laadpaal
```

## Paneel registreren
Vanuit `__init__.py` met `panel_custom.async_register_panel()`:
- `webcomponent_name`: `energydash-panel`
- `frontend_url_path`: `energydash`
- `sidebar_title`: `Energydash`, `sidebar_icon`: bijv. `mdi:cash-clock`
- `module_url`: het gebundelde JS-bestand via een geregistreerd static path
- `require_admin`: `false` voor bekijken; instellingen alleen voor admins (check in de websocket-handlers)
- Eén keer registreren (ook bij meerdere config entries), en weer verwijderen bij unload.

Het paneel krijgt `hass`, `narrow`, `route` en `panel`. Het moet zelf een kopbalk met menuknop leveren voor smalle schermen (eis van HA voor custom panels).

## Websocket-API (voorstel)
| Commando | Doel |
|---|---|
| `energydash/config` | Instellingen (prijs, P1, zonkeuze) lezen |
| `energydash/discover` | Voorgestelde apparaten + redenen |
| `energydash/suggest` | Snelle start: elke gevonden meter als kant-en-klaar apparaat, met samenvatting en oordeel (beheerder) |
| `energydash/devices/save_many` | Meerdere nieuwe apparaten opslaan en samen terugrekenen (beheerder) |
| `energydash/devices/list` / `save` / `delete` | Apparaten beheren |
| `energydash/quality` | Gegevenscheck voor een gekozen bron |
| `energydash/preview_sessions` | Historie van een bron + gedetecteerde sessies bij gegeven drempels (voor "voorbeeld aanwijzen") |
| `energydash/sessions` | Sessies met opbouw per kwartier |
| `energydash/summary` | Dashboarddata per periode: kalenderweek (tot en met vandaag), maand of jaar; per apparaat, rest, zon/net, teruglevering, per uur |
| `energydash/baseload` | Sluipverbruik en uitsplitsing |
| `energydash/subscribe` | Live updates naar het paneel |
| `energydash/settings/save` | Prijs, meters, zon en teruglevering opslaan (beheerder); met `recalculate: true` daarna alles opnieuw berekenen |
| `energydash/analyze` | Gegevenscheck + voorgestelde soort, drempels en sessiestatussen |
| `energydash/recalculate` | Eén apparaat of alles opnieuw berekenen (beheerder) |
| `energydash/steps` | Laatste meetstappen van een apparaat (controle) |
| `energydash/reset` | `data` (cijfers wissen en alles direct opnieuw berekenen) of `all` (apparaten en cijfers; het huis wordt direct opnieuw berekend) (beheerder) |
| `energydash/export` / `import` | Apparaten en instellingen als JSON (beheerder) |

In 1.0 heet `energydash/quality` `energydash/analyze`, en `sessions/list`/`get` is één commando `energydash/sessions`.

## Instellingen (config entry, `data` + `options`)
| Sleutel | Waarde |
|---|---|
| `contract` | `dynamic` (prijs uit een entiteit), `fixed` (vaste prijs) of `null` (nog niet gekozen) |
| `price_entity`, `price_markup` | prijs-entiteit en opslag per kWh (0 = de entiteit is de hele prijs) |
| `price_normal`, `price_low` | vaste prijs; `price_low` leeg = één prijs |
| `import_entity`, `export_entity`, `solar_entity` | lijst met entity-id's (ook één string, uit oudere instellingen); tellers worden opgeteld |
| `solar_mode` | `export`, `free` of `grid` |
| `export_price_mode` | `same`, `auto`, `entity` of `fixed`; leeg = oud gedrag (zie 02-rekenmethode) |
| `export_price_entity`, `export_price_fixed` | bij `entity` en `fixed` |

## Gegevens
- **Live**: state-change listeners op gekozen tellers, P1-import en sessie-entiteiten. Elke tellerstap → engine → opslag.
- **Terugrekenen**: bij toevoegen van een apparaat de recorder-historie (standaard ~10 dagen) van teller, P1 en prijs ophalen en dezelfde engine draaien. Daarvoor, tot een jaar terug, de langetermijnstatistieken per uur (`backfill.py`, zie docs/02 §7): kosten per uur, geen sessies.
- **Opslag**: `Store` met versie en migraties, in drie bestanden: `energydash.config` (apparaten), `energydash.data` (laatste 35 dagen, trackerstatus, open sessies; hooguit elke 5 minuten geschreven en altijd bij afsluiten) en `energydash.archive` (ouder, ongeveer dagelijks). Zo blijft de schrijfbelasting laag op een SD-kaart.
- **Resultaten** worden per reeks (apparaat, `_house`) in lokale uurbuckets bewaard met vijf velden: kWh, zon-kWh, netkosten, kosten-alles-net en zon-terugleverwaarde. De zonkeuze wordt pas bij het opvragen toegepast, dus wisselen werkt ook voor het verleden. De reeks `_export` bewaart per uur de teruglevering: kWh in het eerste veld, de opbrengst tegen de terugleverprijs in het laatste; opgewekt = zelf gebruikt (zon-kWh van `_house`) + teruglevering.
- **Sensoren** met `state_class`/`device_class: monetary` zodat HA zelf langetermijnstatistieken bijhoudt.

## Kwaliteit
- Rekenkern zonder HA-afhankelijkheden → snelle unit tests.
- `pytest-homeassistant-custom-component` voor config flow en integratie.
- Hassfest en HACS-validatie in GitHub Actions.
- Eerst draaien op een test-HA (VM op Proxmox), dan op de eigen HA.

## Bronnen
- Custom panels: https://contributors.home-assistant.io/frontend/custom-ui/panel/
- Theming en tokens: https://contributors.home-assistant.io/frontend/architecture/theming/
- Publiceren (HACS/Marketplace): https://contributors.home-assistant.io/marketplace/
- Integraties bouwen: https://contributors.home-assistant.io/core/

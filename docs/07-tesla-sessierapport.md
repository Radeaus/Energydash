# 07 – Bestaande automation: Tesla – sessierapport

`automation.tesla_sessierapport` in de eigen HA gebruikt sinds 22 oktober 2026 dezelfde rekenmethode als de integratie. Het is daarmee de eerste "productie"-test van de engine. Volledige export: `../referentie/automation-tesla-sessierapport.yaml`.

## Wat er mis was (tot 22 okt)
- Template-sensoren rekenden `zon = min(max(laadvermogen − P1, 0), laadvermogen)` en `net = laadvermogen − zon`, en integratie-helpers (Riemann, links) telden dat op.
- `sensor.charge_laadpaal_laadpaalvermogen` ververst elke 5 minuten (Zonneplan-cloud), de P1 elke seconde.
- Gevolg: energie gemist bij elke start, "spookzon" bij elke stop, en een kWh-afwijking ten opzichte van de laadpaal (−1,5 kWh op 20–21 okt).

## Hoe het nu werkt
Triggers:
- `kwh`: elke wijziging van `sensor.charge_laadpaal_laadpaal_energie_geleverd_sessie`.
- `basis`: elke 5 minuten de P1-basis verversen zolang de status niet `Charging` is.
- `start`: `VehicleDetected` of kabel aan → begintijd; tellers leeg als er nog niets geladen is.
- `kosten`: Zonneplan's `sessiekosten` bewaren ter vergelijking.
- `einde`: `Standby` of kabel uit → push en tellers leeg.

Meetstap (`kwh`):
1. `dE = nieuw − vorig` (of `nieuw` bij een reset).
2. `dI = P1_import_nu − P1_import_vorig`.
3. `net = min(dE, dI)`, `zon = dE − net`.
4. `prijs` = tijdgewogen gemiddelde van de kwartierprijzen in het forecast-attribuut van `sensor.zonneplan_current_quarter_hourly_electricity_tariff` over `[t0, t1]`.
5. Optellen in `input_number.tesla_sessie_zon_kwh`, `_net_kwh`, `_netkosten`, `_kosten_alles_net`.
6. `laatste_kwh`, `meting_import_vorig`, `meting_tijd_vorig` bijwerken.

Push bij einde:
```
Tesla: 49,9 kWh geladen, accu 80%
☀️ Zon: 0,0 kWh (0%)
🔌 Net: 49,9 kWh (100%) voor €17,33
💶 Zonneplan: €15,98 · alle kWh × kwartierprijs: €17,33
⚠️ Zonneplan wijkt €1,35 af van de kwartierprijzen
```

## Helpers
| Helper | Doel |
|---|---|
| `input_number.tesla_sessie_zon_kwh` | Zon deze sessie (kWh) |
| `input_number.tesla_sessie_net_kwh` | Net deze sessie (kWh) |
| `input_number.tesla_sessie_netkosten` | Netkosten deze sessie (€) |
| `input_number.tesla_sessie_kosten_alles_net` | Alle kWh × kwartierprijs (€), ter controle |
| `input_number.tesla_sessie_laatste_kwh` | Laatste tellerstand van de laadpaal |
| `input_number.tesla_sessie_laatste_zonneplan_kosten` | Laatste sessiekosten volgens Zonneplan |
| `input_number.tesla_meting_import_vorig` | P1-importstand bij de vorige meetstap |
| `input_datetime.tesla_meting_tijd_vorig` | Tijd van de vorige meetstap |
| `input_datetime.tesla_sessie_starttijd` | Begin van de sessie |

## Aandachtspunten
- Variabelen staan in opeenvolgende `variables`-stappen: HA slaat de sleutels van één blok alfabetisch op, en een sleutel die een later gedefinieerde naam leest zou dan leeg zijn.
- Eerste echte test is de eerstvolgende laadsessie: vergelijk de push met de Zonneplan-app.

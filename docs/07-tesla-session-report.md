# 07 – Existing automation: Tesla session report

Since October 22, 2026, `automation.tesla_sessierapport` in the production Home Assistant uses the same calculation method as the integration. That makes it the first "production" test of the engine. Full export: `../referentie/automation-tesla-sessierapport.yaml`.

## What was wrong (until October 22)
- Template sensors calculated `zon = min(max(laadvermogen − P1, 0), laadvermogen)` and `net = laadvermogen − zon`, and integration helpers (Riemann, left) added that up.
- `sensor.charge_laadpaal_laadpaalvermogen` refreshes every 5 minutes (Zonneplan cloud), the P1 every second.
- Result: energy missed at every start, phantom solar at every stop, and a kWh deviation compared to the charger (−1.5 kWh on October 20–21).

## How it works now
Triggers:
- `kwh`: every change of `sensor.charge_laadpaal_laadpaal_energie_geleverd_sessie`.
- `basis`: refresh the P1 baseline every 5 minutes as long as the status is not `Charging`.
- `start`: `VehicleDetected` or cable connected → start time; counters cleared if nothing has been charged yet.
- `kosten`: keep Zonneplan's `sessiekosten` for comparison.
- `einde`: `Standby` or cable disconnected → push notification and counters cleared.

Measurement step (`kwh`):
1. `dE = nieuw − vorig` (or `nieuw` on a reset).
2. `dI = P1_import_nu − P1_import_vorig`.
3. `net = min(dE, dI)`, `zon = dE − net`.
4. `prijs` = time-weighted average of the quarter-hour prices in the forecast attribute of `sensor.zonneplan_current_quarter_hourly_electricity_tariff` over `[t0, t1]`.
5. Add up in `input_number.tesla_sessie_zon_kwh`, `_net_kwh`, `_netkosten`, `_kosten_alles_net`.
6. Update `laatste_kwh`, `meting_import_vorig`, `meting_tijd_vorig`.

Push notification at the end (the automation sends this text in Dutch):
```
Tesla: 49,9 kWh geladen, accu 80%
☀️ Zon: 0,0 kWh (0%)
🔌 Net: 49,9 kWh (100%) voor €17,33
💶 Zonneplan: €15,98 · alle kWh × kwartierprijs: €17,33
⚠️ Zonneplan wijkt €1,35 af van de kwartierprijzen
```

## Helpers
| Helper | Purpose |
|---|---|
| `input_number.tesla_sessie_zon_kwh` | Solar this session (kWh) |
| `input_number.tesla_sessie_net_kwh` | Grid this session (kWh) |
| `input_number.tesla_sessie_netkosten` | Grid cost this session (€) |
| `input_number.tesla_sessie_kosten_alles_net` | All kWh × quarter-hour price (€), for checking |
| `input_number.tesla_sessie_laatste_kwh` | Last counter reading of the charger |
| `input_number.tesla_sessie_laatste_zonneplan_kosten` | Last session cost according to Zonneplan |
| `input_number.tesla_meting_import_vorig` | P1 import reading at the previous measurement step |
| `input_datetime.tesla_meting_tijd_vorig` | Time of the previous measurement step |
| `input_datetime.tesla_sessie_starttijd` | Start of the session |

## Points of attention
- Variables are in consecutive `variables` steps. Home Assistant stores the keys of a single block alphabetically, so a key that reads a name defined later would be empty.
- The first real test is the next charging session: compare the push notification with the Zonneplan app.

# 03 – Entiteiten automatisch herkennen

De integratie stelt apparaten en bronnen voor; de gebruiker beslist. Elk voorstel zegt waarop het gebaseerd is.

## Signalen

| Signaal | Bron in HA | Betekenis |
|---|---|---|
| `device_class` | state attributes / entity registry | `energy` = kWh-teller, `power` = vermogen |
| `unit_of_measurement` | state attributes | kWh/Wh/MWh resp. W/kW |
| `state_class` | state attributes | `total_increasing`/`total` = bruikbare teller; ontbreekt = voorspelling of afgeleide waarde |
| Energy-dashboardvoorkeuren | `energy/get_prefs` | `energy_sources` (net, zon, gas) en `device_consumption` met `stat_consumption` en optioneel `stat_rate` (het bijbehorende vermogen) |
| Apparaat en ruimte | device/area registry | Teller en vermogen van dezelfde stekker koppelen, naam en ruimte tonen |
| Historie | recorder | Verversingsfrequentie, onderbrekingen, patroon (sessies vs. doorlopend) |

## Volgorde van voorstellen
1. **Energy-dashboard `device_consumption`**: deze apparaten heeft de gebruiker al benoemd. Neem naam, teller en (indien aanwezig) `stat_rate` over.
2. **Overige `energy`-tellers met `total_increasing`** die aan een apparaat hangen en niet al gebruikt worden.
3. **Alleen vermogen** (`power` zonder bijbehorende teller op hetzelfde apparaat): tonen met waarschuwing "Alleen vermogen".

## Filters (niet voorstellen)
- Tellers die als **net** (`stat_energy_from`/`stat_energy_to`) of **zon** in de energy-sources staan (P1, omvormer).
- **Periodieke tellers** (vandaag/deze week/deze maand/dit jaar). Herkennen aan resets op vaste momenten in de historie, en als hulpsignaal aan naamdelen (`today`, `vandaag`, `this_month`, …).
- Sensoren **zonder `state_class`** (forecasts, berekende waarden).
- **Dubbelingen** van dezelfde fysieke meting (bijvoorbeeld HomeKit-bridges, cloud-kopieën van lokale data): zelfde waarde/verloop als een al gekozen teller.
- Eigen hulpsensoren van de gebruiker die van andere tellers zijn afgeleid (integration/template-helpers), tenzij expliciet gekozen.

## Soort voorstellen uit de historie (laatste 7 dagen)
- **Doorlopend**: nooit onder een drempel (bijv. server nooit < 30 W), of wisselend zonder duidelijke aan/uit-cycli (airco).
- **Sessies**: herhaaldelijk aan → standby, met duidelijke blokken (wasmachine 5× in 7 dagen, 80–95 min).
- **Laadpaal**: naam/apparaat bevat "laadpaal"/"charger"/"wallbox"/"EVSE", of meerdere keren > 1 uur boven 7 kW.

## Snelle start (`onboarding.py`, `energydash/suggest`)
Voor elke gevonden meter (maximaal 20) draait dezelfde analyse als in de wizard: soort, sessie-entiteit en statussen (laadpaal), drempels en "Klaar na" uit 7 dagen historie, en het sessievoorbeeld. Het resultaat is een kant-en-klaar apparaat plus een oordeel.

| Oordeel | Wanneer | Aangevinkt |
|---|---|---|
| `in_prefs` | In het Energy-dashboard, data in orde | ja |
| `device` | Teller van een apparaat (stekker), niet in het Energy-dashboard, met historie en sessies | ja |
| `no_history` / `no_sessions` | Nog geen historie, of sessie-apparaat zonder sessies in 7 dagen | alleen als in het Energy-dashboard |
| `power_only` | Alleen vermogen | nee |
| `in_car` | Teller in de auto (laadverlies telt niet, laden onderweg wel) | nee |
| `data` | Gegevenscheck met "niet aanbevolen" | nee |
| `loose` | Hoort niet bij een apparaat en staat niet in het Energy-dashboard | nee |
| `duplicate_charger` | Tweede laadpaal-teller naast een aangevinkte (meet dezelfde sessies) | nee |

Een laadpaal krijgt sessies uit een status-entiteit als er statussen zijn waarin de teller opliep én er een status overblijft waarin geen sessie loopt ("on" en "off" samen telt niet). De snelle start probeert maximaal drie entiteiten. Verbindingsstatussen (`connectivity`, "verbinding", "online", …) staan in elke lijst onderaan: die zeggen of het apparaat bereikbaar is, niet of het laadt. Lukt het niet, dan sessies uit het verbruik met "Klaar na" minstens 60 minuten. Doorlopende apparaten tonen het gemiddelde uit de teller (kWh per dag), niet uit de grafiekreeks.

## Gegevenscheck (per gekozen bron)
Wordt getoond in de wizard en bij het apparaat. Elke regel: status (ok / beperking / niet aanbevolen), waarde, gevolg in gewone taal.

| Check | Voorbeeld ok | Voorbeeld beperking |
|---|---|---|
| Eenheid en soort | kWh, `total_increasing` | W: "dan wordt de kWh uit het vermogen berekend" |
| Soort teller | loopt altijd op | begint per sessie op 0 (herkend, geen probleem) |
| Verversing (gemeten) | elke ~10 s | elke ~5 min: "begin/einde tot 5 min onnauwkeurig" |
| Onderbrekingen | geen | 2× onbeschikbaar: "overbrugd" |
| Wat het meet | – | auto-teller: "laadverlies telt niet mee" |
| Sessie-entiteit | status, ververst ~5 min | kabel-sensor in rust elke 30 min: "begintijd kan te laat zijn" |

Problemen die later ontstaan (sensor vaak onbeschikbaar, teller verdwenen) → melding via HA **Reparaties** (`issue_registry`), alleen als de gebruiker er iets aan kan doen.

## Resultaat op de eigen HA (scan 22 oktober 2026)
52 energie- en 25 vermogenssensoren gevonden. Na filters blijven 6 apparaten over:

| Apparaat | Teller | Vermogen | Herkomst |
|---|---|---|---|
| Wasmachine | `sensor.zolder_wasmachine_energy_import` | `sensor.zolder_wasmachine_vermogen` | Energy-dashboard |
| Server | `sensor.zolder_server_energy_import` | `sensor.zolder_server_vermogen` | Energy-dashboard |
| Laadpaal | `sensor.charge_laadpaal_laadpaal_energie_geleverd_sessie` | `sensor.charge_laadpaal_laadpaalvermogen` | Energy-dashboard |
| Airco Woonkamer | `sensor.woonkamer_woonkamer_airco_mitsubishi_energieverbruik_totaal` | – | Energy-dashboard |
| Airco Slaapkamer | `sensor.slaapkamer_slaapkamer_airco_mitsubishi_energieverbruik_totaal` | – | Energy-dashboard |
| Droger | `sensor.zolder_droger_energy_import` | `sensor.zolder_droger_vermogen` | Energy Socket op zolder, **niet** in Energy-dashboard |

Alternatieve bronnen voor de laadpaal: `sensor.controlekamer_tesla_model_3_charge_energy_added` (meet in de auto, zonder laadverlies), sessie-entiteiten `sensor.charge_laadpaal_laadpaalstatus` (aanbevolen) of `binary_sensor.controlekamer_tesla_model_3_oplaadkabel` (in rust maar elke 30 min ververst).

Volledige lijst: `../referentie/ha-scan-2026-10-22.md`.

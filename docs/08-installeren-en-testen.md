# 08 – Installeren en testen

Deze handleiding hoort bij versie 1.0.0. Eerst installeren, dan het testplan, dan wat je moet doen als je opnieuw wilt beginnen.

## 1. Voorbereiden (eenmalig)

1. **Maak een back-up** van de HA waarop je gaat testen: *Instellingen › Systeem › Back-ups › Back-up maken*. Op de test-VM is dat je "schone" startpunt; zet daarna ook een Proxmox-snapshot.
2. De code staat op GitHub: https://github.com/Radeaus/Energydash (openbaar, want HACS kan geen privé-repo's ophalen). Elke versie is een release met een tag (`v1.0.0`); HACS toont die versies en meldt updates.

## 2. Installeren

### Via HACS (aanbevolen)
1. *HACS* › menu (⋮) › **Aangepaste opslagplaatsen**.
2. Repository: `https://github.com/Radeaus/Energydash`, type **Integratie** › **Toevoegen**.
3. Zoek **Energydash** in HACS › **Downloaden** › kies `v1.0.0`.
4. **Start Home Assistant opnieuw op** (*Instellingen › Systeem › ⏻ › Home Assistant opnieuw opstarten*).

### Handmatig (zonder GitHub, handig op de test-VM)
1. Kopieer de map `custom_components/energydash` naar `/config/custom_components/energydash` op je HA (via de Samba-, SSH- of Studio Code Server-add-on).
2. Start Home Assistant opnieuw op.

### Instellen
1. *Instellingen › Apparaten en diensten › Integratie toevoegen › Energydash*.
2. **Verzenden** › **Energydash** staat nu in de zijbalk. Open het en kies **Wizard starten**.
3. **Je stroomprijs**: **Prijs uit een entiteit** › `sensor.zonneplan_current_quarter_hourly_electricity_tariff` › **Ja, alles zit erin** (Zonneplan geeft de all-in prijs).
4. **Je meters**: controleer **Import uit het net** (`sensor.p1_meter_energy_import`), **Teruglevering** (`sensor.p1_meter_energie_export`) en **Opwek zonnepanelen** (`sensor.inverter_omvormer_zolder_energy`). Vul die laatste twee in: zonder kan "Rest van het huis" op zonnige dagen niet kloppen.
5. **Zonnestroom en teruglevering**: **Wat je anders had gekregen** en **Uit je prijs-entiteit** (de terugleverprijs staat in de forecast van Zonneplan).
6. **Opslaan en apparaten zoeken**: het huis wordt teruggerekend over de recorder-historie (meestal 10 dagen) en de snelle start toont je apparaten. Vink aan wat je wilt volgen en voeg ze in één keer toe.

> Na het bijwerken via HACS altijd HA opnieuw opstarten. Ververs daarna de browser met Ctrl+F5 als het paneel er nog oud uitziet (de URL van het paneel bevat een versie-hash, dus meestal is dat niet nodig).

## 3. Opnieuw beginnen tijdens het testen

Er zijn vier niveaus, van licht naar zwaar. Allemaal vragen ze eerst om bevestiging.

| Wat je wilt | Waar | Wat er gebeurt |
|---|---|---|
| Eén apparaat opnieuw uitrekenen | Paneel › Apparaten › apparaat › **Opnieuw berekenen** | Resultaten van dat apparaat worden vervangen door een herberekening over de historie. Instellingen blijven. |
| Alles opnieuw uitrekenen | Paneel › ⚙ › Testen en beheer › **Alles opnieuw berekenen** | Idem voor alle apparaten en het hele huis. |
| Cijfers wissen, apparaten houden | ⚙ › **Berekende gegevens wissen** | Sessies en kosten weg, apparaten en prijsinstellingen blijven. Meten begint opnieuw. |
| Terug naar "Nog geen apparaten" | ⚙ › **Energydash terugzetten** | Apparaten en gegevens weg, prijsinstellingen blijven. Je doorloopt "Apparaat toevoegen" opnieuw. |
| De installatie opnieuw doorlopen | *Apparaten en diensten › Energydash › ⋮ › Opnieuw configureren* | Zelfde twee stappen als bij installeren, met de keuze **Gegevens wissen**: alles bewaren, berekende gegevens wissen, of opnieuw beginnen. |
| Helemaal schoon | *Apparaten en diensten › Energydash › ⋮ › Verwijderen* | Verwijdert de integratie **én** alle opgeslagen gegevens (`.storage/energydash.*`). Opnieuw toevoegen begint leeg. |

Tip: **Instellingen exporteren** (⚙) bewaart je apparaten en prijsinstellingen als JSON. Na een reset of herinstallatie zet **Instellingen importeren** alles in één keer terug en rekent daarna alles opnieuw uit. Zo hoef je de wizard niet steeds opnieuw te doorlopen.

De reset en herberekening zijn ook acties voor automations of *Ontwikkelhulpmiddelen › Acties*: `energydash.reset` (`scope: data` of `all`) en `energydash.recalculate` (optioneel `device_id`).

## 4. Testplan

### Zichtbaar maken wat er gebeurt
- **Debuglogboek**: *Apparaten en diensten › Energydash › Debuglogboek inschakelen*. Na het uitschakelen downloadt HA het logbestand.
- **Diagnostiek downloaden** (zelfde menu): instellingen, trackerstatus, de laatste meetstappen per apparaat en de laatste 10 sessies. Voeg dit bestand toe aan een bugmelding.
- **Laatste meetstappen** in de apparaatdialoog: per tellerstap tijd, kWh, P1-import, net, zon, prijs en netkosten. Hiermee controleer je regel 3 en 4 uit de rekenmethode direct.

### Wat te controleren (in deze volgorde)
1. **Installatie**: voorstellen kloppen (P1, export, omvormer, kwartierprijs). In ⚙ staat bij Prijsbron "forecast gevonden in 'forecast'".
2. **Herstart tijdens een sessie**: start de wasmachine, herstart HA halverwege. De sessie moet doorlopen en één sessie blijven (rekenregel 7).
3. **Laadpaal tegen de automation**: na een laadsessie vergelijk je de sessie in Energydash met de push van `automation.tesla_sessierapport`. kWh moet gelijk zijn, kosten binnen een paar cent. Dit is het "klaar als"-criterium uit de roadmap.
4. **Wasmachine en droger**: aantal sessies per dag gelijk aan de werkelijkheid; wegpompen telt niet als aparte sessie.
5. **Zonnige dag**: een apparaat dat midden op de dag draait krijgt zon; 's nachts nooit (geen spookzon).
6. **Zonkeuze wisselen** (⚙): kosten veranderen meteen, ook voor oude sessies; kWh blijven gelijk.
7. **Tellerreset**: de laadpaalteller begint per sessie op 0; in de meetstappen zie je `reset` en geen negatieve stap.
8. **Onbeschikbaar**: zet een stekker even uit; daarna één stap over de hele onderbreking.
9. **Rest van het huis** wordt nergens negatief en "Totaal huis" komt overeen met de kosten van het standaard Energy-dashboard (op een paar procent na: dat dashboard rekent met uurprijzen).
10. **Sluipverbruik** verschijnt na de eerste nacht.
11. **Smal scherm**: open het paneel in de app op je telefoon; tabs staan onderaan, dialogen worden een bottom sheet.
12. **Niet-beheerder**: log in als gewone gebruiker; die kan kijken maar niets wijzigen.

### Bekende beperkingen in 1.0
- Terugrekenen kan alleen over de recorder-historie (standaard 10 dagen); daarvoor zijn er geen gedetailleerde gegevens.
- Twee apparaten die tegelijk draaien krijgen elk `min(dE, dImport)` tegen dezelfde P1-import. Bij veel zon kan de som van hun netstroom dan iets hoger uitvallen dan de P1-import. "Rest van het huis" vangt dat op (nooit negatief).
- De laatste meetstap bij loskoppelen van de laadpaal kan verloren gaan (de sessieteller springt naar 0). Dat geldt ook voor de leverancier zelf.
- De integratie is niet getest tegen de HA-testsuite (`pytest-homeassistant-custom-component`); de rekenkern, het terugrekenen en de herkenning wel (25 tests). Daarom eerst op de test-VM.

## 5. Bijwerken en terug naar een vorige versie
- **Bijwerken**: HACS meldt een nieuwe release › Downloaden › HA opnieuw opstarten.
- **Terug**: HACS › Energydash › ⋮ › **Opnieuw downloaden** › kies de vorige versie › opnieuw opstarten. Het opslagformaat heeft een versienummer; toekomstige versies migreren automatisch, terug naar een oudere versie is alleen veilig binnen dezelfde opslagversie (1).

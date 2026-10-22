# 08 – Installeren en testen

Deze handleiding hoort bij versie 1.0.0 en is bedoeld voor het testen op een aparte test-Home Assistant. Eerst installeren, dan het testplan, dan wat je doet als je opnieuw wilt beginnen.

## Voorbereiden

1. Maak een back-up van de Home Assistant waarop je gaat testen: **Instellingen** > **Systeem** > **Back-ups** > **Back-up maken**. Op de test-VM is dat je schone startpunt. Maak daarna ook een Proxmox-snapshot.
2. De code staat op [GitHub](https://github.com/Radeaus/Energydash). De repository is openbaar, omdat HACS geen privé-repository's kan ophalen. Elke versie is een release met een tag (zoals `v1.0.0`); HACS toont die versies en meldt updates.

## Installeren

### Via HACS

1. Ga in HACS naar het menu (⋮) > **Aangepaste opslagplaatsen**.
2. Vul bij **Repository** `https://github.com/Radeaus/Energydash` in, kies het type **Integratie** en selecteer **Toevoegen**.
3. Zoek **Energydash** in HACS, selecteer **Downloaden** en kies `v1.0.0`.
4. Start Home Assistant opnieuw op: **Instellingen** > **Systeem** > ⏻ > **Home Assistant opnieuw opstarten**.

### Handmatig

Handig op de test-VM, zonder GitHub.

1. Kopieer de map `custom_components/energydash` naar `/config/custom_components/energydash`, bijvoorbeeld met de Samba-, SSH- of Studio Code Server-add-on.
2. Start Home Assistant opnieuw op.

## Instellen

De installatie in Home Assistant vraagt niets. Je stelt alles in het paneel in.

1. Ga naar **Instellingen** > **Apparaten en diensten** > **Integratie toevoegen** en kies **Energydash**.
2. Selecteer **Verzenden**. **Energydash** staat nu in de zijbalk. Open het en selecteer **Wizard starten**.
3. Bij **Je stroomprijs**: kies **Prijs uit een entiteit** en `sensor.zonneplan_current_quarter_hourly_electricity_tariff`. Kies bij **Is dit de prijs die je echt betaalt?** voor **Ja, alles zit erin**, omdat Zonneplan de prijs inclusief belasting en btw geeft.
4. Bij **Je meters**: controleer **Import uit het net** (`sensor.p1_meter_energy_import`), **Teruglevering aan het net** (`sensor.p1_meter_energie_export`) en **Opwek zonnepanelen** (`sensor.inverter_omvormer_zolder_energy`). Vul de laatste twee in: zonder die tellers klopt **Rest van het huis** op zonnige dagen niet.
5. Bij **Zonnestroom en teruglevering**: kies **Wat je anders had gekregen** en daarna **Uit je prijs-entiteit**. De terugleverprijs staat in de forecast van Zonneplan.
6. Selecteer **Opslaan en apparaten zoeken**. Het huis wordt teruggerekend over de historie en de snelle start toont je apparaten. Vink aan wat je wilt volgen en voeg ze in één keer toe.

Na een update via HACS start je Home Assistant altijd opnieuw op. Ziet het paneel er daarna nog oud uit, ververs de browser dan met Ctrl+F5. Meestal is dat niet nodig, omdat de URL van het paneel een versie-hash bevat.

## Opnieuw beginnen tijdens het testen

Er zijn zes niveaus, van licht naar zwaar. Elk niveau vraagt eerst om bevestiging.

- **Eén apparaat opnieuw berekenen**: **Apparaten** > het apparaat > **Opnieuw berekenen**. De resultaten van dat apparaat worden vervangen door een herberekening over de historie. Instellingen blijven.
- **Alles opnieuw berekenen**: **Instellingen** > **Testen en beheer** > **Alles opnieuw berekenen**. Hetzelfde voor alle apparaten en het hele huis.
- **Cijfers wissen, apparaten houden**: **Instellingen** > **Berekende gegevens wissen**. Sessies en kosten verdwijnen, apparaten en prijsinstellingen blijven. Meten begint opnieuw.
- **Terug naar een leeg paneel**: **Instellingen** > **Energydash terugzetten**. Apparaten en gegevens verdwijnen, prijsinstellingen blijven. De snelle start begint opnieuw.
- **Opnieuw instellen in Home Assistant**: **Instellingen** > **Apparaten en diensten** > **Energydash** > ⋮ > **Opnieuw configureren**. Kies bij **Gegevens wissen** tussen **Alles bewaren**, **Berekende gegevens wissen, apparaten bewaren** en **Opnieuw beginnen: apparaten en gegevens verwijderen**.
- **Helemaal schoon**: **Instellingen** > **Apparaten en diensten** > **Energydash** > ⋮ > **Verwijderen**. Dit verwijdert de integratie en alle opgeslagen gegevens (`.storage/energydash.*`). Opnieuw toevoegen begint leeg.

Met **Instellingen exporteren** bewaar je je apparaten en prijsinstellingen als JSON-bestand. Na een reset of herinstallatie zet **Instellingen importeren** alles in één keer terug en rekent daarna alles opnieuw uit. Zo hoef je de snelle start niet steeds opnieuw te doorlopen.

Opnieuw berekenen en terugzetten zijn ook acties, voor automatiseringen of via **Ontwikkelhulpmiddelen** > **Acties**: `energydash.recalculate` (optioneel met `device_id`) en `energydash.reset` (`scope: data` of `scope: all`).

## Testplan

### Zien wat er gebeurt

- **Debuglogboek**: **Instellingen** > **Apparaten en diensten** > **Energydash** > **Debuglogboek inschakelen**. Na het uitschakelen downloadt Home Assistant het logbestand.
- **Diagnostiek downloaden** (in hetzelfde menu): de instellingen, de trackerstatus, de laatste meetstappen per apparaat en de laatste 10 sessies. Voeg dit bestand toe aan een bugmelding.
- **Laatste meetstappen** bij een apparaat: per tellerstap de tijd, kWh, P1-import, net, zon, prijs en netkosten. Hiermee controleer je regel 3 en 4 uit de rekenmethode direct.

### Wat je controleert

Werk deze lijst in volgorde af.

1. **Instellen**: de voorstellen kloppen (P1-meter, teruglevering, omvormer, kwartierprijs). In **Instellingen** toont de prijsbron dat de forecast is gevonden.
2. **Herstart tijdens een sessie**: start de wasmachine en herstart Home Assistant halverwege. De sessie loopt door en blijft één sessie (rekenregel 7).
3. **Laadpaal tegen de automatisering**: vergelijk na een laadsessie de sessie in Energydash met de melding van `automation.tesla_sessierapport`. De kWh zijn gelijk en de kosten wijken hooguit een paar cent af. Dit is het criterium uit de roadmap.
4. **Wasmachine en droger**: het aantal sessies per dag klopt met de werkelijkheid. Wegpompen telt niet als aparte sessie.
5. **Zonnige dag**: een apparaat dat midden op de dag draait krijgt zon, 's nachts nooit.
6. **Zonkeuze wisselen** in **Instellingen**: de kosten veranderen meteen, ook voor oude sessies. De kWh blijven gelijk.
7. **Tellerreset**: de laadpaalteller begint per sessie op 0. In de meetstappen zie je `reset` en geen negatieve stap.
8. **Onbeschikbaar**: haal een stekker even uit het stopcontact. Daarna zie je één stap over de hele onderbreking.
9. **Rest van het huis** wordt nergens negatief, en **Totaal huis** komt op een paar procent na overeen met de kosten in het Energy-dashboard van Home Assistant (dat rekent met uurprijzen).
10. **Sluipverbruik** verschijnt na de eerste nacht.
11. **Smal scherm**: open het paneel in de app op je telefoon. De tabbladen staan onderaan en dialogen openen vanaf de onderkant.
12. **Geen beheerder**: log in als gewone gebruiker. Je kunt kijken, maar niets wijzigen.

## Bekende beperkingen in 1.0

- Terugrekenen in detail kan alleen over de historie die de recorder bewaart (standaard 10 dagen). Daarvoor wordt tot een jaar terug per uur gerekend met de langetermijnstatistieken.
- Twee apparaten die tegelijk draaien, krijgen elk netstroom tegen dezelfde P1-import (`min(dE, dImport)`). Bij veel zon kan de som van hun netstroom iets hoger uitvallen dan de P1-import. **Rest van het huis** vangt dat op en wordt nooit negatief.
- De laatste meetstap bij het loskoppelen van de laadpaal kan verloren gaan, omdat de sessieteller naar 0 springt. Dat geldt ook voor de leverancier zelf.
- De integratie is niet getest met de testsuite van Home Assistant (`pytest-homeassistant-custom-component`). De rekenkern, het terugrekenen en de herkenning wel. Test daarom eerst op de test-VM.

## Bijwerken en terug naar een vorige versie

- **Bijwerken**: HACS meldt een nieuwe release. Selecteer **Downloaden** en start Home Assistant opnieuw op.
- **Terug naar een vorige versie**: HACS > **Energydash** > ⋮ > **Opnieuw downloaden**, kies de vorige versie en start Home Assistant opnieuw op. Het opslagformaat heeft een versienummer. Nieuwe versies zetten oude opslag automatisch om. Terug naar een oudere versie is alleen veilig binnen dezelfde opslagversie (nu 1).

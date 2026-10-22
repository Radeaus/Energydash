# Energydash voor Home Assistant

Energydash is een custom integration voor [Home Assistant](https://www.home-assistant.io/) met een eigen paneel in de zijbalk. Het paneel laat per apparaat zien wat de stroom kost: per wasbeurt, per laadsessie, per dag en aan sluipverbruik. De kosten worden berekend met je eigen dynamische of vaste stroomprijs, en stroom van je zonnepanelen wordt per meetstap apart verrekend.

Zo zie je bijvoorbeeld wat een laadsessie van de auto kostte, hoeveel daarvan uit eigen zon kwam, en welk deel van je rekening bij de rest van het huis hoort.

Huidige versie: 1.0.0 (22 oktober 2026). Wat er in elke versie zit, staat in de [changelog](CHANGELOG.md).

## Ondersteunde apparaten

Energydash werkt met elk apparaat dat in Home Assistant een kWh-teller heeft: een sensor met `device_class: energy` en `state_class: total_increasing` of `total`. Denk aan slimme stekkers, laadpalen, omvormers en de teller in een auto.

Een apparaat met alleen een vermogenssensor (W) werkt ook, maar minder nauwkeurig. De gegevenscheck van het apparaat waarschuwt je dan.

## Voorwaarden

1. Een P1-meter in Home Assistant met een importteller in kWh, zoals `sensor.p1_meter_energy_import`. Hiermee wordt per meetstap bepaald wat uit het net kwam en wat uit eigen zon.
2. Een stroomprijs: een prijs-entiteit (bijvoorbeeld van Zonneplan of Nord Pool, het liefst met een forecast-attribuut met kwartier- of uurprijzen) of een vaste prijs.
3. Bij zonnepanelen: een terugleverteller en het liefst een opwekteller. Zonder die tellers kan **Rest van het huis** op zonnige dagen afwijken.
4. [HACS](https://hacs.xyz/) als je via HACS wilt installeren.

## Installeren

### Via HACS

1. Ga in HACS naar het menu (⋮) > **Aangepaste opslagplaatsen**.
2. Vul bij **Repository** `https://github.com/Radeaus/Energydash` in, kies het type **Integratie** en selecteer **Toevoegen**.
3. Zoek **Energydash** in HACS en selecteer **Downloaden**.
4. Start Home Assistant opnieuw op: **Instellingen** > **Systeem** > ⏻ > **Home Assistant opnieuw opstarten**.

### Handmatig

1. Kopieer de map `custom_components/energydash` naar `/config/custom_components/energydash`, bijvoorbeeld met de Samba-, SSH- of Studio Code Server-add-on.
2. Start Home Assistant opnieuw op.

## Instellen

1. Ga naar **Instellingen** > **Apparaten en diensten** > **Integratie toevoegen** en kies **Energydash**.
2. Selecteer **Verzenden**. De installatie vraagt verder niets; **Energydash** staat nu in de zijbalk.
3. Open **Energydash** en selecteer **Wizard starten**.
4. Kies je stroomprijs: **Prijs uit een entiteit** (met een optionele opslag per kWh, bijvoorbeeld bij een kale beursprijs) of een **Vaste prijs** (één prijs, of normaal- en daltarief). Bij elke keuze zie je een voorbeeld met je eigen prijzen.
5. Controleer je meters. Die worden overgenomen uit je Energy-dashboard: **Import uit het net**, **Teruglevering aan het net** en **Opwek zonnepanelen**.
6. Kies wat stroom van je eigen zonnepanelen kost: **Wat je anders had gekregen** (de terugleverprijs), **Niets** of **Hetzelfde als stroom uit het net**.
7. De snelle start zoekt je stroommeters en bekijkt de historie. Vink aan welke apparaten je wilt volgen en selecteer **Apparaten toevoegen**.

Resultaat: de kosten worden teruggerekend over de historie die Home Assistant heeft bewaard, en het dashboard vult zich.

Wil je een apparaat zelf instellen, kies dan **Geavanceerd instellen** of later **Apparaat toevoegen** op het tabblad **Apparaten**. Daar kies je de meter, de soort apparaat, de bronnen (met een gegevenscheck) en hoe sessies worden herkend, met een voorbeeld over de laatste 7 dagen.

## Instellingen wijzigen

Open **Energydash** > **Instellingen**. Daar staan dezelfde vragen als in de snelle start: stroomprijs, meters en wat zonnestroom kost. Na het opslaan wordt de historie vanzelf opnieuw berekend.

Onder **Testen en beheer** vind je:

- **Alles opnieuw berekenen**: vervangt alle resultaten door een herberekening over de historie. Apparaten en instellingen blijven.
- **Instellingen exporteren** en **Instellingen importeren**: bewaar je apparaten en prijsinstellingen als JSON-bestand en zet ze later in één keer terug.
- **Berekende gegevens wissen**: sessies en kosten weg, apparaten en prijsinstellingen blijven.
- **Energydash terugzetten**: apparaten en gegevens weg, prijsinstellingen blijven.

## Wat Energydash levert

### Paneel

- **Dashboard**: kosten per week, maand en jaar, met de kosten per dag, de gemiddelde stroomprijs, wat je per kWh betaalt en een kaart **Zon** (aandeel eigen zon, opgewekt, teruggeleverd, bespaard). Elk getal heeft een uitleg.
- **Sessies**: elke wasbeurt of laadsessie met energie, kosten, zon en net. **Hoe is dit berekend?** laat de opbouw per kwartier zien.
- **Sluipverbruik**: wat je huis 's nachts gebruikt, per dag, maand en jaar.
- **Apparaten**: je apparaten met kleur, icoon, gegevenscheck en de laatste meetstappen.

Het paneel is in het Nederlands en Engels, volgt het licht of donker thema van Home Assistant en werkt op een telefoon. Alleen beheerders kunnen iets wijzigen.

### Sensoren

Per apparaat:

- **Kosten vandaag**
- **Kosten deze maand**
- **Laatste sessie** (bij apparaten met sessies)

Voor het huis:

- **Kosten hele huis vandaag**
- **Kosten rest van het huis vandaag**
- **Sluipverbruik**

### Acties

- `energydash.recalculate`: rekent opnieuw over de historie. Met `device_id` alleen dat apparaat, zonder alle apparaten en het huis.
- `energydash.reset`: wist berekende gegevens (`scope: data`) of ook alle apparaten (`scope: all`).

Je gebruikt ze in automatiseringen of via **Ontwikkelhulpmiddelen** > **Acties**.

## Zo wordt er gerekend

- Energie komt uit kWh-tellers, niet uit vermogen. Een vermogen dat traag ververst (zoals bij een cloud-laadpaal, elke 5 minuten) mist bij elke start energie en telt bij elke stop zon die er niet was.
- Per meetstap geldt: wat de P1-meter in hetzelfde interval importeerde, kwam uit het net; de rest van het apparaatverbruik is eigen zon. Zon dekt dus eerst de rest van het huis.
- De prijs is tijdgewogen per kwartier: een meetstap over twee kwartieren wordt naar tijd over beide kwartierprijzen verdeeld.
- Elk apparaat is een eigen reeks. Wat niet bij een apparaat hoort, is **Rest van het huis**.
- Alles wordt lokaal in Home Assistant berekend. Er gaat niets naar de cloud.

De volledige rekenmethode, met de controle op echte gegevens, staat in [de rekenmethode](docs/02-rekenmethode.md).

## Gegevens bijwerken

Energydash vraagt niets op bij een externe dienst. Kosten worden bijgewerkt zodra een teller van een apparaat verandert, en het huis elke minuut. De sensoren worden direct bijgewerkt na elke berekening. Open sessies en tussenstanden blijven bewaard bij een herstart van Home Assistant.

## Bekende beperkingen

- Terugrekenen in detail kan alleen over de historie die de recorder bewaart (standaard 10 dagen). Daarvoor wordt tot een jaar terug per uur gerekend met de langetermijnstatistieken.
- Twee apparaten die tegelijk draaien, krijgen elk netstroom tegen dezelfde P1-import. Bij veel zon kan de som van hun netstroom iets hoger uitvallen dan wat de P1-meter importeerde. **Rest van het huis** vangt dat op en wordt nooit negatief.
- De laatste meetstap bij het loskoppelen van een laadpaal kan verloren gaan als de sessieteller direct naar 0 springt.
- Het **Totaal huis** kan een paar procent afwijken van het Energy-dashboard van Home Assistant, omdat dat met uurprijzen rekent.
- Er kan maar één Energydash per Home Assistant worden ingesteld.

## Problemen oplossen

<details>
<summary>Het paneel ziet er na een update nog oud uit</summary>

Je browser toont nog de vorige versie van het paneel.

1. Start Home Assistant opnieuw op na elke update via HACS.
2. Ververs de pagina met Ctrl+F5.

</details>

<details>
<summary>Een melding "Energydash kan … niet vinden" onder Reparaties</summary>

Een entiteit die Energydash gebruikt, bestaat niet meer, bijvoorbeeld na het hernoemen of verwijderen van een apparaat.

1. Open **Energydash** en kies bij het apparaat of in **Instellingen** een andere bron.
2. Of herstel de entiteit in Home Assistant.

</details>

<details>
<summary>Kosten van een apparaat kloppen niet</summary>

1. Open het apparaat op het tabblad **Apparaten** en bekijk de **Gegevenscheck**. Die laat zien of er een kWh-teller is en hoe zon en net worden bepaald.
2. Bekijk de **Laatste meetstappen**: per stap de tijd, kWh, P1-import, net, zon en prijs.
3. Selecteer **Opnieuw berekenen** bij het apparaat.
4. Zet het debuglogboek aan via **Instellingen** > **Apparaten en diensten** > **Energydash** > **Debuglogboek inschakelen**. Download in hetzelfde menu ook de diagnostiek en voeg beide toe aan een [melding op GitHub](https://github.com/Radeaus/Energydash/issues).

</details>

## Energydash verwijderen

1. Ga naar **Instellingen** > **Apparaten en diensten** > **Energydash**.
2. Selecteer het menu (⋮) > **Verwijderen**.

Alle opgeslagen gegevens van Energydash (`.storage/energydash.*`) worden daarbij ook verwijderd. Heb je via HACS geïnstalleerd, verwijder Energydash daarna ook in HACS en start Home Assistant opnieuw op.

## Ontwikkelen

```bash
pip install pytest && pytest                  # tests, zonder Home Assistant
cd frontend && npm install && npm run build   # paneel bouwen
npm run watch                                 # tijdens ontwikkelen
```

De tests dekken de rekenkern, het terugrekenen en de herkenning. Het paneel wordt gebouwd naar `custom_components/energydash/frontend/`.

Het gebundelde paneel (`energydash-panel.js`) staat in de repository, zodat HACS het direct kan installeren. Bouw het opnieuw na elke wijziging in `frontend/src`. GitHub Actions controleert hassfest, HACS, de tests en of de bundel up-to-date is.

## Documentatie

- [Concept](docs/01-concept.md): wat het is, voor wie, en wat er al bestaat.
- [Rekenmethode](docs/02-rekenmethode.md): hoe energie, zon, net en kosten berekend worden, met de controle op echte gegevens.
- [Entiteiten herkennen](docs/03-entiteiten-herkennen.md): hoe stroommeters automatisch gevonden en gefilterd worden.
- [UX en design](docs/04-ux-en-design.md): schermen, flows, teksten en de designrichtlijnen van Home Assistant.
- [Architectuur](docs/05-architectuur.md): Python-integratie, paneel, opslag en API.
- [Roadmap](docs/06-roadmap.md): fasering, beslissingen en open vragen.
- [Tesla-sessierapport](docs/07-tesla-sessierapport.md): de bestaande automatisering die dezelfde rekenmethode gebruikt.
- [Installeren en testen](docs/08-installeren-en-testen.md): testplan en opnieuw beginnen.
- [Referentie](referentie/): de entiteiten, Energy-dashboardinstellingen en een automatiseringsexport.

# 04 – UX en design

Gebaseerd op de Home Assistant-designrichtlijnen (contributors.home-assistant.io/design). In de echte build gebruik je de HA-componenten (`ha-button`, `ha-dialog`/adaptive dialog, `ha-form` met selectors, `ha-alert`, `ha-empty-state`, `ha-expansion-panel`, `ha-list`), zodat look, thema en toegankelijkheid vanzelf kloppen.

## Principes en hoe ze terugkomen

| HA-principe | Toepassing |
|---|---|
| Privacy / lokaal | Alles wordt lokaal in Home Assistant berekend; er gaat niets naar de cloud. (Staat niet meer als zin in de wizard.) |
| Keuze | Werkt met elke leverancier en elk merk; Zonneplan is alleen een voorbeeld. Gebruiker kiest elke bron zelf. |
| Duurzaamheid | Geen eigen afwijkende UI-patronen; standaard HA-componenten. |
| Welkom | Uitleg in gewone taal, voorstellen met reden ("Voorgesteld omdat …"). |
| Niets aannemen | Hoe de prijs wordt ingevoerd, of er iets bij komt, de terugleverprijs en de zonkeuze vraagt de wizard; geen van die keuzes staat vooraf aangevinkt. Alleen meters en een prijs-entiteit worden voorgesteld (uit het Energy-dashboard), en die zie je om te controleren. |
| Eerlijk (candid) | Gegevenscheck, "Alleen vermogen"-waarschuwing, "Hoe is dit berekend?" bij elke sessie. |
| Ondersteunend | Foutmeldingen met oorzaak én volgende stap ("Zet ‘Klaar na’ hoger"). |
| Gul | Alles achteraf aanpasbaar; zwakke bron mag wél, maar met uitleg. |

## Flows

### 1. Installeren (config flow, Instellingen › Apparaten en diensten)
Eén bevestiging zonder velden: "Energydash wordt toegevoegd aan de zijbalk. Daar kies je je stroomprijs en meters, en voeg je je apparaten toe." De meters uit het Energy-dashboard (alle import-, teruglever- en opwektellers) en een voorgestelde prijs-entiteit worden als startwaarde bewaard; het soort prijs blijft leeg tot de gebruiker kiest.

**Opnieuw configureren** heeft alleen nog **Gegevens wissen** (Alles bewaren / Berekende gegevens wissen / Opnieuw beginnen). Er is geen options flow meer: prijzen en meters staan in het paneel.

### 2. Paneel, eerste keer: snelle start (`ed-onboarding`)
Doel: een nieuwe gebruiker heeft in twee klikken de apparaten, zonder te weten wat tellers, soorten of bronnen zijn. Alles wat niet nodig is, staat er niet.
1. **Start**: icoon 64 px, kop **"Zien wat je apparaten kosten"**, één zin uitleg, knop **Wizard starten**, daaronder tekstknop **Geavanceerd instellen** (opent de wizard van flow 3; is de prijs nog niet gekozen, dan eerst stap 1a–1c). Geen beheerder: alleen uitleg.
1a. **Je stroomprijs** (stap 1 van 2 of 3): "Hoe wil je je stroomprijs invoeren?" * met **Prijs uit een entiteit** / **Vaste prijs**, niets vooraf gekozen.
   - Entiteit: **Prijs-entiteit** * (sensors per kWh bovenaan, met de huidige prijs eronder), dan "Is dit de prijs die je echt betaalt?" * met **Ja, alles zit erin** / **Nee, er komt nog iets bij** → **Opslag per kWh (€)** *.
   - Vast: "Heb je één prijs of een dag- en nachttarief?" * met **Eén prijs** → **Prijs per kWh (€)** *, of **Normaal en dal** → **Normaaltarief** * en **Daltarief** *.
1b. **Je meters**: **Import uit het net** *, **Teruglevering aan het net** en **Opwek zonnepanelen**, voorgevuld uit het Energy-dashboard. Per meter **Teller toevoegen** voor aparte tellers voor normaal en dal of meerdere omvormers.
1c. **Zonnestroom en teruglevering** (alleen met een teruglever- of opwekteller): **Wat kost stroom van je eigen zonnepanelen?** *. Alleen bij **Wat je anders had gekregen** volgt **Waar komt die terugleverprijs vandaan?** * (Uit je prijs-entiteit / Uit een andere entiteit / Een vast bedrag); bij een vaste prijs is dat alleen een bedrag.
   - De snelle start begint altijd zonder gekozen antwoorden; vervolgvragen verschijnen pas na een keuze. In Instellingen staan de huidige antwoorden wel gekozen.
   - Elke keuze is een kaart met titel, één korte regel en een **voorbeeldregel** die laat zien wat er met de prijs gebeurt, als rekenregel met echte waarden zodra die bekend zijn ("€ 0,295 + € 0,165 = € 0,460", "Zon = terugleverprijs = € 0,08", "Zon = stroomprijs = € 0,30"), anders met "Bijv.". De twee soorten prijs tonen altijd een uitlegvoorbeeld ("Bijv. 14:00 € 0,24 · 14:15 € 0,31" tegenover "Bijv. altijd € 0,29 per kWh"); de actuele prijs van de gekozen entiteit staat onder het veld. De kaarten staan naast elkaar als er ruimte is (minimaal 200 px per kaart), zodat een stap zonder scrollen past.
   - Knoppen **Terug** en **Volgende**; de laatste stap **Opslaan en apparaten zoeken**. Volgende is pas actief als alle vragen van de stap beantwoord zijn. Na opslaan wordt het huis opnieuw berekend.
2. **Even zoeken…**: drie regels met vinkjes (Energy-dashboard lezen, stroommeters zoeken, historie bekijken), zodat het wachten iets vertelt.
3. **Gevonden**: vinklijst. Aangevinkt staat alleen wat zeker goed is (regels in docs/03 "Snelle start"). Per regel: naam, soort en in één regel wat er gevonden is ("5 sessies in 7 dagen, gemiddeld 1,1 kWh", "Gemiddeld 48 W, 1,2 kWh per dag"). Uitklappen toont een mini-grafiek van het vermogen, de herkomst en **Aanpassen** (opent flow 3 met het voorstel). Daaronder **Ook gevonden**, niet aangevinkt, met de reden in één zin ("Meet in de auto: … Je laadpaal meet beter."). Knop **{n} apparaten toevoegen**.
4. **Terugrekenen**: "{n} apparaten toegevoegd", voortgangsbalk en per apparaat wachten / bezig / klaar, plus dat sluipverbruik al werkt zonder apparaat. Als alles klaar is, gaat het paneel vanzelf naar het dashboard. Duurt het langer dan 20 seconden, dan verschijnt de tekstknop **Alvast naar het dashboard**. De balk "Bezig met terugrekenen" bovenaan is in de snelle start verborgen.
- Niets gevonden: "Geen stroommeters gevonden" met **Zelf een meter kiezen** (flow 3) en **Opnieuw zoeken**.
- De snelle start blijft staan zolang hij loopt, ook als via Aanpassen al een apparaat is toegevoegd; die regel krijgt dan "Toegevoegd".

### 3. Apparaat toevoegen (adaptive dialog, stappen)
1. **Kies een stroommeter** (alleen via de knop, niet via Ontdekt): zoekveld met zichtbaar label "Zoeken", lijst met chip "kWh-teller" of "Alleen vermogen". Geen resultaten → "Geen resultaten – Pas je zoekterm aan".
2. **Soort apparaat** (select-box): Sessies / Doorlopend / Laadpaal, met voorstel en reden onder het veld.
3. **Bronnen**:
   - **Energie** * (entity picker met opties en chips; "Niet aanbevolen" bij trage vermogenssensor).
   - **Begin en einde van een sessie** * (bij Sessies en Laadpaal): Uit het verbruik / Uit een entiteit. Bij entiteit: **Sessie-entiteit** * en **Sessie loopt zolang de status is** (chips, minimaal één, anders "Kies minstens één status.").
   - **Gegevenscheck** (lijst met ok/beperking/niet aanbevolen en gevolg).
4. **Voorbeeld aanwijzen** (alleen bij Sessies uit het verbruik): vermogensgrafiek, keuze uit gevonden pieken, afgeleide waarden (Aan vanaf, Minimale duur), schuifregelaar **Klaar na**, directe validatie (succes- of waarschuwingsmelding met icoon + tekst), en "Teruggerekend op je historie". **Opslaan** pas actief bij een geldige keuze.
- Na opslaan: melding (toast) "Apparaat toegevoegd".

### 4. Paneel met data (tabs, zoals een HA-subpagina; op mobiel onderaan)
- **Dashboard**: periodekeuze (Week/Maand), KPI's (Totaal huis, Gemiddeld per dag, Betaald per kWh, Bespaard door zon), donut "Waar gaat je geld heen" (per apparaat + Rest van het huis), donut "Waar komt je stroom vandaan" (eigen zon / net), gestapelde staven "Kosten per dag" (per apparaat; negatieve kosten onder de nullijn), "Wat betaal je per kWh?" (per apparaat t.o.v. marktgemiddelde), "Wanneer verbruik je?" (verbruik per uur met prijs per uur).
- **Sessies**: lijst; tik opent een dialoog met kosten, staven per kwartier (zon/net), opbouw (net, zon, totaal), inzicht, en uitklapblok **"Hoe is dit berekend?"** (energiebron, zon/net-regel, prijsregel, controle).
- **Sluipverbruik**: basislast (W, kWh/dag), €/maand, €/jaar, uitsplitsing (verklaard/onverklaard) met advies, basislast per week.
- **Apparaten**: lijst met soort en regel; zwevende knop **Apparaat toevoegen**. Apparaatdialoog met bronnen en gegevenscheck; **Verwijderen** → bevestiging **"Apparaat verwijderen?"** met uitleg dat geschiedenis bewaard blijft.
- Tandwiel in de kopbalk: **Instellingen**, een eigen pagina (geen pop-up) met een terugknop in de kopbalk. Dezelfde vragen als stap 1a–1c, elk onderwerp in een eigen kaart (Stroomprijs, Meters, Zonnestroom en teruglevering), daarna de kaart Testen en beheer. Opslaan en Annuleren staan in een balk die onderaan in beeld blijft; na opslaan, terugzetten of importeren ga je terug naar het dashboard. Opslaan met gewijzigde instellingen rekent de historie opnieuw uit ("Opgeslagen. Je historie wordt opnieuw berekend.").
- Zijn er apparaten maar is de prijs nog niet gekozen, dan staat bovenaan een waarschuwing met **Stroomprijs instellen**.

## Teksten (UI text)
- Zinsvorm, werkwoorden op knoppen: "Apparaat toevoegen", "Opslaan", "Volgende", "Verzenden", "Voltooien", "Verwijderen", "Annuleren", "Sluiten".
- Bevestiging: titel als vraag, geen gebruikersinvoer in de titel.
- Lege staten: "Nog niets om te tonen" / "Geen resultaten" + volgende stap.
- Succes kort: "Apparaat toegevoegd", "Opgeslagen".
- Elke invoer een zichtbaar label; verplicht met `*`; helptekst onder het veld.

## Visuele tokens (prototype)
Gebruik in de build HA's semantische tokens/variabelen; dit zijn de waarden uit het prototype.

| Rol | Licht | Donker |
|---|---|---|
| Achtergrond | `#fafafa` | `#111111` |
| Kaart | `#ffffff` | `#1c1c1c` |
| Lijn | `#e6e6e6` | `#363636` |
| Tekst / secundair | `#141414` / `#5e5e5e` | `#e6e6e6` / `#b1b1b1` |
| Primair (tekst, knop) | `#006787` (primary-30, contrast ≥ 4,5:1) | `#37c8fd` |
| Primair accent | `#009ac7` (primary-40) | `#18bcf2` |
| Succes / waarschuwing / fout | `#036730` / `#9d3800` / `#b30532` | `#5dc36f` / `#ff9342` / `#fd8f90` |

- Lettertype Roboto; maten 12/14/16/20/24/28; gewicht 400 tekst, 500 acties, 700 koppen.
- Spacing in stappen van 4 px; kaarten radius 12 px met dunne rand, geen schaduw; knoppen en chips pill-vorm; dialogen radius 24 px (op mobiel bottom sheet).
- Bewuste afwijking: knoppen/linktekst `#006787` i.p.v. `#009ac7`, omdat wit op `#009ac7` het tekstcontrast niet haalt.

### Grafiekkleuren (gevalideerd op kleurenblindheid en contrast)
- Zon `#f36d00` (donker `#c94e00`), net `#488fc2`.
- Apparaten in vaste volgorde, kleur volgt het apparaat (nooit de rangorde): Wasmachine `#6250d6`, Droger `#e87ba4`, Server `#008300`, Laadpaal `#eda100`, Airco Woonkamer `#1baf7a`, Airco Slaapkamer `#e34948`; donker: `#9085e9`, `#d55181`, `#008300`, `#c98500`, `#199e70`, `#e66767`.
- Rest van het huis: neutraal grijs (`#989898` / `#7a7a7a`).
- Altijd legenda + labels + 2 px tussenruimte tussen segmenten (secundaire codering).

## Bronnen
- https://contributors.home-assistant.io/design/principles/
- https://contributors.home-assistant.io/design/foundations/color/
- https://contributors.home-assistant.io/design/foundations/typography/
- https://contributors.home-assistant.io/design/foundations/spacing/
- https://contributors.home-assistant.io/design/patterns/forms/
- https://contributors.home-assistant.io/design/patterns/empty-states/
- https://contributors.home-assistant.io/design/ui-text/buttons-and-labels/
- https://contributors.home-assistant.io/design/ui-text/messages/
- https://contributors.home-assistant.io/design/users/

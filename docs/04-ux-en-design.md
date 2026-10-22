# 04 – UX en design

Gebaseerd op de Home Assistant-designrichtlijnen (contributors.home-assistant.io/design). In de echte build gebruik je de HA-componenten (`ha-button`, `ha-dialog`/adaptive dialog, `ha-form` met selectors, `ha-alert`, `ha-empty-state`, `ha-expansion-panel`, `ha-list`), zodat look, thema en toegankelijkheid vanzelf kloppen.

## Principes en hoe ze terugkomen

| HA-principe | Toepassing |
|---|---|
| Privacy / lokaal | Wizard zegt: "Alles wordt lokaal in Home Assistant berekend; er gaat niets naar de cloud." |
| Keuze | Werkt met elke leverancier en elk merk; Zonneplan is alleen een voorbeeld. Gebruiker kiest elke bron zelf. |
| Duurzaamheid | Geen eigen afwijkende UI-patronen; standaard HA-componenten. |
| Welkom | Uitleg in gewone taal, voorstellen met reden ("Voorgesteld omdat …"). |
| Eerlijk (candid) | Gegevenscheck, "Alleen vermogen"-waarschuwing, "Hoe is dit berekend?" bij elke sessie. |
| Ondersteunend | Foutmeldingen met oorzaak én volgende stap ("Zet ‘Klaar na’ hoger"). |
| Gul | Alles achteraf aanpasbaar; zwakke bron mag wél, maar met uitleg. |

## Flows

### 1. Installeren (config flow, Instellingen › Apparaten en diensten)
Eén stap met:
- **Soort contract** * (select-box): Dynamisch contract / Vast tarief.
- **Stroomprijs** * (entity picker, €/kWh) of bij vast: Normaaltarief * en Daltarief.
- **Import uit het net** * (entity picker, kWh-teller; voorgesteld uit het Energy-dashboard).
- **Wat kost stroom van je eigen zonnepanelen?** * (select-box): Wat je anders had gekregen / Niets / Hetzelfde als stroom uit het net. Helptekst: "Geldt voor alle apparaten. Zon gaat eerst naar de rest van het huis; alleen wat daarna over is telt als zon voor het apparaat."
- Knop **Verzenden** → "Gelukt! Energydash is ingesteld. Je vindt het nu in de zijbalk." → **Voltooien**.

### 2. Paneel, eerste keer (empty state)
- Icoon 64 px, kop (h2) **"Nog geen apparaten"**, tekst "Voeg een apparaat toe om te zien wat een wasbeurt, een laadsessie of je sluipverbruik kost.", knop **Apparaat toevoegen**.
- Daaronder kaart **Ontdekt**: gevonden apparaten met herkomst ("In je Energy-dashboard · Energy Socket, Zolder") en knop **Toevoegen**. Bij alleen vermogen een chip "Alleen vermogen".

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
- Tandwiel in de kopbalk: **Prijzen en zon** (options flow, zelfde velden als installatie).

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

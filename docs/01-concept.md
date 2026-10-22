# 01 – Concept

## Het idee
Een dashboard in Home Assistant dat laat zien wat stroom écht kost, per apparaat:

- **Per sessie**: wat kostte deze wasbeurt, deze droogbeurt, deze laadsessie?
- **Per dag en maand**: voor apparaten die doorlopend draaien (server, airco, koelkast).
- **Sluipverbruik**: de basislast van het huis (mediaan van de P1-import 's nachts) in €/maand en €/jaar, met hoeveel daarvan verklaard wordt door gemeten apparaten.

De kosten worden berekend met de werkelijke prijs op het moment van verbruik (dynamisch contract per kwartier, of een vast tarief), en verbruik op eigen zonnestroom wordt eerlijk verrekend.

## Voor wie
Home Assistant richt zich op drie soorten gebruikers; het ontwerp moet voor alle drie werken:

- **Overstappers** (van big-tech smart home): moet werken zonder YAML, met een wizard en goede voorstellen.
- **Tinkerers**: willen zelf bronnen kiezen, regels aanpassen en zien hoe er gerekend wordt.
- **Vragers** (willen meer, hebben hulp nodig): uitleg in de interface, gegevenscheck, duidelijke foutmeldingen met een volgende stap.

## Wat er al bestaat (verkenning 21 okt 2026)

| Project | Wat het doet | Wat ontbreekt voor dit doel |
|---|---|---|
| Standaard Energy-dashboard | Verbruik en kosten op huisniveau, apparaten in kWh | Geen kosten per apparaat of per sessie |
| **WashData** (HACS, 1,1k sterren, AGPL) | Cycli van wasmachine, droger, vaatwasser herkennen, programma's leren, energie en kosten per cyclus, eigen sidebar-paneel | Alleen apparaten met cycli; geen laadsessies, geen sluipverbruik, geen huisbreed overzicht, geen eerlijke zonverrekening |
| **Dynamic Energy Cost** | Kosten per apparaat met een dynamische prijssensor (dag/maand/jaar) | Geen sessies, geen zonverrekening, geen dashboard |
| **Genergy Dashboard** (CC BY-NC-SA) | Mooi dashboard voor zon, batterij, net; integratie + Lit-kaarten + config flow | Geen kosten per apparaat; voorspellingen via EMHASS/HAEO; sterk gericht op thuisbatterij |
| **Energy Flow Card Plus**, **Energy Sankey** | Visualisatie van energiestromen | Alleen visualisatie |
| **PowerCalc** | Schat verbruik van apparaten zonder meter | Aanvulling, geen kostenanalyse |

**Positionering:** de kostenlaag voor het hele huis. Eén plek waar wasbeurten, laadsessies, doorlopende apparaten en sluipverbruik samen in euro's staan, met zonverrekening die klopt. Optioneel later: cycle-events van WashData inlezen voor wie dat al gebruikt.

## Waarom het nodig is (aanleiding)
In de eigen HA week de zelfgemaakte meting van laadsessies steeds af van de Zonneplan-data. Onderzoek (zie `02-rekenmethode.md`) liet zien dat dit niet aan de prijs lag, maar aan de meetmethode: een traag ververst vermogen combineren met een realtime P1-meter. Dat soort valkuilen wil deze integratie voor iedereen oplossen.

## Bronnen
- WashData: https://github.com/3dg1luk43/ha_washdata
- Dynamic Energy Cost: https://github.com/martinarva/dynamic_energy_cost
- Genergy Dashboard: https://github.com/SpengeSec/Genergy-Dashboard
- Energy Flow Card Plus: https://github.com/flixlix/energy-flow-card-plus
- Energy Sankey: https://github.com/davet2001/energy-sankey
- Dynamic Energy Prices (NL/BE): https://github.com/gokhancelik/energy-api-integrations

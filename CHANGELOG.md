# Changelog

## 1.0.0 – 22 oktober 2026

Eerste versie.

### Nieuw

- Bij de eerste keer openen zoekt de snelle start je stroommeters, stelt ze in op basis van de historie en toont ze als vinklijst. Per apparaat zie je wat er gevonden is, zoals "5 sessies in 7 dagen, gemiddeld 1,1 kWh", met een kleine grafiek als je het uitklapt.
- Twijfelgevallen, zoals een meter met alleen vermogen, een teller in de auto of een dubbele laadpaal, staan apart met de reden erbij.
- Met één knop voeg je alle aangevinkte apparaten toe en worden ze samen teruggerekend.
- Je kiest je stroomprijs als **Prijs uit een entiteit** (met een optionele opslag per kWh, bijvoorbeeld bij een kale beursprijs) of als **Vaste prijs** (**Eén prijs** of **Normaal en dal**). Elke keuze toont een voorbeeld met je eigen prijzen.
- Je kiest wat stroom van je eigen zonnepanelen kost: **Wat je anders had gekregen**, **Niets** of **Hetzelfde als stroom uit het net**. Die keuze kun je achteraf wisselen.
- De terugleverprijs komt uit je prijs-entiteit, uit een andere entiteit of uit een vast bedrag.
- Je meters worden overgenomen uit het Energy-dashboard. Meerdere tellers per meter, zoals normaal en dal of meerdere omvormers, worden opgeteld.
- **Instellingen** is een eigen pagina met dezelfde vragen als de snelle start. Na het opslaan wordt de historie vanzelf opnieuw berekend.
- De installatie in Home Assistant vraagt niets: je stelt alles in het paneel in.
- Met **Geavanceerd instellen** en **Apparaat toevoegen** kies je zelf de meter, de soort apparaat en de bronnen (met een gegevenscheck), en stel je sessies in met een voorbeeld over de laatste 7 dagen.
- Kosten worden berekend met kWh-tellers, met vermogen als terugvaloptie. Tellerresets worden herkend. Zon en net worden per meetstap bepaald met de P1-importteller, en de prijs is tijdgewogen per kwartier. Alle regels staan in [de rekenmethode](docs/02-rekenmethode.md).
- Bij trage tellers, zoals de teller in een Tesla, beslaat een meetstap minstens de gebruikelijke verversingstijd, zodat er geen zon wordt geteld die er niet was.
- Met een opwekteller is de zon per meetstap nooit meer dan wat de panelen in dat interval in huis leverden.
- Meetstappen boven 25 kW tellen niet mee, zodat laden onderweg niet meetelt bij een teller in de auto.
- De verwachte prijzen van Zonneplan, Nord Pool en vergelijkbare formaten worden herkend, met automatische correctie van de eenheid.
- Bewaart de recorder de verwachte prijzen niet, dan wordt de terugleverprijs voor de historie afgeleid uit de stroomprijs.
- Sessies worden herkend uit het verbruik (drempel, "klaar na" tot 4 uur, minimale duur) of uit de status van een entiteit. Een apparaat kan ook doorlopend worden gevolgd.
- Sluipverbruik is per nacht het rustigste uur tussen 02:00 en 05:00, als mediaan over 7 nachten en zonder apparaten met sessies.
- De historie gaat tot een jaar terug: de recorder wordt aangevuld met de langetermijnstatistieken van Home Assistant, per uur.
- Open sessies en tussenstanden blijven bewaard bij een herstart van Home Assistant.
- Het dashboard toont een week (kalenderweek), maand of jaar, met kaarten voor de kosten per dag, de gemiddelde stroomprijs, wat je per kWh betaalt en **Zon** (aandeel eigen zon, opgewekt, teruggeleverd en bespaard).
- Elk getal heeft een uitleg in een tooltip.
- Elke sessie heeft **Hoe is dit berekend?**, en de tabbladen **Sluipverbruik** en **Apparaten** tonen de basislast, meetstappen en een kleur en icoon per apparaat.
- Onder **Testen en beheer** kun je alles opnieuw berekenen, instellingen exporteren en importeren, berekende gegevens wissen en Energydash terugzetten.
- Het paneel is in het Nederlands en Engels, volgt het lichte of donkere thema van Home Assistant en werkt op smalle schermen.
- Per apparaat zijn er sensoren voor de kosten van vandaag, deze maand en de laatste sessie. Voor het huis zijn er sensoren voor de totale kosten, de rest van het huis en het sluipverbruik.
- Er is diagnostiek om te downloaden, en een melding onder **Reparaties** als een gebruikte entiteit verdwenen is.
- Met de acties `energydash.recalculate` en `energydash.reset` reken je opnieuw of wis je gegevens vanuit een automatisering.
- Bij het verwijderen van de integratie worden alle opgeslagen gegevens ook verwijderd.

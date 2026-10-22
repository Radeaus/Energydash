# Changelog

## 1.0.0 – 22 oktober 2026

Eerste versie.

### Snelle start en instellingen
- Snelle start bij de eerste keer openen: zoekt je stroommeters, stelt ze in uit de historie en toont ze als vinklijst met per apparaat wat er gevonden is ("5 sessies in 7 dagen, gemiddeld 1,1 kWh"), uitklapbaar met een mini-grafiek. Twijfelgevallen (alleen vermogen, teller in de auto, dubbele laadpaal) staan apart met de reden. Eén knop voegt alles toe en rekent het samen terug.
- Stroomprijs: **prijs uit een entiteit** (met optionele opslag per kWh, bijvoorbeeld bij een kale beursprijs) of **vaste prijs** (één prijs of normaal en dal). Elke keuze toont een voorbeeld met je echte prijzen.
- Zonnestroom waarderen als terugleverprijs, als niets of als stroomprijs, achteraf wisselbaar. Terugleverprijs uit je prijs-entiteit, een andere entiteit of een vast bedrag.
- Meters uit het Energy-dashboard, met meerdere tellers per meter (normaal en dal, meerdere omvormers) opgeteld.
- **Instellingen** als eigen pagina met dezelfde vragen als de snelle start; na wijzigen wordt de historie vanzelf opnieuw berekend. De installatie in Home Assistant vraagt niets: alles stel je in het paneel in.
- **Geavanceerd instellen**: wizard **Apparaat toevoegen** (meter kiezen, soort, bronnen met gegevenscheck, sessies instellen met voorbeeld over 7 dagen).

### Rekenen
- Rekenkern volgens `docs/02-rekenmethode.md`: kWh-tellers (vermogen als fallback), tellerresets, zon/net per meetstap met de P1-importteller, tijdgewogen kwartierprijs.
- Trage tellers (zoals de teller in een Tesla): een meetstap beslaat minstens de gebruikelijke verversingstijd, zodat er geen spookzon ontstaat. Met een opwekteller is zon per stap nooit meer dan wat de panelen in dat interval in huis leverden.
- Stappen boven 25 kW (laden onderweg bij een teller in de auto) tellen niet mee.
- Forecast-herkenning voor Zonneplan, Nord Pool en vergelijkbare formaten, met automatische schaalcorrectie. Voor de historie wordt de terugleverprijs afgeleid uit de stroomprijs als de recorder de forecast niet bewaart.
- Sessies uit het verbruik (drempel, "klaar na" tot 4 uur, minimale duur), uit een entiteit (statussen) of doorlopend.
- Sluipverbruik: per nacht het rustigste uur tussen 02:00 en 05:00, mediaan over 7 nachten, zonder apparaten met sessies.
- Historie tot een jaar terug: de recorder aangevuld met de langetermijnstatistieken van Home Assistant, per uur.
- Opslag in drie bestanden; open sessies en tussenstanden overleven een herstart.

### Paneel
- Dashboard per week (kalenderweek), maand en jaar, met kaarten voor kosten per dag, gemiddelde stroomprijs, wat je per kWh betaalt en **Zon** (aandeel eigen zon, opgewekt, teruggeleverd, bespaard).
- Uitleg in een tooltip op elk getal.
- Sessies met "Hoe is dit berekend?", Sluipverbruik, Apparaten met meetstappen, kleur en icoon per apparaat.
- Testen en beheer: alles opnieuw berekenen, exporteren/importeren, gegevens wissen, terugzetten (rekent daarna vanzelf opnieuw).
- Nederlands en Engels, licht/donker via het HA-thema, smalle schermen.

### Integratie
- Sensoren per apparaat (kosten vandaag, deze maand, laatste sessie) en voor het huis (totaal, rest, sluipverbruik).
- Diagnostiek, Reparaties-melding bij verdwenen entiteiten, acties `energydash.recalculate` en `energydash.reset`.
- Bij verwijderen van de integratie worden alle opgeslagen gegevens verwijderd.

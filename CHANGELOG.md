# Changelog

## 1.2.1 – 22 oktober 2026

### Paneel
- Nieuwe snelle start bij de eerste keer openen. **Wizard starten** zoekt je stroommeters, stelt ze zelf in uit de historie en laat ze zien als vinklijst: per apparaat wat we vonden ("5 sessies in 7 dagen, gemiddeld 1,1 kWh"), uitklapbaar met een mini-grafiek. Twijfelgevallen (alleen vermogen, teller in de auto, dubbele laadpaal) staan apart met de reden. Eén knop voegt alles toe en rekent het samen terug.
- **Geavanceerd instellen** opent de bestaande wizard; **Aanpassen** op een regel opent die wizard met het voorstel.

## 1.2.0 – 22 oktober 2026

### Rekenen
- Sluipverbruik: apparaten met sessies (laadpaal, auto) tellen niet meer mee. Per nacht telt het rustigste uur tussen 02:00 en 05:00, daarna de mediaan over 7 nachten. Voorheen werd een nachtelijke laadsessie als sluipverbruik gezien.
- Historie tot een jaar terug: "Opnieuw berekenen" vult de periode van vóór de recorder (meestal 10 dagen) aan met de langetermijnstatistieken van Home Assistant, per uur. Zonder sessies, wel kosten, zon en net per uur, dag en maand.

### Paneel
- Dashboard: nieuwe weergave **Jaar**, met kosten per maand.
- Nieuwe kaart **Gemiddelde stroomprijs**: wat je gemiddeld per kWh uit het net betaalde in de gekozen periode. Vervangt "Betaald per kWh".
- "Bespaard door zon" legt nu uit wat het percentage betekent: zoveel goedkoper dan als alles uit het net was gekomen.
- Getallen in de cirkeldiagrammen staan weer netjes in het midden.

**Na bijwerken:** Instellingen → **Alles opnieuw berekenen**, dan worden het sluipverbruik en de oudere historie opnieuw opgebouwd.

## 1.1.0 – 22 oktober 2026

### Rekenen
- Opgelost: spookzon bij tellers die traag verversen, zoals de teller in een Tesla (elke ~30 minuten). De P1 werd dan maar over de laatste 5 minuten gemeten terwijl de teller over een half uur rapporteerde, waardoor laden 's nachts als 90–100% zon telde. Een meetstap beslaat nu minstens de gebruikelijke verversingstijd van de teller.
- Nieuw: met een opwekteller kan de zon per meetstap nooit meer zijn dan wat je panelen in dat interval zelf in huis leverden. De rest telt als netstroom.
- Nieuw: stappen die sneller oplopen dan een huisaansluiting kan leveren (> 25 kW) tellen niet mee, zoals laden onderweg bij een teller in de auto. Zichtbaar in de meetstappen.
- Laadpaal met sessies uit het verbruik: "Klaar na" standaard minstens 60 minuten en instelbaar tot 4 uur, zodat pauzes van slim laden één sessie blijven.

### Paneel
- Lege staat toont alleen **Apparaat toevoegen**, zonder de lijst **Ontdekt**.
- Knoppen hebben weer een normale grootte (het pluspictogram in de lege staat was 64 px).
- **Apparaat toevoegen** biedt tellers en vermogenssensoren die al bij een apparaat horen niet nog eens aan.
- De gegevenscheck van een teller in de auto zegt nu dat die ook laden onderweg meetelt.

**Na bijwerken:** kies bij elk apparaat **Opnieuw berekenen** (of Instellingen → **Alles opnieuw berekenen**) om oude sessies met de nieuwe regels door te rekenen.

## 1.0.1 – 22 oktober 2026

- Opgelost: "Config flow could not be loaded: Invalid handler specified" bij het toevoegen van de integratie. De prijsvelden gebruikten een stapgrootte (0,0001) die Home Assistant niet toestaat, waardoor de installatiestap niet kon laden.

## 1.0.0 – 22 oktober 2026

Eerste versie. Fase 1 tot en met 3 uit `docs/06-roadmap.md` in één release.

### Integratie
- Config flow met voorstellen uit het Energy-dashboard: dynamisch contract (prijs-entiteit met forecast) of vast normaal-/daltarief, P1-import, optioneel teruglevering en opwek, zonkeuze.
- Options flow **Prijzen en zon** en **Opnieuw configureren** (met keuze om gegevens te wissen).
- Rekenkern volgens `docs/02-rekenmethode.md`: kWh-tellers (vermogen als fallback), tellerresets, zon/net per meetstap met de P1-importteller, tijdgewogen kwartierprijs, drie manieren om zonnestroom te waarderen (achteraf wisselbaar).
- Forecast-herkenning voor Zonneplan, Nord Pool en vergelijkbare formaten, met automatische schaalcorrectie (cent, 1e-7 €).
- Sessies uit het verbruik (drempel, "klaar na", minimale duur), uit een entiteit (statussen) of doorlopend.
- Terugrekenen op de recorder-historie bij toevoegen en op verzoek.
- Opslag in drie bestanden; open sessies en tussenstanden overleven een herstart.
- Sensoren per apparaat (kosten vandaag, deze maand, laatste sessie) en voor het huis (totaal, rest, sluipverbruik).
- Diagnostiek, Reparaties-melding bij verdwenen entiteiten, acties `energydash.recalculate` en `energydash.reset`.
- Bij verwijderen van de integratie worden alle opgeslagen gegevens verwijderd.

### Paneel
- Lege staat met **Ontdekt**, wizard **Apparaat toevoegen** (meter kiezen, soort, bronnen met gegevenscheck, sessies instellen met voorbeeld over 7 dagen).
- Dashboard (week/maand), Sessies met "Hoe is dit berekend?", Sluipverbruik, Apparaten met meetstappen.
- Testen en beheer: alles opnieuw berekenen, exporteren/importeren, gegevens wissen, terugzetten.
- Nederlands en Engels, licht/donker via het HA-thema, smalle schermen.

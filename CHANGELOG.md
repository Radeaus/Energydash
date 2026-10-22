# Changelog

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

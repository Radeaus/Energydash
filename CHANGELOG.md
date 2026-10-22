# Changelog

## 1.2.8 – 22 oktober 2026

### Instellingen
- Instellingen openen als eigen pagina in plaats van een pop-up, met een terugknop in de kopbalk. Stroomprijs, Meters, Zonnestroom en teruglevering, en Testen en beheer staan elk in een eigen kaart, met Opslaan en Annuleren onderaan in beeld.

### Apparaten
- Een apparaat zonder gekozen icoon krijgt overal hetzelfde icoon als in de snelle start, geraden uit de naam: een airco toont dus ook na het toevoegen een airco-icoon. Doorlopende apparaten zonder herkenbare naam krijgen een stekker in plaats van een server.

## 1.2.7 – 22 oktober 2026

### Snelle start en instellingen
- De snelle start begint zonder gekozen antwoorden. Vervolgvragen (prijs-entiteit, opslag, tarieven) verschijnen pas als je een keuze maakt.
- De keuzes tussen prijs uit een entiteit en vaste prijs tonen altijd een voorbeeld van wat ze betekenen ("Bijv. 14:00 € 0,24 · 14:15 € 0,31" tegenover "Bijv. altijd € 0,29 per kWh"). De actuele prijs van je entiteit staat onder het veld.
- Zonnestroom: de voorbeelden zijn rekenregels: "Zon = terugleverprijs = € 0,19", "Zon = € 0,00", "Zon = stroomprijs = € 0,30".
- De vraag waar de terugleverprijs vandaan komt verschijnt alleen nog onder "Wat je anders had gekregen", want alleen daar is hij nodig.

## 1.2.6 – 22 oktober 2026

### Snelle start en instellingen
- Rustiger en compacter: keuzes staan naast elkaar en de teksten zijn korter, zodat elke stap zonder scrollen past.
- Elke keuze toont in één regel wat er met de prijs gebeurt, met je echte prijzen zodra die bekend zijn: "Nu € 0,30 per kWh", "€ 0,295 + € 0,165 = € 0,460", "Zon € 0,08 per kWh".
- De keuze "Hetzelfde als de stroomprijs" (salderen) voor teruglevering is weg. Bij een vaste prijs vul je alleen nog je terugleverprijs in.

## 1.2.5 – 22 oktober 2026

### Je stroomprijs: gevraagd, niet aangenomen
- De snelle start vraagt eerst hoe je je stroomprijs wilt invoeren: **Prijs uit een entiteit** of **Vaste prijs**. Niets staat vooraf aangevinkt; Energydash nam eerder stilzwijgend een dynamisch contract aan.
- Bij een prijs-entiteit: "Is dit de prijs die je echt betaalt?" Zo niet (bijvoorbeeld een kale beursprijs van Nord Pool of ENTSO-e), dan vul je een **opslag per kWh** in die er bij elke prijs bij komt.
- Bij een vaste prijs: **één prijs** of **normaal en dal**. Wie één tarief heeft, hoeft niet meer twee keer dezelfde prijs in te vullen.
- Nieuwe vraag **Wat krijg je voor stroom die je teruglevert?**: hetzelfde als de stroomprijs (salderen), uit je prijs-entiteit, uit een andere entiteit of een vast bedrag. Alleen gevraagd als je zonnepanelen of teruglevering hebt.
- De voorgestelde prijs-entiteit komt uit je Energy-dashboard, of anders van een sensor per kWh met verwachte prijzen (kwartierprijzen eerst). Dat werkt nu voor elke leverancier, niet alleen voor Zonneplan.

### Meters
- **Meerdere tellers per meter**: aparte tellers voor normaal en dal, of meerdere omvormers, worden opgeteld. Voorheen werd alleen de eerste teller uit het Energy-dashboard gebruikt, waardoor bij een meter met twee tarieftellers de helft van de import ontbrak.
- De stap **Je meters** laat zien wat uit het Energy-dashboard is overgenomen, zodat je het kunt controleren.

### Instellingen
- Het tandwiel heet nu **Instellingen** en stelt dezelfde vragen als de snelle start. Na het wijzigen van prijzen of meters wordt de historie vanzelf opnieuw berekend.
- De installatie in Home Assistant vraagt niets meer: alles stel je in het paneel in. **Opnieuw configureren** is alleen nog voor het wissen van gegevens.
- De zin "Alles wordt lokaal in Home Assistant berekend" staat niet meer op het startscherm.

**Na bijwerken:** bestaande instellingen blijven werken zoals ze waren. Open **Instellingen** om de nieuwe vragen te zien; je antwoorden van nu staan al ingevuld.

## 1.2.4 – 22 oktober 2026

### Rekenen
- Opgelost: zonnestroom en teruglevering kregen in de herberekende historie een terugleverprijs van €0. De terugleverprijs komt uit het forecast-attribuut van de prijs-entiteit, maar Home Assistant bewaart attributen groter dan 16 kB niet in de recorder (de forecast van Zonneplan is groter). Voor de historie leiden we de terugleverprijs nu af uit de stroomprijs, met de verhouding uit de actuele forecast (all-in = (marktprijs + belasting) × btw, teruglevering = marktprijs). Een vaste terugleverprijs of een eigen terugleverprijs-entiteit gaat altijd voor.
- Na bijwerken wordt alles eenmalig vanzelf opnieuw berekend.

### Dashboard
- "Wat betaal je per kWh?": de uitleg staat nu op de hele regel. Balk = wat je echt betaalde per kWh; streepje = de netprijs, wat dezelfde kWh hadden gekost als alles uit het net was gekomen, op de momenten dat dit apparaat stroom gebruikte.

## 1.2.3 – 22 oktober 2026

### Dashboard
- **Week** is nu de kalenderweek (maandag tot en met zondag). De huidige week toont de tussenstand tot en met vandaag, vergeleken met dezelfde dagen vorige week.
- Opgelost: als het huis voor recente dagen nog niet was berekend, stond de week op nul. Uren zonder huisberekening tellen nu je apparaten mee.
- Nieuwe kaart **Zon**: aandeel eigen zon in je verbruik, opgewekt, zelf gebruikt, teruggeleverd, opbrengst teruglevering en bespaard door zon. Opgewekt en teruglevering verschijnen als je een terugleverteller hebt ingesteld.
- Rustiger: uitleg staat niet meer als tekst onder de kaarten, maar in een tooltip op het getal. Ga met de muis op een bedrag of aantal staan (of tik erop) en je ziet hoe het berekend is. Ook op de pagina Sluipverbruik.
- Kosten per dag: de losse legenda is weg; bij het aanwijzen van een dag zie je de bedragen met hun kleur.

### Apparaten
- Kleur en icoon per apparaat instellen: kies uit de vaste kleuren of een eigen kleur, en uit een reeks iconen of elk `mdi:`-icoon. Onder Apparaten → apparaat → **Kleur en icoon** (wordt direct opgeslagen) of in de wizard.

### Beheer
- **Energydash terugzetten** en **Berekende gegevens wissen** rekenen daarna vanzelf opnieuw: het hele huis direct, en bij wissen ook al je apparaten. Een losse herberekening is niet meer nodig. Lopende herberekeningen worden eerst gestopt.

**Na bijwerken:** de eerste start vult de teruglevering eenmalig aan (het huis wordt opnieuw berekend). Dat gebeurt vanzelf.

## 1.2.2 – 22 oktober 2026

### Snelle start
- Opgelost: een laadpaal kon de verbindingsstatus als sessie-entiteit krijgen, met "on" én "off" als sessiestatus. De sessie liep dan altijd ("Running now" zonder auto). Een sessie-entiteit moet nu een status overhouden waarin geen sessie loopt, en verbindingsstatussen komen als laatste in aanmerking (ook in de geavanceerde wizard).
- Na **Toevoegen** volg je het terugrekenen per apparaat, en ga je vanzelf naar het dashboard als alles klaar is. Na 20 seconden kun je ook alvast gaan.

**Laadpaal met "Running now" na 1.2.1:** open de laadpaal onder Apparaten → **Bewerken** en kies bij Sessie-entiteit de status van de laadpaal (bijvoorbeeld "Laadpaalstatus"), of verwijder hem en voeg hem opnieuw toe.

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

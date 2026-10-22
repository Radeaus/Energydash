# 02 – Rekenmethode

Dit is het hart van de integratie. Alle regels hieronder zijn op echte data getoetst (zie Validatie).

## 1. Energie: altijd uit een kWh-teller

Per apparaat is er één energiebron:

| Bron | Wanneer | Hoe |
|---|---|---|
| **kWh-teller** (`device_class: energy`, `state_class: total_increasing` of `total`) | Voorkeur | Elke toename van de teller is een meetstap `dE`. |
| **Vermogen** (`device_class: power`, W) | Alleen als er geen teller is | De integratie integreert zelf (trapezium/links) naar kWh. Gegevenscheck waarschuwt; bij trage verversing "Niet aanbevolen". |

### Tellerresets
- Een daling van de teller betekent een nieuwe teller (sessieteller van een laadpaal, stroomuitval, vervanging).
- Dan geldt: `dE = nieuwe waarde` (niet het negatieve verschil).
- `unavailable`/`unknown` overslaan; de volgende geldige waarde levert het verschil over de hele onderbreking.

### Meerdere tellers voor één meter
Import, teruglevering en opwek mogen uit meerdere tellers bestaan: een slimme meter met aparte tellers voor normaal en dal, of twee omvormers. Energydash telt ze op. In de historie gebeurt dat per teller met dezelfde resetregel, zodat een reset van één teller de som niet laat dalen; de som begint pas als elke teller een waarde heeft.

### Onmogelijke stappen
Loopt de teller sneller op dan een huisaansluiting kan leveren (meer dan 25 kW gemiddeld sinds de vorige tellerstand), dan telt die stap niet mee en staat er `implausible` in de meetstappen. Dat gebeurt bij een teller in de auto (`charge_energy_added`) na laden onderweg, bijvoorbeeld 38,8 kWh in 30 minuten bij een snellader, en bij een teller die even terugvalt naar 0 en daarna weer op zijn oude stand staat.

### Waarom geen vermogen (aangetoond)
De laadpaal (`sensor.charge_laadpaal_laadpaalvermogen`) ververst via de Zonneplan-cloud elke 5 minuten. De P1 ververst elke seconde. De oude methode rekende `zon = laadvermogen − P1`:

- **Bij elke start** stond het laadvermogen nog tot ~6 minuten te laag → energie gemist.
- **Bij elke stop** stond er nog tot 5 minuten ~11 kW terwijl de auto al stilstond → het verschil met de P1 werd als zon geteld, **ook 's nachts** ("spookzon").

## 2. Zon of net: per meetstap met de P1-importteller

Per meetstap (interval `[t0, t1]`, energie `dE` van het apparaat):

```
dImport = P1_import(t1) − P1_import(t0)      # kWh-teller, niet vermogen
net     = min(dE, max(dImport, 0))
zon     = dE − net
# met een opwekteller: zon ≤ eigen gebruik van de panelen in hetzelfde interval
zon     = min(zon, dOpwek − dExport)
net     = dE − zon
```

Betekenis: zon dekt eerst de rest van het huis; alleen wat het apparaat méér nodig had dan wat er overbleef, kwam uit het net. Dit is ook de marginale kostprijs: zonder het apparaat was de import in dat interval met `net` lager geweest.

Eigenschappen:
- `zon + net = dE`, dus de som klopt altijd met de teller van het apparaat.
- 's Nachts is `dImport ≥ dE` (huis + apparaat), dus `zon = 0`. Geen spookzon mogelijk.
- Hetzelfde interval gebruiken voor beide tellers is essentieel.
- Is er een opwekteller ingesteld, dan kan `zon` nooit meer zijn dan wat de panelen in dat interval zelf in huis leverden (opwek min teruglevering). Wat P1 en panelen samen niet verklaren, telt als netstroom (notitie `solar_capped`). Zonder opwekteller vervalt deze grens.

### Basis vasthouden tussen sessies
Zolang het apparaat niet verbruikt, wordt de P1-basis (`P1_import(t0)` en `t0`) periodiek ververst (bijv. elke 5 minuten). Dan beslaat de eerste meetstap na een start alleen de laatste paar minuten en niet het hele idle-uur ervoor.

Dat mag alleen als de teller snel genoeg ververst. Een teller die maar elke 30 minuten een stand doorgeeft (de teller in een Tesla, opgehaald via de cloud) meldt bij de eerste stand het verbruik van een half uur. Zou de P1 dan maar over de laatste 5 minuten gemeten worden, dan lijkt het meeste zon, ook 's nachts. Daarom:
- De tracker onthoudt hoe vaak de teller tijdens verbruik verandert (mediaan van de laatste 15 tussenpozen tot 3 uur).
- Een meetstap begint bij de nieuwste basis die minstens één zo'n tussenpoos vóór de nieuwe stand ligt. De oudere basispunten (tot 4 uur) blijven daarvoor bewaard.
- Zou ook dat interval een onmogelijk vermogen (> 25 kW) geven, dan begint de stap bij de vorige tellerstand.

### Bekende beperking
Een cloud-teller loopt iets achter op de realtime P1 (latency van de cloud). Bij constant verbruik maakt dat niets uit; bij snel wisselende zon kan de split per stap iets verschuiven. De totale energie blijft exact, want die komt van de teller van het apparaat.

## 3. Prijs: tijdgewogen kwartierprijs

De gebruiker kiest zelf hoe de prijs wordt ingevoerd; Energydash neemt niets aan (zie docs/04, snelle start):

- **Prijs uit een entiteit**: elke sensor per kWh, van welke leverancier ook. Gevraagd wordt of dit de prijs is die je echt betaalt. Zo niet (bijvoorbeeld een kale beursprijs van Nord Pool of ENTSO-e), dan komt er een **opslag per kWh** bij (energiebelasting, inkoopvergoeding en btw samen): `prijs = prijs_entiteit + opslag`.
- **Vaste prijs**: één prijs, of normaal en dal (dal doordeweeks 23:00–07:00 en het hele weekend).

Bij een prijs-entiteit:
- Heeft hij een forecast-attribuut met prijzen per kwartier of uur (zoals Zonneplan), dan:

```
prijs(t0, t1) = Σ over kwartieren q: overlap(q, [t0,t1]) × prijs_q  /  Σ overlap
```

- Zonder forecast: de prijs op het moment van meten.
- Zonneplan-specifiek formaat (voorbeeld, niet hardcoden): `forecast[i].start_date`, `end_date`, `price_tax_included.amount` in eenheden van 1e-7 € (dus `/ 10_000_000`).

Kosten per stap:
```
netkosten  = net × prijs
zonkosten  = zon × zonprijs        # zie §4
kosten     = netkosten + zonkosten
alles_net  = dE × prijs            # ter vergelijking ("zonder zonnepanelen")
```

## 4. Wat kost eigen zonnestroom? (instelling, geldt voor alle apparaten)

| Keuze in UI | `zonprijs` | Wanneer zinvol |
|---|---|---|
| **Wat je anders had gekregen** | de terugleverprijs van dat kwartier (zie hieronder) | Eerlijkst zonder salderen (salderen stopt per 2027) |
| **Niets** | 0 | Wie zon als gratis wil zien |
| **Hetzelfde als stroom uit het net** | gelijk aan `prijs` | Laat zien wat elk apparaat kost zonder zonnepanelen |

Ook de terugleverprijs is een keuze van de gebruiker (alleen gevraagd als er een terugleverteller of opwekteller is):

| Keuze in UI | Terugleverprijs |
|---|---|
| **Uit je prijs-entiteit** (alleen bij een prijs-entiteit) | de prijs zonder belastingen uit de forecast; staat die er niet in of is het historie, dan afgeleid uit de prijs van de entiteit (zonder opslag) met de verhouding uit de forecast |
| **Uit een andere entiteit** (alleen bij een prijs-entiteit) | die entiteit |
| **Een vast bedrag** | dat bedrag (0 mag) |

(De backend kent ook `same`, terugleverprijs = stroomprijs; het paneel biedt die keuze sinds 1.2.6 niet meer aan. Bij een vaste prijs is de terugleverprijs altijd een vast bedrag.)

Instellingen van vóór 1.2.5 hebben deze keuze nog niet en houden het oude gedrag: met een terugleverprijs-entiteit "Uit een andere entiteit", anders "Uit je prijs-entiteit" (bij een vast tarief het vaste bedrag, of 0).

## 5. Sessies

Per apparaat één van drie soorten:

| Soort | Begin en einde | Voorbeeld |
|---|---|---|
| **Sessies – uit het verbruik** | Start boven een drempel (bijv. 3 W), einde na X minuten onder de drempel, minimale duur Y | Wasmachine, droger, vaatwasser |
| **Sessies – uit een entiteit** | Sessie loopt zolang een gekozen entiteit een van de gekozen statussen heeft | Laadpaal (status `VehicleDetected`/`Charging`), kabel-sensor van een auto, slimme wasmachine, thermostaat, drempel-helper |
| **Doorlopend** | Geen sessies, kosten per dag/maand | Server, koelkast, airco |

### Drempels afleiden uit één voorbeeld ("wijs één wasbeurt aan")
- Standby = mediaan vermogen buiten de sessie → drempel net daarboven (bijv. standby 0,6 W → drempel 3 W).
- Langste pauze binnen het voorbeeld × ~1,5 → "Klaar na" (bijv. 3 min → 5 min).
- Korte pieken (wegpompen) vallen weg door een minimale duur (bijv. 10 min).
- Validatie direct in de wizard: "precies 1 wasbeurt gevonden" of uitleg wat er mis is en welke kant je de instelling op moet zetten.

### Laadpaal-specifiek
- Pauzes van slim laden binnen één inplug-sessie blijven één sessie (status-entiteit, niet verbruik).
- Sessies uit het verbruik bij een laadpaal: "Klaar na" staat standaard op minstens 60 minuten (instelbaar tot 4 uur). Met een dynamisch contract pauzeert slim laden vaak een of meer kwartieren; die pauzes horen bij dezelfde sessie.
- Bij loskoppelen tijdens het laden kan de laatste meetstap (≤ 5 min) verloren gaan: de teller springt naar 0 voordat de laatste stand binnenkomt. Dat geldt ook voor de leverancier zelf.

## 6. Sluipverbruik en "Rest van het huis"
- Per nacht: voor elk uur tussen 02:00 en 05:00 het huisverbruik min de apparaten met sessies (laadpaal, auto, wasmachine op een timer). Die horen niet bij de basislast; anders telt elke nachtelijke laadsessie als sluipverbruik.
- Van die drie uren telt het rustigste: zo valt ook een apparaat zonder eigen meter dat 's nachts even draait weg.
- Basislast = mediaan daarvan over de laatste 7 nachten.
- Uitgesplitst in: doorlopende apparaten met een meter en "onverklaard". Apparaten met sessies staan er niet in.
- "Rest van het huis" op het dashboard = P1-totaal minus de toegevoegde apparaten, zodat alles optelt tot het hele huis.

## 7. Historie van vóór de recorder

De recorder bewaart de standen meestal 10 dagen. Voor de periode daarvoor (tot een jaar terug) gebruikt "Opnieuw berekenen" de langetermijnstatistieken van Home Assistant, die per uur blijvend worden bewaard:

- Energie per uur = de `change` van de statistiek van de teller (resets heeft HA al verwerkt). Een vermogenssensor: het uurgemiddelde.
- Zon of net per uur met dezelfde regel als per meetstap, inclusief de grens met de opwekteller. Omdat `min(Σa, Σb) ≥ Σ min(a, b)` geeft een uursplitsing nooit méér zon dan een fijnere: geen spookzon, hooguit iets te weinig.
- Prijs per uur = het uurgemiddelde van de prijs-entiteit. Heeft die geen statistieken, dan de kostensensor van het Energy-dashboard (`<P1-import>_cost`): kosten van dat uur gedeeld door de import van dat uur.
- Opslag per kWh: telt ook hier mee.
- Terugleverprijs: volgens de keuze in §4; bij "Uit je prijs-entiteit" de verhouding teruglever-/importprijs uit de forecast.
- Uren met meer dan 25 kWh tellen niet mee (laden onderweg).
- Sessies zijn uit uurtotalen niet terug te halen; die periode toont alleen kosten per uur, dag en maand.

## 8. Validatie op echte data

### Laadsessie 20–21 oktober 2026 (nachtladen, 23:01–05:46)

| | kWh | Zon | Kosten |
|---|---|---|---|
| Teller van de laadpaal | 49,897 | – | – |
| Oude methode (vermogen − P1) | 48,39 | 0,72 (spookzon, 's nachts) | €16,56 |
| **Nieuwe methode** (teller × tijdgewogen kwartierprijs) | **49,897** | **0** | **€17,33** (€0,347/kWh) |
| Zonneplan-sensor `sessiekosten` | – | – | €15,98 |

- De spookzon zat precies op de stopmomenten (01:41, 03:01, 04:36, 05:46), telkens ~0,18 kWh (≈ 11 kW × 1 minuut).
- Het tekort zat op de startmomenten (laadvermogen stond eerst op ~5,2 kW of 0 terwijl er al ~11 kW geladen werd).
- Zonneplan's eigen sessiekosten kloppen op 5-minutenniveau op de cent met kWh × all-in kwartierprijs, **behalve** tussen 00:00 en 01:46: daar €5,26 voor 19,2 kWh (€0,274/kWh) bij kwartierprijzen van €0,336–0,347. Dat verklaart €1,35 verschil. Of Zonneplan zon aftrekt kon niet getoetst worden (geen zonlaadsessie in de 10 dagen historie).

### Zonnige dag 26 september 2026
- Om 18:00–19:00 telde de oude methode 0,21 kWh zon terwijl de omvormer 0 opwekte. Om 17:00 0,40 kWh zon bij 0,33 kWh opwek. Bevestigt hetzelfde mechanisme overdag.
- Uurtotalen van de oude methode weken tot 0,8 kWh af van de teller van de laadpaal.

### Testcases voor de rekenkern
1. Nachtsessie hierboven: verwacht 49,897 kWh, 0 zon, €17,33 ± €0,05 met de gegeven kwartierprijzen.
2. Tellerreset midden in een reeks: geen negatieve stap.
3. Meetstap over een kwartiergrens: prijs tijdgewogen.
4. Zon-overschot groter dan apparaatverbruik: `net = 0`, `zon = dE`.
5. Huis importeert al zonder apparaat (`dImport ≥ dE`): `zon = 0`.
6. Onderbreking (`unavailable`) van 20 minuten: één stap over het hele interval, geen verlies.

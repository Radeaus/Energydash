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
```

Betekenis: zon dekt eerst de rest van het huis; alleen wat het apparaat méér nodig had dan wat er overbleef, kwam uit het net. Dit is ook de marginale kostprijs: zonder het apparaat was de import in dat interval met `net` lager geweest.

Eigenschappen:
- `zon + net = dE`, dus de som klopt altijd met de teller van het apparaat.
- 's Nachts is `dImport ≥ dE` (huis + apparaat), dus `zon = 0`. Geen spookzon mogelijk.
- Hetzelfde interval gebruiken voor beide tellers is essentieel.

### Basis vasthouden tussen sessies
Zolang het apparaat niet verbruikt, wordt de P1-basis (`P1_import(t0)` en `t0`) periodiek ververst (bijv. elke 5 minuten). Dan beslaat de eerste meetstap na een start alleen de laatste paar minuten en niet het hele idle-uur ervoor.

### Bekende beperking
Een cloud-teller loopt iets achter op de realtime P1 (latency van de cloud). Bij constant verbruik maakt dat niets uit; bij snel wisselende zon kan de split per stap iets verschuiven. De totale energie blijft exact, want die komt van de teller van het apparaat.

## 3. Prijs: tijdgewogen kwartierprijs

- Prijs-entiteit: elke sensor in €/kWh, inclusief belastingen, van welke leverancier ook.
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
| **Wat je anders had gekregen** (standaard) | terugleververgoeding van dat kwartier (kale marktprijs uit dezelfde entiteit, of een aparte entiteit) | Eerlijkst zonder salderen (salderen stopt per 2027) |
| **Niets** | 0 | Wie zon als gratis wil zien |
| **Hetzelfde als stroom uit het net** | gelijk aan `prijs` | Laat zien wat elk apparaat kost zonder zonnepanelen |

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
- Bij loskoppelen tijdens het laden kan de laatste meetstap (≤ 5 min) verloren gaan: de teller springt naar 0 voordat de laatste stand binnenkomt. Dat geldt ook voor de leverancier zelf.

## 6. Sluipverbruik en "Rest van het huis"
- Basislast = mediaan van het huisverbruik tussen 02:00 en 05:00 (P1-import, eventueel + zelfverbruik zon = 0 's nachts).
- Uitgesplitst in: doorlopende apparaten met een meter, standby van andere meters, en "onverklaard".
- "Rest van het huis" op het dashboard = P1-totaal minus de toegevoegde apparaten, zodat alles optelt tot het hele huis.

## 7. Validatie op echte data

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

# 06 – Roadmap, beslissingen en open vragen

## Fasen

> 22 oktober 2026: fase 1 tot en met 3 zijn in één keer gebouwd als versie 1.0.0 (zie `CHANGELOG.md`). Nu: testfase op de test-HA volgens `docs/08-installeren-en-testen.md`. Het "klaar als"-criterium van fase 1 (laadpaalkosten gelijk aan `automation.tesla_sessierapport`) is het eerste wat getoetst moet worden.

### Fase 1 – Rekenkern zonder paneel
- Config flow: prijs-entiteit of vast tarief, P1-importteller, zonkeuze.
- Discovery van apparaten (docs/03) en apparaten toevoegen via de options flow (tijdelijk, tot het paneel er is).
- Engine: tellerstappen, resets, zon/net-split, tijdgewogen prijs (docs/02).
- Sessies: uit verbruik, uit entiteit, doorlopend.
- Sensoren per apparaat: kosten vandaag, kosten deze maand, laatste sessie (met attributen kWh, zon, net, begin, einde).
- Opslag en herstart-bestendigheid.
- Tests met de testcases uit docs/02 §7.
- **Klaar als**: de laadpaalkosten in HA overeenkomen met `automation.tesla_sessierapport` en de wasmachine-sessies kloppen met de werkelijkheid.

### Fase 2 – Paneel (alleen lezen)
- Dashboard, Sessies, Sluipverbruik, Apparaten (docs/04).
- Licht/donker via HA-thema, smalle schermen, toegankelijkheid.

### Fase 3 – Apparaat toevoegen in het paneel
- Wizard met Bronnen, Gegevenscheck en Voorbeeld aanwijzen.
- Terugrekenen op de recorder-historie.
- Reparaties-meldingen.

### Later
- WashData-events inlezen, vaatwasser/airfryer-profielen.
- Vergelijking met de leverancier waar die sessiekosten rapporteert.
- Publiceren in de HACS-standaardcatalogus.

## Genomen beslissingen
| Beslissing | Waarom |
|---|---|
| Custom integration met eigen paneel, geen App/add-on | Werkt op elke installatie, paneel in de zijbalk |
| Energie uit kWh-tellers, vermogen alleen fallback | Aangetoonde afwijkingen met traag ververst vermogen (docs/02 §7) |
| Zon/net per meetstap via P1-import | Klopt met wat er gefactureerd wordt; geen spookzon |
| Zonkeuze geldt voor alle apparaten | Eén begrijpelijke instelling; leverancier-specifieke vergelijking alleen bij laadsessies |
| Elk apparaat een eigen reeks + "Rest van het huis" | Niets samenvoegen wat de gebruiker niet instelt; totaal = hele huis |
| Voorstellen met reden, gebruiker kiest | Transparantie, werkt voor elk merk |

## Open vragen
- ~~GitHub-repo: naam en account~~ → https://github.com/Radeaus/Energydash
- Testomgeving: aparte test-HA op Proxmox of direct op de eigen HA?
- Integratienaam/domain definitief: `energydash` (NL) of een Engelse naam voor bredere publicatie?
- Terugleververgoeding: uit dezelfde prijs-entiteit (kale prijs) of een aparte entiteit kiezen?
- Gas meenemen (verwarming is nu elektrisch, warm water nog gas)?
- Moet "Sluipverbruik" doorlopende apparaten (server) meetellen of apart tonen? (prototype: apart verklaard)

## Opruimen in de eigen HA (na fase 1)
Na overstap op de integratie zijn deze helpers/entiteiten overbodig:
- Template-sensoren `sensor.tesla_laadvermogen_uit_zon`, `sensor.tesla_laadvermogen_uit_net`, `sensor.tesla_netkosten_vermogen`.
- Integration-sensoren `sensor.tesla_energie_uit_zon_totaal`, `sensor.tesla_energie_uit_net_totaal`, `sensor.tesla_netkosten_totaal`.
- `input_number.tesla_sessie_zon_start`, `_net_start`, `_netkosten_start`.
(Ze worden sinds 22 okt 2026 niet meer gebruikt door de automation.)

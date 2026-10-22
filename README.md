# Energydash voor Home Assistant

Een custom integration (te installeren via HACS) met een eigen paneel in de zijbalk van Home Assistant. Het paneel laat per apparaat zien wat stroom écht kost: per wasbeurt, per laadsessie en aan sluipverbruik. De kosten worden berekend met je eigen dynamische (of vaste) stroomprijs, en zonnestroom wordt eerlijk verrekend.

> Status (22 oktober 2026): **versie 1.0.0** gebouwd: integratie, rekenkern, sessies, terugrekenen en paneel. Klaar voor de testfase op een test-HA. Installeren en testen: [docs/08-installeren-en-testen.md](docs/08-installeren-en-testen.md).

## Inhoud

| Bestand | Waarover |
|---|---|
| [docs/01-concept.md](docs/01-concept.md) | Wat het is, voor wie, en wat er al bestaat (marktverkenning) |
| [docs/02-rekenmethode.md](docs/02-rekenmethode.md) | Hoe energie, zon/net en kosten berekend worden, plus de validatie op echte data |
| [docs/03-entiteiten-herkennen.md](docs/03-entiteiten-herkennen.md) | Hoe de integratie stroommeters automatisch vindt en filtert |
| [docs/04-ux-en-design.md](docs/04-ux-en-design.md) | Schermen, flows, teksten en de Home Assistant-designrichtlijnen |
| [docs/05-architectuur.md](docs/05-architectuur.md) | Technische opbouw: Python-integratie, paneel, opslag, API |
| [docs/06-roadmap.md](docs/06-roadmap.md) | Fasering, beslissingen en open vragen |
| [docs/07-tesla-sessierapport.md](docs/07-tesla-sessierapport.md) | De bestaande HA-automation die dezelfde rekenmethode al gebruikt |
| [docs/08-installeren-en-testen.md](docs/08-installeren-en-testen.md) | Installeren (HACS of handmatig), testplan, opnieuw beginnen |
| [CHANGELOG.md](CHANGELOG.md) | Wat er in elke versie zit |
| [referentie/](referentie/) | Scan van de entiteiten in de eigen HA, Energy-dashboardinstellingen, automation-export |

## Installeren

Kort: voeg deze repo toe als aangepaste opslagplaats in HACS (type Integratie), download Energydash, start HA opnieuw op en voeg de integratie toe via *Instellingen › Apparaten en diensten*. Of kopieer `custom_components/energydash` naar `/config/custom_components/`. Stap voor stap: [docs/08-installeren-en-testen.md](docs/08-installeren-en-testen.md).

## Ontwikkelen

```bash
pip install pytest && pytest            # rekenkern, terugrekenen, herkenning (draait zonder Home Assistant)
cd frontend && npm install && npm run build   # paneel bouwen naar custom_components/energydash/frontend/
npm run watch                            # tijdens ontwikkelen
```

Het gebundelde paneel (`energydash-panel.js`) staat in de repo, zodat HACS het direct kan installeren: bouw opnieuw na elke wijziging in `frontend/src`. GitHub Actions controleert hassfest, HACS, de tests en of de bundel up-to-date is.

## Kernprincipes in één oogopslag

- **Rekenen met kWh-tellers, niet met vermogen.** Een vermogen dat traag ververst (zoals een cloud-laadpaal, elke 5 minuten) mist bij elke start energie en telt bij elke stop "spookzon". Dat is aangetoond op echte data (zie `docs/02-rekenmethode.md`).
- **Zon of net per meetstap via de P1-importteller.** Wat de P1 in hetzelfde interval importeerde komt uit het net; de rest van het apparaatverbruik is eigen zon. Zon dekt dus eerst de rest van het huis.
- **Prijs per kwartier, tijdgewogen.** Een meetstap die over twee kwartieren valt, wordt naar tijd verdeeld over beide kwartierprijzen.
- **Elk apparaat is een eigen reeks.** Niets wordt samengevoegd zonder dat de gebruiker dat instelt. Wat niet bij een apparaat hoort is "Rest van het huis".
- **Voorstellen, geen aannames.** De integratie stelt bronnen en type voor op basis van entity-metadata en historie, zegt waarom, en laat de gebruiker alles zelf kiezen. Een gegevenscheck laat zien wanneer het kan afwijken.
- **Lokaal.** Alles wordt binnen Home Assistant berekend; er gaat niets naar de cloud.

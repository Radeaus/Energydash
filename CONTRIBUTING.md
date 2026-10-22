# Contributing to Energydash

This page is for working on the code of Energydash. To install and use the integration, see the [README](README.md).

## Development

```bash
pip install pytest && pytest                  # tests, without Home Assistant
cd frontend && npm install && npm run build   # build the panel
npm run watch                                 # while developing
```

The tests cover the calculation core, the back-calculation, and the detection. The panel is built to `custom_components/energydash/frontend/`.

The bundled panel (`energydash-panel.js`) is part of the repository, so HACS can install it directly. Rebuild it after every change in `frontend/src`. GitHub Actions checks hassfest, HACS, the tests, and whether the bundle is up to date.

## Demo

The [demo](https://radeaus.github.io/Energydash/) is the real panel with a simulated Home Assistant, published on GitHub Pages by `.github/workflows/demo.yml` on every push to `main`.

- `demo/generate.py` simulates a household for 400 days and runs it through the calculation core. It writes `data.json`.
- `demo/demo.js` answers the panel's websocket calls from that data, with the summary and baseload queries ported from `aggregate.py`. Keep them in step when those queries change.
- `demo/icons.js` holds the icons the panel uses, because Home Assistant normally draws them.

To try it locally:

```bash
python demo/generate.py demo/data.json
cp custom_components/energydash/frontend/energydash-panel.js demo/
cp custom_components/energydash/brand/icon.png demo/
python -m http.server -d demo 8000
```

Then open `http://localhost:8000`. Don't commit the copied files or `data.json`.

## Translations

The integration texts are in `custom_components/energydash/translations/`. The panel texts are in `frontend/src/i18n.ts` (English and Dutch) and `frontend/src/locales/` (German, Spanish, and French). To add a language, add `translations/<code>.json`, a `locales/<code>.ts`, and the code in `DICTS` in `i18n.ts` and in `LANGUAGES` in `tests/test_translations.py`. Custom integrations don't use `strings.json` and can't use `[%key:...%]` references, so write every text out. `pytest` checks that all languages have the same keys and placeholders. See [UX and design](docs/04-ux-and-design.md#translations) for the rules.

## Documentation

- [Concept](docs/01-concept.md): what it is, who it is for, and what already exists.
- [Calculation method](docs/02-calculation-method.md): how energy, solar, grid, and cost are calculated, with the validation against real data.
- [Entity detection](docs/03-entity-detection.md): how energy meters are found and filtered automatically.
- [UX and design](docs/04-ux-and-design.md): screens, flows, texts, and the Home Assistant design guidelines.
- [Architecture](docs/05-architecture.md): Python integration, panel, storage, and API.
- [Roadmap](docs/06-roadmap.md): phases, decisions, and open questions.
- [Tesla session report](docs/07-tesla-session-report.md): the existing automation that uses the same calculation method.
- [Install and test](docs/08-install-and-test.md): test plan and starting over.
- [Reference](referentie/): the entities, Energy dashboard settings, and an automation export.

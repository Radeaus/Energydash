"""Every language has the same keys and placeholders as English, in the panel and the integration.

Custom integrations ship finished translation files: `[%key:...%]` references are not resolved,
and hassfest rejects HTML, URLs, and leading or trailing spaces.
"""

from __future__ import annotations

import json
import pathlib
import re

import pytest

ROOT = pathlib.Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend" / "src"
TRANSLATIONS = ROOT / "custom_components" / "energydash" / "translations"
LANGUAGES = ["en", "nl", "de", "es", "fr"]
LINE = re.compile(r'^  "([^"]+)": ("(?:[^"\\]|\\.)*"),?$', re.M)
PLACEHOLDER = re.compile(r"\{(\w+)\}")


def _block(text: str, name: str) -> dict[str, str]:
    start = text.index(f"const {name}: Record<string, string> = {{")
    end = text.index("\n};", start)
    return {k: json.loads(v) for k, v in LINE.findall(text[start:end])}


def _panel() -> dict[str, dict[str, str]]:
    i18n = (FRONTEND / "i18n.ts").read_text(encoding="utf-8")
    out = {"en": _block(i18n, "en"), "nl": _block(i18n, "nl")}
    for lang in ("de", "es", "fr"):
        out[lang] = _block((FRONTEND / "locales" / f"{lang}.ts").read_text(encoding="utf-8"), lang)
    return out


def _flat(obj: dict, prefix: str = "") -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in obj.items():
        if isinstance(value, dict):
            out.update(_flat(value, f"{prefix}{key}."))
        else:
            out[prefix + key] = value
    return out


def _integration(lang: str) -> dict[str, str]:
    return _flat(json.loads((TRANSLATIONS / f"{lang}.json").read_text(encoding="utf-8")))


def _compare(source: dict[str, str], target: dict[str, str], where: str) -> list[str]:
    problems = [f"{where}: missing {k}" for k in sorted(set(source) - set(target))]
    problems += [f"{where}: extra {k}" for k in sorted(set(target) - set(source))]
    for key in sorted(set(source) & set(target)):
        if set(PLACEHOLDER.findall(source[key])) != set(PLACEHOLDER.findall(target[key])):
            problems.append(f"{where}: placeholders differ for {key}")
        if source[key].count("|") != target[key].count("|"):
            problems.append(f"{where}: column count differs for {key}")
        if not target[key].strip():
            problems.append(f"{where}: empty text for {key}")
    return problems


@pytest.mark.parametrize("lang", LANGUAGES[1:])
def test_panel_language_complete(lang):
    panel = _panel()
    assert _compare(panel["en"], panel[lang], f"panel {lang}") == []


@pytest.mark.parametrize("lang", LANGUAGES[1:])
def test_integration_language_complete(lang):
    assert _compare(_integration("en"), _integration(lang), f"integration {lang}") == []


@pytest.mark.parametrize("lang", LANGUAGES)
def test_integration_texts_pass_hassfest_rules(lang):
    problems = []
    for key, value in _integration(lang).items():
        if value != value.strip() or "[%key" in value or re.search(r"https?://|<[a-z/]", value):
            problems.append(key)
    assert problems == []


def test_every_language_is_selectable():
    i18n = (FRONTEND / "i18n.ts").read_text(encoding="utf-8")
    dicts = re.search(r"const DICTS[^=]*= \{([^}]*)\}", i18n)
    assert dicts is not None
    assert sorted(x.strip() for x in dicts.group(1).split(",")) == sorted(LANGUAGES)
    assert sorted(p.stem for p in TRANSLATIONS.glob("*.json")) == sorted(LANGUAGES)

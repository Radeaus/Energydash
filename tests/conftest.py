"""Load the pure core modules without importing Home Assistant.

The integration package's __init__.py imports homeassistant; the core modules don't. We register
a lightweight package `edcore` that points at the integration folder so relative imports work.
"""

from __future__ import annotations

import sys
import types
from pathlib import Path

PKG_DIR = Path(__file__).resolve().parent.parent / "custom_components" / "energydash"

if "edcore" not in sys.modules:
    pkg = types.ModuleType("edcore")
    pkg.__path__ = [str(PKG_DIR)]  # type: ignore[attr-defined]
    sys.modules["edcore"] = pkg

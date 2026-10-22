"""Constants for Energydash. Kept free of Home Assistant imports so the core is testable."""

from __future__ import annotations

DOMAIN = "energydash"
VERSION = "1.2.5"

PANEL_URL_PATH = "energydash"
PANEL_COMPONENT = "energydash-panel"
PANEL_TITLE = "Energydash"
PANEL_ICON = "mdi:cash-clock"
STATIC_URL = "/energydash_static"

STORAGE_VERSION = 1
STORAGE_KEY_CONFIG = f"{DOMAIN}.config"
STORAGE_KEY_DATA = f"{DOMAIN}.data"
STORAGE_KEY_ARCHIVE = f"{DOMAIN}.archive"
RECENT_DAYS = 35

# Config entry keys
CONF_CONTRACT = "contract"
CONF_PRICE_ENTITY = "price_entity"
CONF_PRICE_NORMAL = "price_normal"
CONF_PRICE_LOW = "price_low"
CONF_IMPORT_ENTITY = "import_entity"
CONF_EXPORT_ENTITY = "export_entity"
CONF_SOLAR_ENTITY = "solar_entity"
CONF_SOLAR_MODE = "solar_mode"
CONF_EXPORT_PRICE_ENTITY = "export_price_entity"
CONF_EXPORT_PRICE_FIXED = "export_price_fixed"
CONF_EXPORT_PRICE_MODE = "export_price_mode"
CONF_PRICE_MARKUP = "price_markup"  # €/kWh added to the price entity (taxes, supplier fee)

CONTRACT_DYNAMIC = "dynamic"
CONTRACT_FIXED = "fixed"

# Export price: from the price entity's forecast (or derived), the same as the import price
# (net metering), another entity, or a fixed amount.
EXPORT_MODE_AUTO = "auto"
EXPORT_MODE_SAME = "same"
EXPORT_MODE_ENTITY = "entity"
EXPORT_MODE_FIXED = "fixed"
EXPORT_MODES = [EXPORT_MODE_AUTO, EXPORT_MODE_SAME, EXPORT_MODE_ENTITY, EXPORT_MODE_FIXED]

SOLAR_MODE_EXPORT = "export"  # "Wat je anders had gekregen" (default)
SOLAR_MODE_FREE = "free"  # "Niets"
SOLAR_MODE_GRID = "grid"  # "Hetzelfde als stroom uit het net"
SOLAR_MODES = [SOLAR_MODE_EXPORT, SOLAR_MODE_FREE, SOLAR_MODE_GRID]

# Device types
TYPE_SESSIONS = "sessions"
TYPE_CONTINUOUS = "continuous"
TYPE_CHARGER = "charger"
DEVICE_TYPES = [TYPE_SESSIONS, TYPE_CONTINUOUS, TYPE_CHARGER]

SESSION_FROM_POWER = "power"
SESSION_FROM_ENTITY = "entity"

# Defaults for "Sessies uit het verbruik"
DEFAULT_THRESHOLD_W = 3.0
DEFAULT_OFF_DELAY_MIN = 5.0
DEFAULT_MIN_DURATION_MIN = 10.0

# Engine timing
BASE_REFRESH_S = 300  # refresh P1 base every 5 minutes while idle
BASE_IDLE_S = 600  # device counts as idle after 10 minutes without counter change
SESSION_GRACE_S = 600  # steps arriving up to 10 minutes after a session ended still belong to it
HOUSE_TICK_S = 60
MAX_STEP_S = 6 * 3600  # longer gaps are still counted, but flagged in the step log
MAX_PLAUSIBLE_W = 25_000  # more than a home connection or 22 kW charger delivers: not used at home
GAP_LEARN_MAX_S = 3 * 3600  # counter update gaps up to this long teach the tracker how slow a counter is

# Retention
HOURLY_RETENTION_DAYS = 400
STEP_LOG_SIZE = 200
MAX_SESSIONS = 2000

HOUSE_KEY = "_house"
REST_KEY = "_rest"
EXPORT_KEY = "_export"  # solar export per hour: [kWh, 0, 0, 0, export value]

# Bucket fields: [kwh, zon_kwh, net_cost, all_net_cost, zon_export_value]
F_KWH, F_ZON, F_NET_COST, F_ALL_NET, F_ZON_EXPORT = range(5)
N_FIELDS = 5

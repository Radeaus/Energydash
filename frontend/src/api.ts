// Types and websocket calls for the Energydash API (custom_components/energydash/websocket.py).

export interface Hass {
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  connection: {
    subscribeMessage<T>(cb: (msg: T) => void, msg: Record<string, unknown>): Promise<() => void>;
  };
  states: Record<string, HassState>;
  language: string;
  locale?: { language: string };
  themes?: { darkMode?: boolean };
  user?: { is_admin: boolean };
}

export interface HassState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
}

export type DeviceType = "sessions" | "continuous" | "charger";
export type SessionSource = "power" | "entity";
export type SolarMode = "export" | "free" | "grid";
export type ExportMode = "auto" | "same" | "entity" | "fixed";
export type Meter = string | string[] | null | undefined;

export interface Device {
  id?: string;
  name: string;
  type: DeviceType;
  energy_entity: string;
  energy_is_power: boolean;
  power_entity?: string | null;
  session_source: SessionSource;
  session_entity?: string | null;
  session_states: string[];
  threshold_w: number;
  off_delay_min: number;
  min_duration_min: number;
  color?: number | string | null; // palette index or "#rrggbb"
  icon?: string | null;
  added?: string;
}

export interface Numbers {
  kwh: number;
  zon: number;
  net: number;
  net_cost: number;
  zon_cost: number;
  all_net: number;
  cost: number;
  price_per_kwh: number | null;
  grid_price_per_kwh: number | null;
}

// contract "dynamic" means: price from an entity. null until the user has chosen (quick start).
export interface Settings {
  contract: "dynamic" | "fixed" | null;
  import_entity: Meter; // one counter or several (normal and low tariff), added up
  export_entity?: Meter;
  solar_entity?: Meter;
  battery_charge_entity?: Meter; // energy into the home battery
  battery_discharge_entity?: Meter; // energy out of the home battery
  solar_mode: SolarMode | null;
  price_entity?: string | null;
  price_markup?: number | null; // per kWh on top of the entity's price; 0 = the entity is the full price
  price_vat?: number | null; // percentage over the entity's price plus the markup
  low_start?: string | null; // "23:00": start of the low tariff (fixed price, normal and low)
  low_end?: string | null; // "07:00"
  low_weekend?: boolean | null; // low tariff all weekend
  export_price_mode?: ExportMode | null;
  export_price_entity?: string | null;
  export_price_fixed?: number | null;
  price_normal?: number | null;
  price_low?: number | null; // null with a fixed price: one price at all times
}

export function meterIds(m: Meter): string[] {
  if (Array.isArray(m)) return m.filter((x) => !!x);
  return m ? [m] : [];
}

export interface Session {
  id: string;
  device_id: string;
  start: string;
  end: string | null;
  fields: [number, number, number, number, number];
  quarters: [string, number, number, number, number][];
  steps: number;
  notes: string[];
  running?: boolean;
}

export interface ConfigResult {
  version: string;
  is_admin: boolean;
  settings: Settings;
  devices: Device[];
  archived: { id: string; name: string; type: DeviceType; removed: string }[];
  numbers: Record<string, { today: Numbers; month: Numbers }>;
  open_sessions: Record<string, Session>;
  status: {
    busy: Record<string, string>;
    price_attribute: string | null;
    price_scale: number;
    price_from_action?: boolean; // forecast fetched through an action (Nord Pool, Tibber, EnergyZero, easyEnergy)
    price_unit?: string | null;
    price_factor?: number; // unit conversion to the main currency per kWh (ct/kWh: 0.01)
    price_current: number | null;
    price_export_forecast?: boolean;
    export_price_now?: number | null;
    forecast_export_now?: number | null; // export price in the saved price entity's forecast, now
    import_now: number | null;
    house_since: string | null;
  };
  currency: string;
  time_zone: string;
}

export interface Candidate {
  entity_id: string;
  name: string;
  unit: string | null;
  device_name: string | null;
  area: string | null;
  in_energy_prefs: boolean;
  power_entity: string | null;
  power_only: boolean;
  type: DeviceType;
  type_reason: string;
}

export interface Check {
  level: "ok" | "warn" | "bad";
  code: string;
  value: unknown;
}

export interface Analysis {
  checks: Check[];
  suggested_type: DeviceType;
  type_reason: string;
  power_settings: { threshold_w: number; off_delay_min: number; min_duration_min: number; standby_w?: number };
  session_candidates: { entity_id: string; name: string; same_device: boolean; state: string; options: string[] }[];
  session_states?: string[];
  session_suggested_states?: string[];
  session_check?: Check;
  history_days: number;
  has_history: boolean;
}

export interface Preview {
  start: string;
  end: string;
  power: [string, number][];
  sessions: { start: string; end: string; minutes: number; kwh: number | null }[];
}

export type SuggestReason = "in_prefs" | "device" | "no_history" | "no_sessions" | "power_only" | "in_car" | "data" | "loose" | "duplicate_charger";

export interface Suggestion {
  device: Device;
  candidate: Candidate;
  summary: { days: number; sessions: number | null; kwh_avg: number | null; avg_w: number | null; kwh_day: number | null; spark: number[] };
  checked: boolean;
  reason: SuggestReason;
  in_energy_prefs: boolean;
  area: string | null;
}

export type Period = "week" | "month" | "year";

export interface Summary {
  first_day: string;
  last_day: string;
  period: Period;
  // solar: kWh used directly and the grid power that saved (value), export and its earnings
  days: { date: string; series: Record<string, Numbers>; solar: { kwh: number; value: number; export_kwh: number; export_value: number } }[];
  totals: Record<string, Numbers>;
  has_house: boolean;
  export: { available: boolean; kwh: number; value: number };
  hours: { hour: number; kwh: number; price: number | null }[];
  previous_total: number | null;
}

export interface Baseload {
  available: boolean;
  watt?: number;
  kwh_day?: number;
  price?: number | null;
  cost_month?: number | null;
  cost_year?: number | null;
  explained?: { device_id: string; name: string; watt: number; continuous: boolean }[];
  unexplained_w?: number;
  weeks?: { week: string; watt: number }[];
  nights?: number;
}

export interface StepLog {
  t0: string;
  t1: string;
  kwh: number;
  import: number | null;
  net: number;
  zon: number;
  price: number;
  net_cost: number;
  notes: string[];
}

export const api = {
  config: (h: Hass) => h.callWS<ConfigResult>({ type: "energydash/config" }),
  saveSettings: (h: Hass, settings: Settings, recalculate = false) =>
    h.callWS<{ settings: Settings }>({ type: "energydash/settings/save", settings, recalculate }),
  discover: (h: Hass) => h.callWS<{ suggested: Candidate[]; others: Candidate[] }>({ type: "energydash/discover" }),
  suggest: (h: Hass) => h.callWS<{ items: Suggestion[]; days: number }>({ type: "energydash/suggest" }),
  analyze: (h: Hass, req: { energy_entity: string; energy_is_power?: boolean; power_entity?: string | null; session_entity?: string | null }) =>
    h.callWS<Analysis>({ type: "energydash/analyze", ...req }),
  preview: (h: Hass, dev: Device) =>
    h.callWS<Preview>({
      type: "energydash/preview_sessions",
      energy_entity: dev.energy_entity,
      energy_is_power: dev.energy_is_power,
      power_entity: dev.power_entity ?? null,
      session_source: dev.session_source,
      session_entity: dev.session_entity ?? null,
      session_states: dev.session_states,
      threshold_w: dev.threshold_w,
      off_delay_min: dev.off_delay_min,
      min_duration_min: dev.min_duration_min,
    }),
  saveDevice: (h: Hass, device: Device, recalculate = true) =>
    h.callWS<{ device: Device }>({ type: "energydash/devices/save", device, recalculate }),
  saveDevices: (h: Hass, devices: Device[]) => h.callWS<{ devices: Device[] }>({ type: "energydash/devices/save_many", devices }),
  deleteDevice: (h: Hass, device_id: string) => h.callWS({ type: "energydash/devices/delete", device_id }),
  recalculate: (h: Hass, device_id?: string) =>
    h.callWS({ type: "energydash/recalculate", ...(device_id ? { device_id } : {}) }),
  sessions: (h: Hass) => h.callWS<{ sessions: Session[]; solar_mode: SolarMode }>({ type: "energydash/sessions", limit: 300 }),
  summary: (h: Hass, period: Period, offset: number) =>
    h.callWS<Summary>({ type: "energydash/summary", period, offset }),
  baseload: (h: Hass) => h.callWS<Baseload>({ type: "energydash/baseload" }),
  steps: (h: Hass, device_id: string) => h.callWS<{ steps: StepLog[]; tracker: Record<string, unknown> | null }>({ type: "energydash/steps", device_id }),
  reset: (h: Hass, scope: "data" | "all") => h.callWS({ type: "energydash/reset", scope }),
  exportConfig: (h: Hass) => h.callWS<Record<string, unknown>>({ type: "energydash/export" }),
  importConfig: (h: Hass, data: Record<string, unknown>, apply_settings: boolean) =>
    h.callWS<{ devices: number }>({ type: "energydash/import", data, apply_settings }),
};

// Session cost under the chosen solar valuation (mirror of engine.cost_of).
export function sessionCost(f: Session["fields"], mode: SolarMode): number {
  if (mode === "free") return f[2];
  if (mode === "grid") return f[3];
  return f[2] + f[4];
}

export function zonCost(f: Session["fields"], mode: SolarMode): number {
  if (mode === "free") return 0;
  if (mode === "grid") return f[3] - f[2];
  return f[4];
}

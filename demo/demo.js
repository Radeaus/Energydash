// Energydash demo: the real panel with a simulated Home Assistant.
//
// data.json comes from demo/generate.py, which runs the real calculation core over a simulated
// household. This file places that data relative to the visitor's today and answers the panel's
// websocket calls. Queries follow custom_components/energydash/aggregate.py (summary, baseload).
// Changes in the demo only live in this browser tab.

import { ICONS } from "./icons.js";

// ------------------------------------------------------------------ Home Assistant stand-ins
// Like the real <ha-icon>, the icon is drawn in its own shadow DOM, so the panel's styles for
// its own svg elements (charts, the energy flow) never reach it.
class HaIcon extends HTMLElement {
  static get observedAttributes() { return ["icon"]; }
  set icon(v) { this.setAttribute("icon", v); }
  get icon() { return this.getAttribute("icon"); }
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML = `<style>
      :host { display: inline-flex; flex: none; width: var(--mdc-icon-size, 24px); height: var(--mdc-icon-size, 24px); vertical-align: middle; }
      svg { width: 100%; height: 100%; fill: currentColor; }
    </style><svg viewBox="0 0 24 24" aria-hidden="true"><path></path></svg>`;
  }
  connectedCallback() { this._render(); }
  attributeChangedCallback() { this._render(); }
  _render() {
    this.shadowRoot.querySelector("path").setAttribute("d", ICONS[this.getAttribute("icon")] ?? ICONS["mdi:flash"]);
  }
}
customElements.define("ha-icon", HaIcon);
customElements.define("ha-menu-button", class extends HTMLElement {});

// ------------------------------------------------------------------ fields and helpers
const F_KWH = 0, F_ZON = 1, F_NET = 2, F_ALL = 3, F_EXP = 4;
const zero = () => [0, 0, 0, 0, 0];
const add = (t, s) => { for (let i = 0; i < 5; i++) t[i] += s[i]; return t; };
const r4 = (v) => Math.round(v * 10000) / 10000;
const pad = (n) => String(n).padStart(2, "0");
const HOUSE = "_house", REST = "_rest", EXPORT = "_export";

function costOf(f, mode) {
  if (mode === "free") return f[F_NET];
  if (mode === "grid") return f[F_ALL];
  return f[F_NET] + f[F_EXP];
}
function zonCostOf(f, mode) {
  if (mode === "free") return 0;
  if (mode === "grid") return f[F_ALL] - f[F_NET];
  return f[F_EXP];
}
function describe(f, mode) {
  const kwh = f[F_KWH], zon = f[F_ZON], cost = costOf(f, mode);
  return {
    kwh: r4(kwh), zon: r4(zon), net: r4(kwh - zon), net_cost: r4(f[F_NET]), zon_cost: r4(zonCostOf(f, mode)),
    all_net: r4(f[F_ALL]), cost: r4(cost),
    price_per_kwh: kwh > 0.0005 ? r4(cost / kwh) : null, grid_price_per_kwh: kwh > 0.0005 ? r4(f[F_ALL] / kwh) : null,
  };
}
function restFields(house, devices) {
  if (house[F_KWH] - devices[F_KWH] <= 1e-9) return zero();
  return house.map((v, i) => (i === F_KWH || i === F_ZON ? Math.max(v - devices[i], 0) : v - devices[i]));
}
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// ------------------------------------------------------------------ time: data days to the visitor's dates
const DATA = await (await fetch("./data.json")).json();
const now = new Date();
const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const day0 = new Date(today0.getFullYear(), today0.getMonth(), today0.getDate() - (DATA.days - 1));
const nowMin = (DATA.days - 1) * 1440 + now.getHours() * 60 + now.getMinutes();
const nowHour = Math.floor(nowMin / 60);
const dayStr = (i) => { const d = new Date(day0.getFullYear(), day0.getMonth(), day0.getDate() + i); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const isoAt = (min) => (min == null ? null : new Date(day0.getFullYear(), day0.getMonth(), day0.getDate(), 0, min).toISOString());
const keyOf = (h) => `${dayStr(Math.floor(h / 24))}T${pad(h % 24)}`;
const todayStr = dayStr(DATA.days - 1);
const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };

// ------------------------------------------------------------------ language and theme from the URL
const params = new URLSearchParams(location.search);
const LANGS = { en: "English", nl: "Nederlands", de: "Deutsch", es: "Español", fr: "Français" };
// English unless the visitor picks another language (kept in the URL, so a link can share it).
let LANG = params.get("lang") in LANGS ? params.get("lang") : "en";
let DARK = params.has("dark") ? params.get("dark") === "1" : matchMedia("(prefers-color-scheme: dark)").matches;
let CURRENCY = "EUR";

// ------------------------------------------------------------------ state of the demo
// Device names are what a user would type, so they follow the chosen language.
const NAMES = {
  nl: { washer: "Wasmachine", dryer: "Droger", dishwasher: "Vaatwasser", charger: "Laadpaal", server: "Server", heat_pump: "Warmtepomp", freezer: "Vriezer", oven: "Oven" },
  de: { washer: "Waschmaschine", dryer: "Trockner", dishwasher: "Geschirrspüler", charger: "Wallbox", server: "Server", heat_pump: "Wärmepumpe", freezer: "Gefrierschrank", oven: "Backofen" },
  es: { washer: "Lavadora", dryer: "Secadora", dishwasher: "Lavavajillas", charger: "Cargador", server: "Servidor", heat_pump: "Bomba de calor", freezer: "Congelador", oven: "Horno" },
  fr: { washer: "Lave-linge", dryer: "Sèche-linge", dishwasher: "Lave-vaisselle", charger: "Borne de recharge", server: "Serveur", heat_pump: "Pompe à chaleur", freezer: "Congélateur", oven: "Four" },
};
const deviceName = (d) => NAMES[LANG]?.[d.id] ?? d.name;
const extraName = (key, fallback) => NAMES[LANG]?.[key] ?? fallback;
const fresh = () => {
  const hours = {};
  for (const [series, rows] of Object.entries(DATA.hours)) {
    const b = {};
    for (const [h, ...vals] of rows) if (h <= nowHour) b[keyOf(h)] = vals;
    hours[series] = b;
  }
  const sessions = [];
  const open = {};
  for (const s of DATA.sessions) {
    if (s.start > nowMin) continue;
    const quarters = s.quarters.filter((q) => q[0] <= nowMin).map(([m, ...v]) => [isoAt(m), ...v]);
    const item = { id: s.id, device_id: s.device_id, start: isoAt(s.start), end: isoAt(s.end), fields: s.fields, quarters, steps: s.steps, notes: s.notes };
    if (s.end > nowMin) {
      const f = zero();
      for (const [, kwh, zon, price, exp] of quarters) add(f, [kwh, zon, (kwh - zon) * price, kwh * price, zon * exp]);
      open[s.device_id] = { ...item, end: null, fields: f, running: true };
    } else sessions.push(item);
  }
  const steplog = {};
  for (const [dev, entries] of Object.entries(DATA.steplog)) steplog[dev] = entries.filter((e) => e.t1 <= nowMin).map((e) => ({ ...e, t0: isoAt(e.t0), t1: isoAt(e.t1) }));
  return {
    hours, sessions, open, steplog,
    devices: DATA.devices.map((d) => ({ ...d, name: deviceName(d), added: isoAt(0) })),
    archived: [],
    busy: {},
    settings: {
      contract: "dynamic", price_entity: "sensor.electricity_price", price_markup: 0, price_vat: null,
      import_entity: ["sensor.smart_meter_energy_import"], export_entity: ["sensor.smart_meter_energy_export"],
      solar_entity: ["sensor.inverter_energy"], battery_charge_entity: [], battery_discharge_entity: [],
      solar_mode: "export", export_price_mode: "auto", export_price_entity: null, export_price_fixed: null,
      price_normal: null, price_low: null, low_start: null, low_end: null, low_weekend: null,
    },
  };
};
let S = fresh();
const KNOWN = Object.fromEntries(DATA.devices.map((d) => [d.energy_entity, d.id]));

// ------------------------------------------------------------------ queries (aggregate.py)
function sumRange(series, a, b) {
  const t = zero();
  for (const [k, v] of Object.entries(S.hours[series] ?? {})) if (k >= a && k < b) add(t, v);
  return t;
}

function summary(firstDay, days, mode, byMonth) {
  const dayKeys = Array.from({ length: days }, (_, i) => addDays(firstDay, i));
  const a = `${dayKeys[0]}T00`, b = `${addDays(dayKeys[dayKeys.length - 1], 1)}T00`;
  const ids = S.devices.map((d) => d.id);
  const hasHouse = Object.keys(S.hours[HOUSE] ?? {}).length > 0;
  const perHour = {};
  for (const sid of [...ids, HOUSE]) for (const [k, v] of Object.entries(S.hours[sid] ?? {})) if (k >= a && k < b) (perHour[k] ??= {})[sid] = v;
  const rowKey = byMonth ? (d) => `${d.slice(0, 7)}-01` : (d) => d;
  const rows = {};
  for (const d of dayKeys) rows[rowKey(d)] ??= {};
  const totals = {}, dayWhole = {};
  const T = (o, k) => (o[k] ??= zero());
  const profile = Array.from({ length: 24 }, () => [0, 0]);
  for (const [key, bySeries] of Object.entries(perHour)) {
    const day = rowKey(key.slice(0, 10)), hour = Number(key.slice(11, 13));
    const devSum = zero();
    for (const sid of ids) {
      const v = bySeries[sid];
      if (v) { add(devSum, v); add(T(rows[day], sid), v); add(T(totals, sid), v); }
    }
    let whole;
    if (hasHouse) {
      const house = bySeries[HOUSE] ?? zero();
      const rest = restFields(house, devSum);
      add(T(rows[day], REST), rest); add(T(totals, REST), rest);
      whole = house[F_KWH] >= devSum[F_KWH] ? house : devSum;
      add(T(totals, HOUSE), whole);
    } else whole = devSum;
    add(T(dayWhole, day), whole);
    profile[hour][0] += whole[F_KWH]; profile[hour][1] += whole[F_ALL];
  }
  if (!hasHouse) { const t = zero(); for (const i of ids) if (totals[i]) add(t, totals[i]); totals[HOUSE] = t; }
  const exported = sumRange(EXPORT, a, b);
  const dayExport = {};
  for (const [k, v] of Object.entries(S.hours[EXPORT] ?? {})) if (k >= a && k < b) add(T(dayExport, rowKey(k.slice(0, 10))), v);
  const solar = (d) => {
    const w = dayWhole[d] ?? zero(), e = dayExport[d] ?? zero();
    return { kwh: r4(w[F_ZON]), value: r4(w[F_ALL] - w[F_NET]), export_kwh: r4(e[F_KWH]), export_value: r4(e[F_EXP]) };
  };
  const desc = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, describe(v, mode)]));
  const n = Math.max(days, 1);
  return {
    first_day: dayKeys[0],
    days: Object.entries(rows).map(([d, r]) => ({ date: d, series: desc(r), solar: solar(d) })),
    totals: desc(totals),
    has_house: hasHouse,
    export: { available: EXPORT in S.hours, kwh: r4(exported[F_KWH]), value: r4(exported[F_EXP]) },
    hours: profile.map(([k, v], h) => ({ hour: h, kwh: r4(k / n), price: k > 0.0005 ? r4(v / k) : null })),
  };
}

function isoWeek(s) {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return `${dt.getUTCFullYear()}-W${pad(Math.ceil(((dt - y0) / 86400000 + 1) / 7))}`;
}

function baseload(mode, weeks = 8) {
  const house = S.hours[HOUSE] ?? {};
  const sessionIds = S.devices.filter((d) => d.type !== "continuous").map((d) => d.id);
  const nights = {};
  for (let d = addDays(todayStr, -7 * weeks); d <= todayStr; d = addDays(d, 1)) {
    const keys = [2, 3, 4].map((h) => `${d}T${pad(h)}`);
    if (!keys.every((k) => k in house)) continue;
    nights[d] = Math.min(...keys.map((k) => Math.max(house[k][F_KWH] - sessionIds.reduce((a, sid) => a + (S.hours[sid]?.[k]?.[F_KWH] ?? 0), 0), 0))) * 1000;
  }
  const weekAgo = addDays(todayStr, -7);
  const recent = Object.entries(nights).filter(([k]) => k >= weekAgo).map(([, v]) => v);
  if (!recent.length) return { available: Object.keys(house).length > 0, nights: Object.keys(nights).length };
  const baseW = median(recent);
  const nightAvg = (series) => {
    const vals = Object.keys(nights).filter((k) => k >= weekAgo).map((k) => [2, 3, 4].reduce((a, h) => a + (S.hours[series]?.[`${k}T${pad(h)}`]?.[F_KWH] ?? 0), 0) / 3 * 1000);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const parts = [];
  let explained = 0;
  for (const dev of S.devices) {
    if (dev.type !== "continuous") continue;
    const watt = nightAvg(dev.id);
    if (watt < 0.5) continue;
    explained += watt;
    parts.push({ device_id: dev.id, name: dev.name, watt: Math.round(watt * 10) / 10, continuous: true });
  }
  const month = sumRange(HOUSE, `${addDays(todayStr, -30)}T00`, `${addDays(todayStr, 1)}T00`);
  const price = month[F_KWH] > 0.01 ? costOf(month, mode) / month[F_KWH] : null;
  const kwhDay = baseW * 24 / 1000;
  const weekly = {};
  for (const [k, w] of Object.entries(nights)) (weekly[isoWeek(k)] ??= []).push(w);
  return {
    available: true, watt: Math.round(baseW * 10) / 10, kwh_day: Math.round(kwhDay * 1000) / 1000,
    price: price == null ? null : r4(price),
    cost_month: price == null ? null : Math.round(kwhDay * 30.4 * price * 100) / 100,
    cost_year: price == null ? null : Math.round(kwhDay * 365 * price * 100) / 100,
    explained: parts, unexplained_w: Math.round(Math.max(baseW - explained, 0) * 10) / 10,
    weeks: Object.entries(weekly).sort().slice(-weeks).map(([week, v]) => ({ week, watt: Math.round(median(v) * 10) / 10 })),
    nights: Object.keys(nights).length,
  };
}

function deviceNumbers(id, mode) {
  const t = `${todayStr}T00`, end = `${addDays(todayStr, 1)}T00`, m = `${todayStr.slice(0, 7)}-01T00`;
  return { today: describe(sumRange(id, t, end), mode), month: describe(sumRange(id, m, end), mode) };
}

const addMonths = (s, n) => { const [y, m] = s.split("-").map(Number); const x = new Date(y, m - 1 + n, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-01`; };
const minStr = (a, b) => (a < b ? a : b);
const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000);

function wsSummary(period, offset) {
  const mode = S.settings.solar_mode ?? "export";
  let first, last, prevFirst;
  if (period === "week") {
    const wd = (new Date(`${todayStr}T12:00:00`).getDay() + 6) % 7;
    first = addDays(todayStr, -(wd + 7 * offset));
    last = minStr(addDays(first, 6), todayStr);
    prevFirst = addDays(first, -7);
  } else if (period === "month") {
    first = addMonths(`${todayStr.slice(0, 7)}-01`, -offset);
    last = minStr(addDays(addMonths(first, 1), -1), todayStr);
    prevFirst = addMonths(first, -1);
  } else {
    const y = Number(todayStr.slice(0, 4)) - offset;
    first = `${y}-01-01`;
    last = minStr(`${y}-12-31`, todayStr);
    prevFirst = `${y - 1}-01-01`;
  }
  const days = daysBetween(first, last) + 1;
  const res = summary(first, days, mode, period === "year");
  const prev = summary(prevFirst, days, mode, period === "year");
  const prevHouse = prev.totals[HOUSE];
  res.previous_total = prevHouse && prevHouse.kwh > 0 ? prevHouse.cost : null;
  res.last_day = last;
  res.period = period;
  return res;
}

// ------------------------------------------------------------------ entities
const priceNow = () => DATA.prices.all_in[96 + Math.floor((now.getHours() * 60 + now.getMinutes()) / 15)];
const exportNow = () => DATA.prices.market[96 + Math.floor((now.getHours() * 60 + now.getMinutes()) / 15)];
function states() {
  const st = {};
  const set = (id, state, attrs) => (st[id] = { entity_id: id, state: String(state), attributes: attrs });
  set("sensor.electricity_price", priceNow().toFixed(5), { unit_of_measurement: "EUR/kWh", friendly_name: "Electricity price", device_class: "monetary" });
  set("sensor.electricity_export_price", exportNow().toFixed(5), { unit_of_measurement: "EUR/kWh", friendly_name: "Export price" });
  const e = (id, v, name) => set(id, v, { unit_of_measurement: "kWh", device_class: "energy", state_class: "total_increasing", friendly_name: name });
  e("sensor.smart_meter_energy_import", DATA.meters.import, "Smart meter energy import");
  e("sensor.smart_meter_energy_export", DATA.meters.export, "Smart meter energy export");
  e("sensor.inverter_energy", DATA.meters.solar, "Inverter energy");
  for (const d of DATA.devices) {
    const c = DATA.counters[d.id];
    e(d.energy_entity, c[c.length - 1][1], `${d.name} energy`);
    const p = DATA.power[d.id];
    set(d.power_entity, p[p.length - 1][1], { unit_of_measurement: "W", device_class: "power", state_class: "measurement", friendly_name: `${d.name} power` });
  }
  set("sensor.charger_status", S.open.charger ? "Charging" : "Standby", { friendly_name: "Charger status", options: ["Standby", "Connected", "Charging", "Error"] });
  e("sensor.freezer_energy", 812.4, "Freezer energy");
  set("sensor.freezer_power", 64, { unit_of_measurement: "W", device_class: "power", friendly_name: "Freezer power" });
  e("sensor.oven_energy", 133.9, "Oven energy");
  set("sensor.oven_power", 0.4, { unit_of_measurement: "W", device_class: "power", friendly_name: "Oven power" });
  return st;
}

// Extra meters for adding a device: a freezer and an oven with a simulated week of power.
const EXTRA = {
  "sensor.freezer_energy": { key: "freezer", name: "Freezer", type: "continuous", power: "sensor.freezer_power", icon: "mdi:fridge",
    watt: (m) => ((m % 50) < 18 ? 95 : 3) },
  "sensor.oven_energy": { key: "oven", name: "Oven", type: "sessions", power: "sensor.oven_power", icon: "mdi:stove",
    watt: (m) => { const d = Math.floor(m / 1440), t = m % 1440; return d % 3 === 1 && t >= 1050 && t < 1095 ? (t % 10 < 6 ? 2600 : 300) : 0.4; } },
};

function candidate(entity, extra) {
  const d = DATA.devices.find((x) => x.energy_entity === entity);
  const name = d ? deviceName(d) : extraName(extra.key, extra.name);
  return {
    entity_id: entity, name, unit: "kWh", device_name: name, area: d ? (d.type === "continuous" ? "Utility room" : "Kitchen") : "Kitchen",
    in_energy_prefs: !!d, power_entity: d?.power_entity ?? extra.power, power_only: false,
    type: d?.type ?? extra.type, type_reason: "name",
  };
}

function powerTrace(entity) {
  const id = KNOWN[entity];
  const startMin = nowMin - 7 * 1440;
  if (id) return DATA.power[id].filter(([m]) => m >= startMin && m <= nowMin).map(([m, w]) => [isoAt(m), w]);
  const ex = EXTRA[entity];
  const out = [];
  for (let m = startMin; m <= nowMin; m += 15) out.push([isoAt(m), ex.watt(m)]);
  return out;
}

function previewSessions(entity) {
  const id = KNOWN[entity];
  if (id) return S.sessions.filter((s) => s.device_id === id && s.start >= isoAt(nowMin - 7 * 1440))
    .map((s) => ({ start: s.start, end: s.end, minutes: Math.round((new Date(s.end) - new Date(s.start)) / 60000), kwh: r4(s.fields[0]) }));
  if (entity === "sensor.oven_energy") {
    const out = [];
    for (let d = DATA.days - 8; d < DATA.days; d++) if (d % 3 === 1 && d * 1440 + 1095 < nowMin) out.push({ start: isoAt(d * 1440 + 1050), end: isoAt(d * 1440 + 1095), minutes: 45, kwh: 1.42 });
    return out;
  }
  return [];
}

function analysis(entity, sessionEntity) {
  const id = KNOWN[entity];
  const d = DATA.devices.find((x) => x.id === id);
  const type = d?.type ?? EXTRA[entity]?.type ?? "sessions";
  const res = {
    checks: [
      { level: "ok", code: "unit", value: "kWh, energy" },
      { level: "ok", code: "state_class", value: "total_increasing" },
      id === "charger" ? { level: "ok", code: "resets", value: 3 } : { level: "ok", code: "no_resets", value: 0 },
      { level: "ok", code: "refresh", value: id === "charger" ? 60 : 10 },
      { level: "ok", code: "interruptions", value: 0 },
    ],
    suggested_type: type, type_reason: "name",
    power_settings: { threshold_w: d?.threshold_w ?? 3, off_delay_min: d?.off_delay_min ?? 5, min_duration_min: d?.min_duration_min ?? 10, standby_w: 0.4 },
    session_candidates: id === "charger" ? [{ entity_id: "sensor.charger_status", name: "Charger status", same_device: true, state: S.open.charger ? "Charging" : "Standby", options: ["Standby", "Connected", "Charging", "Error"] }] : [],
    history_days: 7, has_history: true,
  };
  if (sessionEntity) {
    res.session_states = ["Charging", "Connected", "Error", "Standby"];
    res.session_suggested_states = ["Charging", "Connected"];
    res.session_check = { level: "ok", code: "session_refresh", value: 60 };
  }
  return res;
}

// ------------------------------------------------------------------ websocket calls
const subscribers = new Set();
const notify = () => subscribers.forEach((cb) => cb({ type: "changed", busy: { ...S.busy } }));
function busyFor(ids, ms = 1800) {
  for (const id of ids) S.busy[id] = "recalculating";
  notify();
  setTimeout(() => { for (const id of ids) delete S.busy[id]; notify(); }, ms);
}
const clone = (x) => JSON.parse(JSON.stringify(x));

function saveDevice(raw) {
  const id = raw.id || KNOWN[raw.energy_entity] || raw.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const dev = { ...raw, id, added: raw.added ?? new Date().toISOString() };
  const i = S.devices.findIndex((d) => d.id === id);
  if (i >= 0) S.devices[i] = dev; else S.devices.push(dev);
  S.archived = S.archived.filter((a) => a.id !== id);
  if (!S.hours[id] && fresh().hours[id]) Object.assign(S, { hours: { ...S.hours, [id]: fresh().hours[id] } });
  return dev;
}

const handlers = {
  "energydash/config": () => {
    const mode = S.settings.solar_mode ?? "export";
    return {
      version: "demo", is_admin: true, settings: S.settings, devices: S.devices, archived: S.archived,
      numbers: Object.fromEntries(S.devices.map((d) => [d.id, deviceNumbers(d.id, mode)])),
      open_sessions: Object.fromEntries(Object.entries(S.open).filter(([id]) => S.devices.some((d) => d.id === id))),
      status: {
        busy: S.busy, price_attribute: "forecast", price_from_action: false, price_scale: 1, price_unit: "EUR/kWh", price_factor: 1,
        price_current: priceNow(), price_export_forecast: true, export_price_now: exportNow(), forecast_export_now: exportNow(),
        import_now: DATA.meters.import, house_since: Object.keys(S.hours[HOUSE] ?? {}).sort()[0] ?? null,
      },
      currency: CURRENCY, time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  },
  "energydash/summary": (m) => wsSummary(m.period, m.offset ?? 0),
  "energydash/baseload": () => baseload(S.settings.solar_mode ?? "export"),
  "energydash/sessions": (m) => ({ sessions: [...S.sessions].reverse().filter((s) => S.devices.some((d) => d.id === s.device_id) || S.archived.some((a) => a.id === s.device_id)).slice(0, m.limit ?? 200), solar_mode: S.settings.solar_mode ?? "export" }),
  "energydash/steps": (m) => ({ steps: [...(S.steplog[m.device_id] ?? [])].reverse().slice(0, 100), tracker: null }),
  "energydash/settings/save": (m) => {
    S.settings = { ...S.settings, ...m.settings };
    if (m.recalculate) busyFor([HOUSE, ...S.devices.map((d) => d.id)]);
    return { settings: S.settings };
  },
  "energydash/discover": () => {
    const used = new Set(S.devices.map((d) => d.energy_entity));
    const all = [...DATA.devices.map((d) => d.energy_entity), ...Object.keys(EXTRA)].filter((e) => !used.has(e));
    return { suggested: all.map((e) => candidate(e, EXTRA[e])), others: [] };
  },
  "energydash/suggest": () => {
    const used = new Set(S.devices.map((d) => d.energy_entity));
    const items = [...DATA.devices.map((d) => d.energy_entity), ...Object.keys(EXTRA)].filter((e) => !used.has(e)).map((e) => {
      const d = DATA.devices.find((x) => x.energy_entity === e);
      const ex = EXTRA[e];
      const cand = candidate(e, ex);
      const device = d ? { ...d, name: deviceName(d) } : { name: extraName(ex.key, ex.name), type: ex.type, energy_entity: e, energy_is_power: false, power_entity: ex.power, session_source: "power", session_entity: null, session_states: [], threshold_w: 3, off_delay_min: 5, min_duration_min: 10, icon: ex.icon };
      delete device.id;
      const sess = previewSessions(e);
      const trace = powerTrace(e).map(([, w]) => w);
      const step = Math.max(1, Math.floor(trace.length / 80));
      const spark = Array.from({ length: Math.min(80, trace.length) }, (_, i) => Math.max(...trace.slice(i * step, (i + 1) * step)));
      const avgW = trace.reduce((a, b) => a + b, 0) / Math.max(trace.length, 1);
      const continuous = device.type === "continuous";
      return {
        device, candidate: cand, checked: !!d, reason: d ? "in_prefs" : "device", in_energy_prefs: !!d, area: cand.area,
        summary: {
          days: 7, sessions: continuous ? null : sess.length, kwh_avg: continuous || !sess.length ? null : r4(sess.reduce((a, s) => a + s.kwh, 0) / sess.length),
          avg_w: continuous ? Math.round(avgW) : null, kwh_day: continuous ? r4(avgW * 24 / 1000) : null, spark,
        },
      };
    });
    return { items, days: 7 };
  },
  "energydash/analyze": (m) => analysis(m.energy_entity, m.session_entity),
  "energydash/preview_sessions": (m) => ({ start: isoAt(nowMin - 7 * 1440), end: now.toISOString(), power: powerTrace(m.energy_entity), sessions: previewSessions(m.energy_entity), kwh: null, kwh_hours: null }),
  "energydash/devices/save": (m) => { const dev = saveDevice(m.device); if (m.recalculate) busyFor([dev.id]); return { device: dev }; },
  "energydash/devices/save_many": (m) => { const saved = m.devices.map((d) => saveDevice({ ...d, id: undefined })); busyFor(saved.map((d) => d.id), 2500); return { devices: saved }; },
  "energydash/devices/delete": (m) => {
    const dev = S.devices.find((d) => d.id === m.device_id);
    S.devices = S.devices.filter((d) => d.id !== m.device_id);
    if (dev && m.keep_history !== false) S.archived.push({ id: dev.id, name: dev.name, type: dev.type, removed: new Date().toISOString() });
    return {};
  },
  "energydash/recalculate": (m) => {
    const base = fresh();
    if (m.device_id) { S.hours[m.device_id] = base.hours[m.device_id]; busyFor([m.device_id]); }
    else { S.hours = base.hours; S.sessions = base.sessions; S.steplog = base.steplog; busyFor([HOUSE, ...S.devices.map((d) => d.id)]); }
    return { started: true };
  },
  "energydash/reset": (m) => {
    const keep = S.settings;
    if (m.scope === "all") { S = { ...fresh(), devices: [], archived: [], hours: { [HOUSE]: fresh().hours[HOUSE], [EXPORT]: fresh().hours[EXPORT] }, sessions: [], steplog: {}, open: {} }; }
    else { S.hours = {}; S.sessions = []; S.steplog = {}; S.open = {}; }
    S.settings = keep;
    return {};
  },
  "energydash/export": () => ({ version: 1, integration_version: "demo", exported: new Date().toISOString(), settings: S.settings, devices: S.devices }),
  "energydash/import": (m) => { S.devices = []; for (const d of m.data.devices ?? []) saveDevice(d); if (m.apply_settings && m.data.settings) S.settings = { ...S.settings, ...m.data.settings }; busyFor(S.devices.map((d) => d.id)); return { devices: S.devices.length }; },
};

// ------------------------------------------------------------------ page

function makeHass() {
  return {
    language: LANG, locale: { language: LANG }, themes: { darkMode: DARK }, user: { is_admin: true }, states: states(),
    callWS: async (msg) => {
      await new Promise((r) => setTimeout(r, 120));
      const fn = handlers[msg.type];
      if (!fn) throw Object.assign(new Error(`Not available in the demo: ${msg.type}`), { code: "unknown_command" });
      return clone(fn(msg));
    },
    connection: {
      subscribeMessage: async (cb) => { subscribers.add(cb); return () => subscribers.delete(cb); },
    },
  };
}

function mount() {
  document.documentElement.classList.toggle("dark", DARK);
  document.documentElement.lang = LANG;
  const host = document.getElementById("panel");
  host.innerHTML = "";
  const panel = document.createElement("energydash-panel");
  panel.hass = makeHass();
  panel.narrow = innerWidth < 870;
  host.appendChild(panel);
  addEventListener("resize", () => (panel.narrow = innerWidth < 870));
  const url = new URL(location.href);
  url.searchParams.set("lang", LANG);
  url.searchParams.set("dark", DARK ? "1" : "0");
  history.replaceState(null, "", url);
}

const langSelect = document.getElementById("lang");
langSelect.innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
langSelect.value = LANG;
langSelect.addEventListener("change", () => {
  LANG = langSelect.value;
  for (const d of S.devices) { const base = DATA.devices.find((x) => x.id === d.id); if (base && Object.values(NAMES).concat([{}]).some((n) => d.name === (n[d.id] ?? base.name))) d.name = deviceName(base); }
  mount();
});
document.getElementById("theme").addEventListener("click", () => { DARK = !DARK; mount(); });
document.getElementById("restart").addEventListener("click", () => { S = fresh(); mount(); });

await import("./energydash-panel.js");
mount();

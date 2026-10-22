// The four tabs: Dashboard, Sessies, Sluipverbruik, Apparaten (docs/04 §4).

import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { api, sessionCost, type Baseload, type ConfigResult, type Device, type Hass, type Session, type SolarMode, type Summary } from "./api";
import { colors, conic, dateTime, day, deviceColor, eur, minutesBetween, num, pct, time } from "./format";
import { t } from "./i18n";
import { shared } from "./styles";
import { fire } from "./components";

export interface Ctx {
  hass: Hass;
  config: ConfigResult;
  dark: boolean;
  narrow: boolean;
  tick: number; // bumps when the backend reports changes
}

export const TYPE_ICON: Record<string, string> = { sessions: "mdi:washing-machine", continuous: "mdi:server", charger: "mdi:ev-station" };

export function deviceInfo(ctx: Ctx, id: string): { name: string; color: string; type: string } {
  const c = colors(ctx.dark);
  if (id === "_rest") return { name: t("d.rest"), color: c.rest, type: "rest" };
  const idx = ctx.config.devices.findIndex((d) => d.id === id);
  if (idx >= 0) {
    const d = ctx.config.devices[idx];
    return { name: d.name, color: deviceColor(d.color ?? idx, ctx.dark), type: d.type };
  }
  const arch = ctx.config.archived.find((a) => a.id === id);
  return { name: arch?.name ?? id, color: c.rest, type: arch?.type ?? "sessions" };
}

export function ruleText(ctx: Ctx, d: Device): string {
  if (d.type === "continuous") return t("v.rule_continuous");
  if (d.session_source === "entity" && d.session_entity) {
    const name = ctx.hass.states[d.session_entity]?.attributes.friendly_name ?? d.session_entity;
    return t("v.rule_entity", { entity: name, states: d.session_states.join(", ") });
  }
  return t("v.rule_power", { min: num(d.off_delay_min, 0), w: num(d.threshold_w, 0) });
}

const cardCss = css`
  :host { display: block; }
  .page { display: grid; gap: 16px; padding: 16px; max-width: 1200px; margin: 0 auto; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .kpi .label { font-size: 13px; color: var(--ed-text2); }
  .kpi .value { font-size: 28px; font-weight: 400; margin: 4px 0; }
  .kpi .sub { font-size: 12px; color: var(--ed-text2); }
  .two { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
  .donut-row { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
  .donut { width: 150px; height: 150px; border-radius: 50%; position: relative; flex: none; }
  .donut::after { content: ""; position: absolute; inset: 26px; border-radius: 50%; background: var(--ed-card); }
  .donut .mid { position: absolute; inset: 0; display: grid; place-items: center; z-index: 1; text-align: center; font-size: 18px; }
  .legend { display: grid; gap: 6px; flex: 1; min-width: 180px; }
  .legend .row { font-size: 14px; gap: 8px; }
  .legend .v { margin-left: auto; font-variant-numeric: tabular-nums; }
  .legend .p { width: 42px; text-align: right; color: var(--ed-text2); font-size: 12px; }
  .bars { display: flex; align-items: flex-end; gap: 3px; height: 200px; border-bottom: 1px solid var(--ed-line); position: relative; }
  .bars .col { flex: 1; display: flex; flex-direction: column-reverse; gap: 2px; cursor: pointer; min-width: 4px; border: none; background: none; padding: 0; height: 100%; justify-content: flex-start; }
  .bars .seg { width: 100%; }
  .neg { display: flex; gap: 3px; height: 40px; align-items: flex-start; }
  .neg .col { flex: 1; min-width: 4px; }
  .labels { display: flex; gap: 3px; font-size: 11px; color: var(--ed-text2); margin-top: 4px; }
  .labels span { flex: 1; text-align: center; min-width: 4px; overflow: hidden; white-space: nowrap; }
  .readout { font-size: 14px; margin-top: 8px; }
  .hbar { height: 10px; border-radius: 5px; background: var(--ed-line); position: relative; overflow: visible; }
  .hbar > div { height: 100%; border-radius: 5px; }
  .hbar .ref { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--ed-text2); }
  .prow { display: grid; grid-template-columns: minmax(110px, 30%) 1fr auto; gap: 12px; align-items: center; font-size: 14px; padding: 6px 0; }
  .hours { display: flex; align-items: flex-end; gap: 2px; height: 140px; position: relative; border-bottom: 1px solid var(--ed-line); }
  .hours .h { flex: 1; position: relative; height: 100%; display: flex; align-items: flex-end; border: none; background: none; padding: 0; cursor: pointer; }
  .hours .k { width: 100%; background: var(--ed-pri); opacity: 0.55; border-radius: 3px 3px 0 0; }
  .hours .dot { position: absolute; left: 50%; width: 7px; height: 7px; border-radius: 50%; transform: translate(-50%, 50%); background: var(--ed-warn); }
  .toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .seg-btns { display: inline-flex; border: 1px solid var(--ed-line); border-radius: 999px; overflow: hidden; }
  .seg-btns button { font: inherit; font-size: 14px; border: none; background: none; padding: 6px 16px; cursor: pointer; color: var(--ed-text2); }
  .seg-btns button[aria-pressed="true"] { background: color-mix(in srgb, var(--ed-pri) 12%, transparent); color: var(--ed-pri); font-weight: 500; }
  .empty { text-align: center; padding: 48px 16px; display: grid; justify-items: center; gap: 8px; }
  .empty ha-icon { --mdc-icon-size: 64px; color: var(--ed-text2); }
  .icon-bubble { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none; background: color-mix(in srgb, var(--ed-pri) 10%, transparent); color: var(--ed-pri); }
  .cost { font-variant-numeric: tabular-nums; font-weight: 500; }
  .fab { position: fixed; right: 24px; bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,.25); z-index: 2; padding: 14px 20px; }
`;

// ------------------------------------------------------------------ dashboard
export class EdDashboard extends LitElement {
  declare ctx: Ctx;
  declare _period: "week" | "month";
  declare _offset: number;
  declare _data: Summary | null;
  declare _hoverDay: number | null;
  declare _hoverHour: number | null;
  declare _error: string;

  static properties = {
    ctx: { attribute: false },
    _period: { state: true },
    _offset: { state: true },
    _data: { state: true },
    _hoverDay: { state: true },
    _hoverHour: { state: true },
    _error: { state: true },
  };

  static styles = [shared, cardCss];

  constructor() {
    super();
    this._period = "month";
    this._offset = 0;
    this._data = null;
    this._hoverDay = null;
    this._hoverHour = null;
    this._error = "";
  }

  private _lastTick = -1;

  updated(changed: Map<string, unknown>) {
    if (changed.has("_period") || changed.has("_offset") || (this.ctx && this.ctx.tick !== this._lastTick)) {
      this._lastTick = this.ctx.tick;
      this._load();
    }
  }

  private async _load() {
    try {
      this._data = await api.summary(this.ctx.hass, this._period, this._offset);
      this._error = "";
    } catch (e) {
      this._error = String((e as Error).message ?? e);
    }
  }

  render() {
    const d = this._data;
    const mode = this.ctx.config.settings.solar_mode;
    const head = html`<div class="toolbar">
      <div class="seg-btns" role="group">
        ${(["week", "month"] as const).map((p) => html`<button aria-pressed=${this._period === p} @click=${() => { this._period = p; this._offset = 0; this._hoverDay = null; }}>${t(p === "week" ? "d.week" : "d.month")}</button>`)}
      </div>
      <button class="icon" aria-label=${t("d.prev")} @click=${() => { this._offset += 1; this._hoverDay = null; }}><ha-icon icon="mdi:chevron-left"></ha-icon></button>
      <button class="icon" aria-label=${t("d.next")} ?disabled=${this._offset === 0} @click=${() => { this._offset = Math.max(0, this._offset - 1); this._hoverDay = null; }}><ha-icon icon="mdi:chevron-right"></ha-icon></button>
      ${d ? html`<div><h2 style="margin:0">${day(d.first_day, { day: "numeric", month: "long" })} – ${day(d.last_day, { day: "numeric", month: "long", year: "numeric" })}</h2></div>` : nothing}
    </div>`;
    if (this._error) return html`<div class="page">${head}<div class="alert bad"><ha-icon icon="mdi:alert-circle"></ha-icon>${t("c.error", { msg: this._error })}</div></div>`;
    if (!d) return html`<div class="page">${head}<p class="muted">${t("c.loading")}</p></div>`;

    const ids = this.ctx.config.devices.map((x) => x.id!);
    const series = [...ids, ...(d.has_house ? ["_rest"] : [])];
    const house = d.totals["_house"];
    const total = house?.cost ?? 0;
    const daysWithData = d.days.length;
    const c = colors(this.ctx.dark);
    const zonKwh = house?.zon ?? 0;
    const kwh = house?.kwh ?? 0;
    const prev = d.previous_total;
    const delta = prev && prev > 0.01 && d.has_house ? Math.round(((total - prev) / prev) * 100) : null;
    const below = house && house.all_net > 0.001 ? Math.round((1 - house.cost / house.all_net) * 100) : 0;
    const saved = house ? house.all_net - house.cost : 0;

    const kpis = [
      { label: t(d.has_house ? "d.kpi_total" : "d.kpi_devices"), value: eur(total), sub: delta === null ? "" : `${delta <= 0 ? "↓" : "↑"} ${Math.abs(delta)}% ${t(this._period === "week" ? "d.vs_week" : "d.vs_month")}` },
      { label: t("d.kpi_avg_day"), value: eur(total / Math.max(daysWithData, 1)), sub: t("d.over_days", { n: daysWithData }) },
      { label: t("d.kpi_price"), value: house?.price_per_kwh != null ? eur(house.price_per_kwh, 3) : "—", sub: below > 0 ? t("d.below_grid", { p: below }) : t("d.at_grid") },
      { label: t("d.kpi_saved"), value: mode === "grid" ? "—" : eur(saved), sub: mode === "grid" ? t("d.zon_as_grid") : t("d.zon_used", { kwh: num(zonKwh, 0) }) },
    ];

    const money = series.map((id) => ({ id, ...deviceInfo(this.ctx, id), v: d.totals[id]?.cost ?? 0 }));
    const posTotal = money.reduce((a, m) => a + Math.max(m.v, 0), 0);

    if (kwh < 0.001) {
      return html`<div class="page">${head}${d.has_house ? nothing : html`<div class="alert info"><ha-icon icon="mdi:information"></ha-icon>${t("d.no_house")}</div>`}
        <div class="card empty"><ha-icon icon="mdi:chart-bar"></ha-icon><h2>${t("s.none")}</h2><p class="muted">${t("d.no_data")}</p></div></div>`;
    }

    return html`<div class="page">
      ${head}
      ${d.has_house ? nothing : html`<div class="alert info"><ha-icon icon="mdi:information"></ha-icon>${t("d.no_house")}</div>`}
      <div class="kpis">${kpis.map((k) => html`<div class="card kpi"><div class="label">${k.label}</div><div class="value">${k.value}</div><div class="sub">${k.sub}</div></div>`)}</div>
      <div class="two">
        <div class="card">
          <h3>${t("d.money")}</h3>
          <div class="donut-row">
            <div class="donut" role="img" aria-label=${money.map((m) => `${m.name} ${eur(m.v)}`).join(", ")} style="background:${conic(money.map((m) => ({ v: m.v, color: m.color })))}"><div class="mid">${eur(total, 0)}</div></div>
            <div class="legend">${money.map((m) => html`<div class="row"><span class="swatch" style="background:${m.color}"></span><span>${m.name}</span><span class="v">${eur(m.v)}</span><span class="p">${pct(Math.max(m.v, 0), posTotal)}%</span></div>`)}</div>
          </div>
          ${d.has_house ? html`<p class="muted small" style="margin-top:12px">${t("d.rest_note")}</p>` : nothing}
        </div>
        <div class="card">
          <h3>${t("d.source")}</h3>
          <div class="donut-row">
            <div class="donut" role="img" aria-label="${t("d.own_solar")} ${pct(zonKwh, kwh)}%, ${t("d.grid")} ${100 - pct(zonKwh, kwh)}%" style="background:${conic([{ v: zonKwh, color: c.zon }, { v: kwh - zonKwh, color: c.net }])}"><div class="mid">${pct(zonKwh, kwh)}%<br /><span class="small muted">${t("s.solar").toLowerCase()}</span></div></div>
            <div class="legend">
              <div class="row"><span class="swatch" style="background:${c.zon}"></span><span>${t("d.own_solar")}</span><span class="v">${num(zonKwh, 0)} kWh</span><span class="p">${pct(zonKwh, kwh)}%</span></div>
              <div class="row"><span class="swatch" style="background:${c.net}"></span><span>${t("d.grid")}</span><span class="v">${num(kwh - zonKwh, 0)} kWh</span><span class="p">${100 - pct(zonKwh, kwh)}%</span></div>
            </div>
          </div>
          <p class="muted small" style="margin-top:12px">${t("d.measured", { kwh: num(kwh, 0) })} ${t(`d.mode.${mode}`)}</p>
        </div>
      </div>
      ${this._perDay(d, series)}
      <div class="two">${this._perKwh(d, series)}${this._hours(d)}</div>
    </div>`;
  }

  private _perDay(d: Summary, series: string[]): TemplateResult {
    const dayTotal = (i: number) => series.reduce((a, id) => a + (d.days[i].series[id]?.cost ?? 0), 0);
    const maxPos = Math.max(0.01, ...d.days.map((x) => series.reduce((a, id) => a + Math.max(x.series[id]?.cost ?? 0, 0), 0)));
    const maxNeg = Math.max(0, ...d.days.map((x) => -series.reduce((a, id) => a + Math.min(x.series[id]?.cost ?? 0, 0), 0)));
    const hd = this._hoverDay ?? d.days.length - 1;
    const sel = d.days[hd];
    const week = this._period === "week";
    return html`<div class="card">
      <h3>${t("d.per_day")}</h3>
      <div class="bars">
        ${d.days.map((x, i) => html`<button class="col" style="opacity:${i === hd ? 1 : 0.6}" aria-label="${day(x.date)}: ${eur(dayTotal(i))}" @mouseenter=${() => (this._hoverDay = i)} @click=${() => (this._hoverDay = i)}>
          ${series.filter((id) => (x.series[id]?.cost ?? 0) > 0.0005).map((id, j, arr) => html`<div class="seg" style="height:${((x.series[id]!.cost / maxPos) * 100).toFixed(2)}%;background:${deviceInfo(this.ctx, id).color};border-radius:${j === arr.length - 1 ? "4px 4px 0 0" : "0"}"></div>`)}
        </button>`)}
      </div>
      ${maxNeg > 0.0005
        ? html`<div class="neg">${d.days.map((x) => {
            const neg = -series.reduce((a, id) => a + Math.min(x.series[id]?.cost ?? 0, 0), 0);
            return html`<div class="col"><div style="height:${((neg / Math.max(maxNeg, maxPos)) * 200).toFixed(1)}px;max-height:40px;background:var(--ed-ok);border-radius:0 0 4px 4px"></div></div>`;
          })}</div>`
        : nothing}
      <div class="labels">${d.days.map((x, i) => html`<span>${week ? day(x.date, { weekday: "short", day: "numeric" }) : (i === 0 || (i + 1) % 5 === 0 ? day(x.date, { day: "numeric" }) : "")}</span>`)}</div>
      ${sel ? html`<div class="readout"><b>${day(sel.date, { weekday: "long", day: "numeric", month: "long" })}: ${eur(dayTotal(hd))}</b>
        <span class="muted"> · ${series.filter((id) => Math.abs(sel.series[id]?.cost ?? 0) > 0.0005).map((id) => `${deviceInfo(this.ctx, id).name} ${eur(sel.series[id]!.cost)}`).join(" · ")}</span></div>` : nothing}
      <div class="legend" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:12px">
        ${series.map((id) => { const i = deviceInfo(this.ctx, id); return html`<div class="row"><span class="swatch" style="background:${i.color}"></span><span class="small">${i.name}</span></div>`; })}
      </div>
    </div>`;
  }

  private _perKwh(d: Summary, series: string[]): TemplateResult {
    const rows = series.map((id) => ({ id, ...deviceInfo(this.ctx, id), n: d.totals[id] })).filter((r) => r.n && r.n.kwh > 0.01);
    const max = Math.max(0.05, ...rows.map((r) => Math.max(r.n!.price_per_kwh ?? 0, r.n!.grid_price_per_kwh ?? 0))) * 1.1;
    return html`<div class="card">
      <h3>${t("d.per_kwh")}</h3>
      <p class="muted small">${t("d.per_kwh_text")}</p>
      ${rows.map((r) => {
        const p = r.n!.price_per_kwh ?? 0;
        const g = r.n!.grid_price_per_kwh ?? 0;
        const diff = g > 0 ? Math.round((1 - p / g) * 100) : 0;
        return html`<div class="prow">
          <span class="row" style="gap:8px"><span class="swatch" style="background:${r.color}"></span>${r.name}</span>
          <div class="hbar"><div style="width:${Math.max((p / max) * 100, 0).toFixed(1)}%;background:${r.color}"></div><span class="ref" style="left:${((g / max) * 100).toFixed(1)}%"></span></div>
          <span><b>${eur(p, 3)}</b> <span class="small muted">${diff > 1 ? t("d.vs_grid_below", { p: diff }) : diff < -1 ? t("d.vs_grid_above", { p: -diff }) : t("d.vs_grid_same")}</span></span>
        </div>`;
      })}
    </div>`;
  }

  private _hours(d: Summary): TemplateResult {
    const maxK = Math.max(0.01, ...d.hours.map((h) => h.kwh));
    const prices = d.hours.filter((h) => h.price !== null).map((h) => h.price!);
    const maxP = Math.max(0.01, ...prices);
    const minP = Math.min(0, ...prices);
    const avgP = prices.length ? d.hours.reduce((a, h) => a + (h.price ?? 0) * h.kwh, 0) / Math.max(d.hours.reduce((a, h) => a + (h.price !== null ? h.kwh : 0), 0), 0.0001) : 0;
    const totalK = d.hours.reduce((a, h) => a + h.kwh, 0);
    const cheapK = d.hours.filter((h) => h.price !== null && h.price < avgP).reduce((a, h) => a + h.kwh, 0);
    const hh = this._hoverHour ?? new Date().getHours();
    const sel = d.hours[hh];
    const pad = (n: number) => String(n).padStart(2, "0");
    return html`<div class="card">
      <h3>${t("d.when")}</h3>
      <p class="muted small">${t("d.when_text")}</p>
      <div class="hours">
        ${d.hours.map((h) => html`<button class="h" style="opacity:${h.hour === hh ? 1 : 0.7}" aria-label="${pad(h.hour)}:00, ${num(h.kwh, 2)} kWh, ${eur(h.price)}" @mouseenter=${() => (this._hoverHour = h.hour)} @click=${() => (this._hoverHour = h.hour)}>
          <div class="k" style="height:${((h.kwh / maxK) * 100).toFixed(1)}%"></div>
          ${h.price !== null ? html`<span class="dot" style="bottom:${(((h.price - minP) / (maxP - minP || 1)) * 100).toFixed(1)}%"></span>` : nothing}
        </button>`)}
      </div>
      <div class="labels">${d.hours.map((h) => html`<span>${h.hour % 6 === 0 ? pad(h.hour) : ""}</span>`)}</div>
      ${sel ? html`<div class="readout">${pad(sel.hour)}:00 – ${pad((sel.hour + 1) % 24)}:00 · ${num(sel.kwh, 2)} kWh · ${eur(sel.price)} /kWh</div>` : nothing}
      ${totalK > 0 && prices.length ? html`<p class="muted small" style="margin-top:8px">${t("d.when_insight", { p: pct(cheapK, totalK), price: eur(avgP) })}</p>` : nothing}
    </div>`;
  }
}

// ------------------------------------------------------------------- sessions
export class EdSessions extends LitElement {
  declare ctx: Ctx;
  declare _sessions: Session[] | null;
  declare _mode: SolarMode;

  static properties = { ctx: { attribute: false }, _sessions: { state: true }, _mode: { state: true } };
  static styles = [shared, cardCss];

  constructor() {
    super();
    this._sessions = null;
    this._mode = "export";
  }

  private _lastTick = -1;

  updated() {
    if (this.ctx && this.ctx.tick !== this._lastTick) {
      this._lastTick = this.ctx.tick;
      api.sessions(this.ctx.hass).then((r) => {
        this._sessions = r.sessions;
        this._mode = r.solar_mode;
      });
    }
  }

  private _row(s: Session) {
    const info = deviceInfo(this.ctx, s.device_id);
    const f = s.fields;
    const cost = sessionCost(f, this._mode);
    const zon = this._mode === "grid" ? 0 : pct(f[1], f[0]);
    return html`<button class="item" @click=${() => fire(this, "open-session", s)}>
      <span class="icon-bubble" style="color:${info.color};background:color-mix(in srgb, ${info.color} 14%, transparent)"><ha-icon icon=${TYPE_ICON[info.type] ?? "mdi:flash"}></ha-icon></span>
      <div class="grow">
        <div>${info.name} ${s.running ? html`<span class="chip ok">${t("s.running")}</span>` : nothing}</div>
        <div class="muted small">${dateTime(s.start)}${s.end ? ` – ${time(s.end)}` : ""} · ${t("s.duration", { min: minutesBetween(s.start, s.end ?? new Date().toISOString()) })} · ${num(f[0], 2)} kWh${zon > 0 ? ` · ${zon}% ${t("s.solar").toLowerCase()}` : ""}</div>
      </div>
      <span class="cost" style="color:${cost < 0 ? "var(--ed-ok)" : "inherit"}">${eur(cost)}</span>
    </button>`;
  }

  render() {
    if (!this._sessions) return html`<div class="page"><p class="muted">${t("c.loading")}</p></div>`;
    const open = Object.values(this.ctx.config.open_sessions);
    if (!this._sessions.length && !open.length) {
      return html`<div class="page"><div class="card empty"><ha-icon icon="mdi:timer-outline"></ha-icon><h2>${t("s.none")}</h2><p class="muted">${t("s.none_text")}</p></div></div>`;
    }
    return html`<div class="page"><div class="card"><div class="list">
      ${open.map((s) => this._row(s))}
      ${this._sessions.map((s) => this._row(s))}
    </div></div></div>`;
  }
}

export function renderSessionDetail(ctx: Ctx, s: Session, mode: SolarMode): TemplateResult {
  const f = s.fields;
  const info = deviceInfo(ctx, s.device_id);
  const dev = ctx.config.devices.find((d) => d.id === s.device_id);
  const c = colors(ctx.dark);
  const cost = sessionCost(f, mode);
  const netKwh = f[0] - f[1];
  const zonCostV = mode === "free" ? 0 : mode === "grid" ? f[3] - f[2] : f[4];
  const maxQ = Math.max(0.001, ...s.quarters.map((q) => q[1]));
  const showZon = mode !== "grid";
  const every = Math.ceil(s.quarters.length / 16);
  return html`
    <div class="kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px">
      <div><div class="muted small">${t("s.cost")}</div><div style="font-size:26px;color:${cost < 0 ? "var(--ed-ok)" : "inherit"}">${eur(cost)}</div></div>
      <div><div class="muted small">${t("s.energy")}</div><div style="font-size:26px">${num(f[0], 2)} kWh</div></div>
      <div><div class="muted small">${t("s.solar")}</div><div style="font-size:26px">${showZon ? pct(f[1], f[0]) : 0}%</div></div>
    </div>
    <div class="muted small">${dateTime(s.start)}${s.end ? ` – ${time(s.end)}` : ""} · ${info.name}</div>
    ${s.quarters.length
      ? html`<div>
          <h3>${t("s.per_quarter")}</h3>
          <div style="display:flex;align-items:flex-end;gap:2px;height:130px;border-bottom:1px solid var(--ed-line)">
            ${s.quarters.map((q) => {
              const zon = showZon ? q[2] : 0;
              return html`<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;gap:2px" title="${time(q[0])} · ${num(q[1], 2)} kWh · ${eur(q[3], 3)}">
                ${zon > 0.0005 ? html`<div style="height:${((zon / maxQ) * 100).toFixed(1)}%;background:${c.zon};border-radius:3px 3px 0 0"></div>` : nothing}
                <div style="height:${(((q[1] - zon) / maxQ) * 100).toFixed(1)}%;background:${c.net};border-radius:${zon > 0.0005 ? "0" : "3px 3px 0 0"}"></div>
              </div>`;
            })}
          </div>
          <div style="display:flex;gap:2px;font-size:10px;color:var(--ed-text2);margin-top:4px">
            ${s.quarters.map((q, i) => html`<span style="flex:1;text-align:center;overflow:hidden;white-space:nowrap">${i % every === 0 ? html`${time(q[0])}<br />${num(q[3] * 100, 0)}ct` : ""}</span>`)}
          </div>
          <p class="muted small" style="margin-top:6px">${t("s.per_quarter_text")}</p>
        </div>`
      : nothing}
    <div>
      <h3>${t("s.breakdown")}</h3>
      <div class="kv">
        <span>${t("s.grid_part")}</span><span>${num(netKwh, 2)} kWh × ${netKwh > 0.0005 ? eur(f[2] / netKwh, 3) : "—"} = <b>${eur(f[2])}</b></span>
        ${showZon ? html`<span>${t("s.solar_part")}</span><span>${num(f[1], 2)} kWh${f[1] > 0.0005 ? ` × ${eur(zonCostV / f[1], 3)}` : ""} = <b>${eur(zonCostV)}</b></span>` : nothing}
        <span>${t("s.total")}</span><span><b>${eur(cost)}</b></span>
        <span>${t("s.all_grid")}</span><span>${eur(f[3])}</span>
      </div>
    </div>
    <details>
      <summary>${t("s.how")}</summary>
      <div style="display:grid;gap:6px;font-size:14px">
        <p>${t("s.how_energy", { n: s.steps, entity: dev?.energy_entity ?? info.name })}</p>
        <p>${t("s.how_split")}</p>
        <p>${t("s.how_price")}</p>
        <p>${t(`s.how_zon.${mode}`)}</p>
        ${s.notes.map((n) => html`<div class="alert warn"><ha-icon icon="mdi:alert"></ha-icon>${t(`s.note.${n}`)}</div>`)}
      </div>
    </details>`;
}

// ------------------------------------------------------------------- baseload
export class EdBaseload extends LitElement {
  declare ctx: Ctx;
  declare _data: Baseload | null;

  static properties = { ctx: { attribute: false }, _data: { state: true } };
  static styles = [shared, cardCss];

  constructor() {
    super();
    this._data = null;
  }

  private _lastTick = -1;

  updated() {
    if (this.ctx && this.ctx.tick !== this._lastTick) {
      this._lastTick = this.ctx.tick;
      api.baseload(this.ctx.hass).then((r) => (this._data = r));
    }
  }

  render() {
    const b = this._data;
    if (!b) return html`<div class="page"><p class="muted">${t("c.loading")}</p></div>`;
    if (!b.available || b.watt === undefined) {
      return html`<div class="page"><div class="card empty"><ha-icon icon="mdi:weather-night"></ha-icon><h2>${t("b.none")}</h2><p class="muted">${t("b.none_text")}</p></div></div>`;
    }
    const c = colors(this.ctx.dark);
    const parts = (b.explained ?? []).map((p) => ({ ...p, color: deviceInfo(this.ctx, p.device_id).color }));
    const unexplained = b.unexplained_w ?? 0;
    const maxW = Math.max(1, ...(b.weeks ?? []).map((w) => w.watt));
    return html`<div class="page">
      <div class="card">
        <h2>${t("b.title")}</h2>
        <p class="muted">${t("b.text")}</p>
        <div class="kpis" style="margin-top:12px">
          <div class="kpi"><div class="value">${num(b.watt, 0)} W</div><div class="sub">${num(b.kwh_day, 2)} kWh ${t("b.per_day")}</div></div>
          <div class="kpi"><div class="value">${eur(b.cost_month)}</div><div class="sub">${t("b.per_month")}</div></div>
          <div class="kpi"><div class="value">${eur(b.cost_year, 0)}</div><div class="sub">${t("b.per_year")}</div></div>
        </div>
      </div>
      <div class="two">
        <div class="card">
          <h3>${t("b.split")}</h3>
          <div style="display:flex;height:16px;border-radius:8px;overflow:hidden;gap:2px;margin-bottom:12px">
            ${parts.map((p) => html`<div style="flex:${p.watt};background:${p.color}"></div>`)}
            ${unexplained > 0 ? html`<div style="flex:${unexplained};background:${c.rest}"></div>` : nothing}
          </div>
          <div class="legend">
            ${parts.map((p) => html`<div class="row"><span class="swatch" style="background:${p.color}"></span><span>${p.name}</span><span class="v">${num(p.watt, 0)} W</span></div>`)}
            <div class="row"><span class="swatch" style="background:${c.rest}"></span><span>${t("b.unexplained")}</span><span class="v">${num(unexplained, 0)} W</span></div>
          </div>
          <p class="muted small" style="margin-top:12px">${t("b.unexplained_text")}</p>
        </div>
        <div class="card">
          <h3>${t("b.weeks")}</h3>
          <div style="display:flex;align-items:flex-end;gap:8px;height:140px;border-bottom:1px solid var(--ed-line)">
            ${(b.weeks ?? []).map((w, i, arr) => html`<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;align-items:center;gap:4px">
              <span class="small">${num(w.watt, 0)}</span>
              <div style="width:100%;height:${((w.watt / maxW) * 85).toFixed(1)}%;background:${i === arr.length - 1 ? c.net : c.rest};border-radius:4px 4px 0 0"></div>
            </div>`)}
          </div>
          <div class="labels">${(b.weeks ?? []).map((w) => html`<span>${w.week.split("-")[1]}</span>`)}</div>
        </div>
      </div>
    </div>`;
  }
}

// -------------------------------------------------------------------- devices
export class EdDevices extends LitElement {
  declare ctx: Ctx;
  static properties = { ctx: { attribute: false } };
  static styles = [shared, cardCss];

  render() {
    const cfg = this.ctx.config;
    return html`<div class="page">
      <div class="card"><div class="list">
        ${cfg.devices.map((d) => {
          const info = deviceInfo(this.ctx, d.id!);
          const n = cfg.numbers[d.id!];
          const running = cfg.open_sessions[d.id!]?.running;
          return html`<button class="item" @click=${() => fire(this, "open-device", d)}>
            <span class="icon-bubble" style="color:${info.color};background:color-mix(in srgb, ${info.color} 14%, transparent)"><ha-icon icon=${TYPE_ICON[d.type]}></ha-icon></span>
            <div class="grow">
              <div>${d.name} ${running ? html`<span class="chip ok">${t("s.running")}</span>` : nothing} ${d.energy_is_power ? html`<span class="chip warn">${t("chip.power")}</span>` : nothing}</div>
              <div class="muted small">${t(`type.${d.type}`)} · ${ruleText(this.ctx, d)}</div>
            </div>
            <div style="text-align:right"><div class="cost">${eur(n?.month.cost)}</div><div class="muted small">${t("c.this_month").toLowerCase()}</div></div>
          </button>`;
        })}
      </div></div>
      ${cfg.archived.length
        ? html`<div class="card"><h3>${t("v.archived")}</h3><p class="muted small">${t("v.archived_text")}</p>
            <div class="list">${cfg.archived.map((a) => html`<div class="item"><ha-icon icon=${TYPE_ICON[a.type] ?? "mdi:flash"} style="color:var(--ed-text2)"></ha-icon><div class="grow">${a.name}</div><span class="muted small">${day(a.removed)}</span></div>`)}</div></div>`
        : nothing}
      ${cfg.is_admin ? html`<div style="height:64px"></div><button class="btn fab" @click=${() => fire(this, "add-device")}><ha-icon icon="mdi:plus"></ha-icon>${t("c.add_device")}</button>` : nothing}
    </div>`;
  }
}

function define(name: string, cls: CustomElementConstructor) {
  if (!customElements.get(name)) customElements.define(name, cls);
}
define("ed-dashboard", EdDashboard);
define("ed-sessions", EdSessions);
define("ed-baseload", EdBaseload);
define("ed-devices", EdDevices);

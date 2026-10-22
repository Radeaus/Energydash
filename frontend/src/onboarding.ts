// <ed-onboarding>: quick start shown while there are no devices. Finds meters, sets them up and adds them in one go.

import { LitElement, css, html, nothing, svg, type TemplateResult } from "lit";
import { api, type Suggestion } from "./api";
import { define, fire } from "./components";
import { num } from "./format";
import { t } from "./i18n";
import { shared } from "./styles";
import type { Ctx } from "./views";

type Stage = "start" | "scan" | "list" | "saving" | "done";
const SCAN_STEPS = ["ob.scan.prefs", "ob.scan.meters", "ob.scan.history"];
const SCAN_TICK_MS = 900;

const ICONS: [string, string][] = [
  ["was", "mdi:washing-machine"], ["washer", "mdi:washing-machine"], ["droger", "mdi:tumble-dryer"], ["dryer", "mdi:tumble-dryer"],
  ["vaatwas", "mdi:dishwasher"], ["dishwasher", "mdi:dishwasher"], ["airco", "mdi:air-conditioner"], ["server", "mdi:server"],
  ["koelkast", "mdi:fridge"], ["fridge", "mdi:fridge"], ["vriezer", "mdi:fridge"], ["warmtepomp", "mdi:heat-pump"], ["boiler", "mdi:water-boiler"],
];

function deviceIcon(s: Suggestion): string {
  const low = `${s.device.name} ${s.device.energy_entity}`.toLowerCase();
  const hit = ICONS.find(([tok]) => low.includes(tok));
  if (hit) return hit[1];
  return s.device.type === "charger" ? "mdi:ev-station" : s.device.type === "continuous" ? "mdi:power-plug" : "mdi:power-plug-outline";
}

function sparkline(values: number[]): TemplateResult | typeof nothing {
  if (values.length < 2) return nothing;
  const w = 300, h = 48, max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - (v / max) * (h - 6)).toFixed(1)}`);
  return html`<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label=${t("ob.chart", { w: Math.round(max) })}>
    ${svg`<path d="M0,${h} L${pts.join(" L")} L${w},${h} Z" fill="var(--ed-pri)" fill-opacity="0.12"></path>
    <path d="M${pts.join(" L")}" fill="none" stroke="var(--ed-pri)" stroke-width="1.5" vector-effect="non-scaling-stroke"></path>`}
  </svg>`;
}

export class EdOnboarding extends LitElement {
  declare ctx: Ctx;
  declare _stage: Stage;
  declare _scanStep: number;
  declare _items: Suggestion[];
  declare _days: number;
  declare _sel: Set<string>;
  declare _open: string | null;
  declare _added: number;
  declare _error: string;

  static properties = {
    ctx: { attribute: false },
    _stage: { state: true },
    _scanStep: { state: true },
    _items: { state: true },
    _days: { state: true },
    _sel: { state: true },
    _open: { state: true },
    _added: { state: true },
    _error: { state: true },
  };

  static styles = [
    shared,
    css`
      :host { display: block; max-width: 640px; margin: 0 auto; padding: 32px 16px; }
      .stack { display: grid; gap: 16px; }
      .hero { text-align: center; display: grid; justify-items: center; gap: 8px; padding: 32px 16px; }
      .hero > ha-icon { --mdc-icon-size: 64px; color: var(--ed-pri); margin-bottom: 8px; }
      .hero > ha-icon.done { color: var(--ed-ok); }
      .hero h2 { font-size: 24px; }
      .hero p { max-width: 42ch; }
      .hero .actions { display: grid; justify-items: center; gap: 4px; margin-top: 8px; }
      .local { text-align: center; }
      .steps { display: grid; gap: 14px; padding: 8px 0; }
      .step { display: flex; gap: 12px; align-items: center; }
      .step ha-icon { --mdc-icon-size: 22px; color: var(--ed-ok); flex: none; }
      .step.wait { color: var(--ed-text2); }
      .step.wait ha-icon { color: var(--ed-text2); }
      .spin { width: 20px; height: 20px; margin: 1px; border: 2px solid var(--ed-line); border-top-color: var(--ed-pri); border-radius: 50%; animation: spin 0.8s linear infinite; flex: none; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
      .list.card { padding: 0 16px; }
      .list > .item { flex-wrap: wrap; padding: 12px 0; }
      .item b { font-weight: 500; }
      .dev { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none; color: var(--ed-pri); background: color-mix(in srgb, var(--ed-pri) 12%, transparent); --mdc-icon-size: 22px; }
      .check { width: 24px; height: 24px; flex: none; border-radius: 6px; border: 2px solid var(--ed-text2); background: transparent; padding: 0; cursor: pointer; display: grid; place-items: center; color: var(--text-primary-color, #fff); --mdc-icon-size: 18px; }
      .check[aria-checked="true"] { background: var(--ed-pri); border-color: var(--ed-pri); }
      .check:focus-visible, button.icon:focus-visible, button.btn:focus-visible { outline: 2px solid var(--ed-pri); outline-offset: 2px; }
      .more { flex-basis: 100%; display: grid; gap: 8px; padding: 4px 0 4px 88px; }
      .spark { width: 100%; height: 48px; display: block; }
      .group { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ed-text2); margin: 8px 0 -8px; }
      .foot { display: grid; gap: 4px; justify-items: center; }
      .foot .btn:not(.text) { width: 100%; justify-content: center; }
      .note { display: flex; gap: 10px; align-items: flex-start; }
      .note ha-icon { --mdc-icon-size: 20px; color: var(--ed-pri); flex: none; }
      @media (max-width: 480px) { .more { padding-left: 0; } }
    `,
  ];

  private _timer?: number;

  constructor() {
    super();
    this._stage = "start";
    this._scanStep = 0;
    this._items = [];
    this._days = 7;
    this._sel = new Set();
    this._open = null;
    this._added = 0;
    this._error = "";
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearInterval(this._timer);
  }

  private get _taken(): Set<string> {
    return new Set(this.ctx.config.devices.map((d) => d.energy_entity));
  }

  private async _scan() {
    fire(this, "started");
    this._stage = "scan";
    this._scanStep = 0;
    this._error = "";
    window.clearInterval(this._timer);
    this._timer = window.setInterval(() => {
      if (this._scanStep < SCAN_STEPS.length - 1) this._scanStep += 1;
    }, SCAN_TICK_MS);
    try {
      const r = await api.suggest(this.ctx.hass);
      this._items = r.items;
      this._days = r.days;
      this._sel = new Set(r.items.filter((i) => i.checked).map((i) => i.device.energy_entity));
      this._open = null;
      window.clearInterval(this._timer);
      this._scanStep = SCAN_STEPS.length;
      await new Promise((ok) => window.setTimeout(ok, 400));
      this._stage = "list";
    } catch (e) {
      window.clearInterval(this._timer);
      this._error = String((e as Error).message ?? e);
      this._stage = "start";
    }
  }

  private _toggle(id: string) {
    const sel = new Set(this._sel);
    if (sel.has(id)) sel.delete(id);
    else sel.add(id);
    this._sel = sel;
  }

  private async _save() {
    const taken = this._taken;
    const devices = this._items.filter((i) => this._sel.has(i.device.energy_entity) && !taken.has(i.device.energy_entity)).map((i) => i.device);
    this._stage = "saving";
    this._error = "";
    try {
      const r = await api.saveDevices(this.ctx.hass, devices);
      this._added = r.devices.length;
      this._stage = "done";
    } catch (e) {
      this._error = String((e as Error).message ?? e);
      this._stage = "list";
    }
  }

  render() {
    const err = this._error ? html`<div class="alert bad"><ha-icon icon="mdi:alert-circle"></ha-icon>${t("c.error", { msg: this._error })}</div>` : nothing;
    const body = this._stage === "start" ? this._renderStart()
      : this._stage === "scan" ? this._renderScan()
      : this._stage === "done" ? this._renderDone()
      : this._renderList();
    return html`<div class="stack">${err}${body}</div>`;
  }

  private _renderStart() {
    const admin = this.ctx.config.is_admin;
    return html`<div class="card hero">
        <ha-icon icon="mdi:cash-clock"></ha-icon>
        <h2>${t("ob.title")}</h2>
        <p class="muted">${t("ob.text")}</p>
        ${admin
          ? html`<div class="actions">
              <button class="btn" @click=${this._scan}><ha-icon icon="mdi:auto-fix"></ha-icon>${t("ob.start")}</button>
              <button class="btn text" @click=${() => fire(this, "advanced")}>${t("ob.advanced")}</button>
            </div>`
          : html`<p class="muted small">${t("c.admin_only")}</p>`}
      </div>
      <p class="muted small local">${t("local")}</p>`;
  }

  private _renderScan() {
    return html`<div class="card stack" aria-live="polite">
      <h2>${t("ob.scanning")}</h2>
      <div class="steps">${SCAN_STEPS.map((key, i) => {
        const done = i < this._scanStep;
        const busy = i === this._scanStep;
        return html`<div class="step ${done || busy ? "" : "wait"}">
          ${done ? html`<ha-icon icon="mdi:check-circle"></ha-icon>` : busy ? html`<span class="spin" aria-hidden="true"></span>` : html`<ha-icon icon="mdi:circle-outline"></ha-icon>`}
          <span>${t(key)}</span></div>`;
      })}</div>
    </div>`;
  }

  private _line(s: Suggestion): string {
    const sum = s.summary;
    const d = sum.days;
    if (s.reason === "no_history") return t("ob.line.no_history");
    if (s.device.type === "continuous") {
      return sum.avg_w !== null ? t("ob.line.continuous", { w: sum.avg_w, kwh: num(sum.kwh_day, 1) }) : t(`type.continuous`);
    }
    const n = sum.sessions ?? 0;
    if (n === 0) return t("ob.line.none", { d });
    const unit = s.device.type === "charger" ? "charges" : "sessions";
    const base = t(n === 1 ? `ob.line.${unit}_one` : `ob.line.${unit}`, { n, d });
    return sum.kwh_avg !== null ? `${base}${t("ob.line.avg", { kwh: num(sum.kwh_avg, 1) })}` : base;
  }

  private _row(s: Suggestion, primary: boolean): TemplateResult {
    const id = s.device.energy_entity;
    const open = this._open === id;
    const added = this._taken.has(id);
    const note = primary ? (s.reason === "no_history" || s.reason === "no_sessions" ? t(`ob.reason.${s.reason}`, { d: s.summary.days }) : "") : this._line(s);
    return html`<div class="item">
      ${added
        ? html`<ha-icon icon="mdi:check-circle" style="color:var(--ed-ok);--mdc-icon-size:24px;flex:none" title=${t("ob.added")}></ha-icon>`
        : html`<button class="check" role="checkbox" aria-checked=${this._sel.has(id)} aria-label=${s.device.name} @click=${() => this._toggle(id)}>${this._sel.has(id) ? html`<ha-icon icon="mdi:check"></ha-icon>` : nothing}</button>`}
      <span class="dev"><ha-icon icon=${deviceIcon(s)}></ha-icon></span>
      <div class="grow">
        <b>${s.device.name}</b>
        <div class="muted small">${added ? t("ob.added") : primary ? `${t(`type.${s.device.type}`)} · ${this._line(s)}` : t(`ob.reason.${s.reason}`, { d: s.summary.days })}</div>
      </div>
      <button class="icon" aria-expanded=${open} aria-label=${t("ob.details", { name: s.device.name })} @click=${() => (this._open = open ? null : id)}>
        <ha-icon icon=${open ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon></button>
      ${open
        ? html`<div class="more">
            ${sparkline(s.summary.spark)}
            ${note ? html`<div class="small">${note}</div>` : nothing}
            <div class="muted small">${s.in_energy_prefs ? t("src.in_prefs") : t("src.not_in_prefs")}${s.area ? ` · ${s.area}` : ""} · <span class="mono">${id}</span></div>
            ${added ? nothing : html`<div><button class="btn text" style="padding-left:0" @click=${() => fire(this, "adjust", s.candidate)}><ha-icon icon="mdi:pencil"></ha-icon>${t("ob.adjust")}</button></div>`}
          </div>`
        : nothing}
    </div>`;
  }

  private _renderList() {
    const items = this._items;
    if (!items.length) {
      return html`<div class="card hero">
        <ha-icon icon="mdi:magnify-close"></ha-icon>
        <h2>${t("ob.none")}</h2>
        <p class="muted">${t("ob.none_text")}</p>
        <div class="actions">
          <button class="btn" @click=${() => fire(this, "advanced")}>${t("ob.pick_self")}</button>
          <button class="btn text" @click=${this._scan}>${t("ob.again")}</button>
        </div>
      </div>`;
    }
    const sure = items.filter((i) => i.checked);
    const rest = items.filter((i) => !i.checked);
    const taken = this._taken;
    const n = items.filter((i) => this._sel.has(i.device.energy_entity) && !taken.has(i.device.energy_entity)).length;
    const saving = this._stage === "saving";
    return html`
      <div>
        <h2>${sure.length ? t(sure.length === 1 ? "ob.found_one" : "ob.found", { n: sure.length }) : t("ob.found_unsure", { n: items.length })}</h2>
        <p class="muted">${sure.length ? t("ob.found_text") : t("ob.found_unsure_text")}</p>
      </div>
      ${sure.length ? html`<div class="card list">${sure.map((s) => this._row(s, true))}</div>` : nothing}
      ${rest.length
        ? html`${sure.length ? html`<div class="group">${t("ob.also")}</div>` : nothing}
            <div class="card list">${rest.map((s) => this._row(s, false))}</div>`
        : nothing}
      <div class="foot">
        <button class="btn" ?disabled=${n === 0 || saving} @click=${this._save}>
          ${saving ? t("ob.saving") : n === 1 ? t("ob.add_one") : t("ob.add", { n })}</button>
        <button class="btn text" @click=${() => fire(this, "advanced")}>${t("ob.advanced")}</button>
      </div>`;
  }

  private _renderDone() {
    const n = this._added;
    return html`<div class="card hero">
        <ha-icon class="done" icon="mdi:check-circle"></ha-icon>
        <h2>${n === 1 ? t("ob.done_one") : t("ob.done", { n })}</h2>
        <p class="muted">${t("ob.done_text")}</p>
      </div>
      <div class="card stack" style="gap:12px">
        <div class="note"><ha-icon icon="mdi:weather-night"></ha-icon><span>${t("ob.done_baseload")}</span></div>
        <div class="note"><ha-icon icon="mdi:tune-variant"></ha-icon><span>${t("ob.done_adjust")}</span></div>
      </div>
      <div class="foot"><button class="btn" @click=${() => fire(this, "finished")}>${t("ob.to_dashboard")}</button></div>`;
  }
}

define("ed-onboarding", EdOnboarding);

// Small building blocks: dialog (bottom sheet on narrow screens), entity picker, confirm dialog.

import { LitElement, css, html, nothing, type ReactiveController, type ReactiveControllerHost, type TemplateResult } from "lit";
import type { Hass, HassState } from "./api";
import { shared } from "./styles";
import { t } from "./i18n";

/**
 * Option card for a choice (role radio); the caller wraps a group in role="radiogroup".
 * `example`: one line showing what the choice does to the price, e.g. "€ 0,09 + € 0,17 = € 0,26".
 */
export function radio(checked: boolean, title: string, text: string, onClick: () => void, example?: string): TemplateResult {
  return html`<button class="radio" role="radio" aria-checked=${checked} @click=${onClick}>
    <span class="dot"></span><div><b>${title}</b><span>${text}</span>${example ? html`<span class="ex">${example}</span>` : nothing}</div>
  </button>`;
}

export function fire(el: HTMLElement, type: string, detail?: unknown) {
  // Not composed: events stay inside the panel and never reach Home Assistant's own listeners.
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: false }));
}

/**
 * Tooltips for numbers: any element with `data-tip` (and tabindex="0") explains on hover or focus
 * how its value is calculated, so the cards themselves can stay short.
 */
export class TipController implements ReactiveController {
  private pop?: HTMLDivElement;
  private current: Element | null = null;

  constructor(private host: ReactiveControllerHost & LitElement) {
    host.addController(this);
  }

  hostConnected() {
    const root = this.host.renderRoot;
    root.addEventListener("pointerover", this.over);
    root.addEventListener("pointerout", this.out);
    root.addEventListener("focusin", this.over);
    root.addEventListener("focusout", this.out);
    window.addEventListener("scroll", this.hide, true);
  }

  hostDisconnected() {
    const root = this.host.renderRoot;
    root.removeEventListener("pointerover", this.over);
    root.removeEventListener("pointerout", this.out);
    root.removeEventListener("focusin", this.over);
    root.removeEventListener("focusout", this.out);
    window.removeEventListener("scroll", this.hide, true);
    this.hide();
  }

  private over = (e: Event) => {
    const el = (e.target as Element | null)?.closest?.("[data-tip]") ?? null;
    if (el && el !== this.current) this.show(el);
  };

  private out = (e: Event) => {
    const to = (e as FocusEvent).relatedTarget as Node | null;
    if (this.current && to && this.current.contains(to)) return;
    this.hide();
  };

  private hide = () => {
    this.current = null;
    if (this.pop) this.pop.style.display = "none";
  };

  private show(el: Element) {
    this.current = el;
    if (!this.pop) {
      const pop = document.createElement("div");
      pop.setAttribute("role", "tooltip");
      Object.assign(pop.style, {
        position: "fixed", zIndex: "30", maxWidth: "280px", padding: "8px 10px", borderRadius: "8px", pointerEvents: "none",
        background: "var(--ed-text)", color: "var(--ed-card)", fontSize: "12px", lineHeight: "1.45", whiteSpace: "pre-line",
        boxShadow: "0 4px 12px rgba(0,0,0,.25)", fontWeight: "400", textAlign: "left",
      });
      this.host.renderRoot.appendChild(pop);
      this.pop = pop;
    }
    const pop = this.pop;
    pop.textContent = el.getAttribute("data-tip") ?? "";
    pop.style.display = "block";
    const r = el.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    pop.style.top = `${top}px`;
    pop.style.left = `${Math.max(8, left)}px`;
  }
}

export class EdDialog extends LitElement {
  declare heading: string;
  declare subheading: string;
  declare wide: boolean;

  static properties = {
    heading: { type: String },
    subheading: { type: String },
    wide: { type: Boolean },
  };

  constructor() {
    super();
    this.heading = "";
    this.subheading = "";
    this.wide = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._onKey = this._onKey.bind(this);
    window.addEventListener("keydown", this._onKey);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this._onKey);
    super.disconnectedCallback();
  }

  private _onKey(e: KeyboardEvent) {
    if (e.key === "Escape") fire(this, "closed");
  }

  firstUpdated() {
    (this.renderRoot.querySelector(".box") as HTMLElement | null)?.focus();
  }

  static styles = [
    shared,
    css`
      .scrim { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 10; display: grid; place-items: center; padding: 16px; }
      .box {
        background: var(--ed-card); color: var(--ed-text); border-radius: 24px; width: min(560px, 100%);
        max-height: calc(100vh - 32px); display: flex; flex-direction: column; outline: none;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
      }
      :host([wide]) .box { width: min(720px, 100%); }
      header { display: flex; align-items: flex-start; gap: 8px; padding: 20px 16px 8px 24px; }
      header h2 { font-size: 22px; font-weight: 400; margin: 0; }
      header .sub { color: var(--ed-text2); font-size: 14px; margin-top: 2px; }
      .content { padding: 8px 24px 16px; overflow: auto; display: grid; gap: 16px; }
      footer { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 12px 24px 20px; flex-wrap: wrap; }
      footer ::slotted([slot="start"]) { margin-right: auto; }
      @media (max-width: 600px) {
        .scrim { place-items: end center; padding: 0; }
        .box { border-radius: 24px 24px 0 0; width: 100%; max-height: 92vh; }
        :host([wide]) .box { width: 100%; }
      }
    `,
  ];

  render() {
    return html`<div class="scrim" @click=${(e: Event) => e.target === e.currentTarget && fire(this, "closed")}>
      <div class="box" role="dialog" aria-modal="true" aria-label=${this.heading} tabindex="-1">
        <header>
          <div class="grow">
            <h2>${this.heading}</h2>
            ${this.subheading ? html`<div class="sub">${this.subheading}</div>` : nothing}
          </div>
          <button class="icon" aria-label=${t("c.close")} @click=${() => fire(this, "closed")}><ha-icon icon="mdi:close"></ha-icon></button>
        </header>
        <div class="content"><slot></slot></div>
        <footer><slot name="start"></slot><slot name="footer"></slot></footer>
      </div>
    </div>`;
  }
}

export interface EntityOption {
  entity_id: string;
  name: string;
  chip?: string;
  level?: "ok" | "warn" | "bad" | "neutral";
  group?: string;
}

/** Searchable entity picker with chips. Options come from the caller; free search over hass.states via `filter`. */
export class EdEntitySelect extends LitElement {
  declare hass: Hass;
  declare label: string;
  declare help: string;
  declare value: string | null;
  declare options: EntityOption[];
  declare filter: ((s: HassState) => EntityOption | null) | null;
  declare required: boolean;
  declare allowNone: boolean;
  declare _open: boolean;
  declare _q: string;

  static properties = {
    hass: { attribute: false },
    label: { type: String },
    help: { type: String },
    value: { type: String },
    options: { attribute: false },
    filter: { attribute: false },
    required: { type: Boolean },
    allowNone: { type: Boolean },
    _open: { state: true },
    _q: { state: true },
  };

  constructor() {
    super();
    this.label = "";
    this.help = "";
    this.value = null;
    this.options = [];
    this.filter = null;
    this.required = false;
    this.allowNone = false;
    this._open = false;
    this._q = "";
  }

  static styles = [
    shared,
    css`
      .current {
        display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; font: inherit; color: inherit;
        padding: 10px 12px; border: 1px solid var(--ed-line); border-radius: 8px; background: var(--ed-card); cursor: pointer;
      }
      .current .grow > div:first-child { font-size: 15px; }
      .panel { border: 1px solid var(--ed-line); border-radius: 8px; margin-top: 4px; padding: 8px; display: grid; gap: 6px; }
      .opts { max-height: 260px; overflow: auto; }
      .opt { display: flex; gap: 8px; align-items: center; width: 100%; padding: 8px; background: none; border: none; border-radius: 6px; font: inherit; color: inherit; text-align: left; cursor: pointer; }
      .opt:hover, .opt[aria-selected="true"] { background: color-mix(in srgb, var(--ed-pri) 8%, transparent); }
      .group { font-size: 12px; color: var(--ed-text2); padding: 6px 8px 2px; font-weight: 500; }
      .eid { font-size: 12px; color: var(--ed-text2); word-break: break-all; }
    `,
  ];

  private _all(): EntityOption[] {
    const out = [...this.options];
    const seen = new Set(out.map((o) => o.entity_id));
    if (this.filter && this._q.length >= 2) {
      for (const s of Object.values(this.hass.states)) {
        if (seen.has(s.entity_id)) continue;
        const o = this.filter(s);
        if (o) out.push({ ...o, group: o.group ?? "" });
      }
    }
    const q = this._q.toLowerCase();
    return q ? out.filter((o) => o.name.toLowerCase().includes(q) || o.entity_id.includes(q)) : out;
  }

  private _pick(id: string | null) {
    this.value = id;
    this._open = false;
    this._q = "";
    fire(this, "value-changed", { value: id });
  }

  render() {
    const cur = this.options.find((o) => o.entity_id === this.value) ||
      (this.value && this.hass?.states[this.value]
        ? { entity_id: this.value, name: String(this.hass.states[this.value].attributes.friendly_name ?? this.value) }
        : null);
    const all = this._open ? this._all() : [];
    let lastGroup: string | undefined;
    return html`<div class="field" style="display:grid;gap:4px">
      <span style="font-weight:500;font-size:14px">${this.label}${this.required ? " *" : ""}</span>
      <button class="current" aria-expanded=${this._open} @click=${() => (this._open = !this._open)}>
        <div class="grow">
          ${cur
            ? html`<div>${cur.name}</div><div class="eid">${cur.entity_id}</div>`
            : html`<div class="muted">${this.allowNone ? t("w.none_option") : "—"}</div>`}
        </div>
        ${cur && (cur as EntityOption).chip ? html`<span class="chip ${(cur as EntityOption).level ?? "neutral"}">${(cur as EntityOption).chip}</span>` : nothing}
        <ha-icon icon=${this._open ? "mdi:menu-up" : "mdi:menu-down"}></ha-icon>
      </button>
      ${this._open
        ? html`<div class="panel">
            <label class="field"><span class="visually-hidden">${t("c.search")}</span>
              <input class="input" placeholder=${t("c.search")} aria-label=${t("c.search")} .value=${this._q}
                @input=${(e: Event) => (this._q = (e.target as HTMLInputElement).value)} /></label>
            <div class="opts" role="listbox">
              ${this.allowNone ? html`<button class="opt" role="option" @click=${() => this._pick(null)}>${t("w.none_option")}</button>` : nothing}
              ${all.length === 0 ? html`<div class="muted" style="padding:8px">${t("w.no_results")} – ${t("w.no_results_hint")}</div>` : nothing}
              ${all.map((o) => {
                const head = o.group !== undefined && o.group !== lastGroup && o.group !== "" ? html`<div class="group">${o.group}</div>` : nothing;
                lastGroup = o.group;
                return html`${head}<button class="opt" role="option" aria-selected=${o.entity_id === this.value} @click=${() => this._pick(o.entity_id)}>
                  <div class="grow"><div>${o.name}</div><div class="eid">${o.entity_id}</div></div>
                  ${o.chip ? html`<span class="chip ${o.level ?? "neutral"}">${o.chip}</span>` : nothing}
                </button>`;
              })}
            </div>
          </div>`
        : nothing}
      ${this.help ? html`<span class="help">${this.help}</span>` : nothing}
    </div>`;
  }
}

export class EdConfirm extends LitElement {
  declare heading: string;
  declare text: string;
  declare action: string;
  declare danger: boolean;

  static properties = { heading: { type: String }, text: { type: String }, action: { type: String }, danger: { type: Boolean } };

  constructor() {
    super();
    this.heading = "";
    this.text = "";
    this.action = "";
    this.danger = true;
  }

  static styles = [shared];

  render() {
    return html`<ed-dialog .heading=${this.heading} @closed=${() => fire(this, "cancel")}>
      <p>${this.text}</p>
      <button slot="footer" class="btn secondary" @click=${() => fire(this, "cancel")}>${t("c.cancel")}</button>
      <button slot="footer" class="btn ${this.danger ? "danger" : ""}" @click=${() => fire(this, "confirm")}>${this.action}</button>
    </ed-dialog>`;
  }
}

/** Options for energy and power sensors, with chips (docs/04). */
export function energyFilter(s: HassState): EntityOption | null {
  if (!s.entity_id.startsWith("sensor.")) return null;
  const dc = s.attributes.device_class;
  const name = String(s.attributes.friendly_name ?? s.entity_id);
  if (dc === "energy") return { entity_id: s.entity_id, name, chip: t("chip.counter"), level: "ok" };
  if (dc === "power") return { entity_id: s.entity_id, name, chip: t("chip.power"), level: "warn" };
  return null;
}

export function powerFilter(s: HassState): EntityOption | null {
  if (!s.entity_id.startsWith("sensor.") || s.attributes.device_class !== "power") return null;
  return { entity_id: s.entity_id, name: String(s.attributes.friendly_name ?? s.entity_id) };
}

export function energyOnlyFilter(s: HassState): EntityOption | null {
  if (!s.entity_id.startsWith("sensor.") || s.attributes.device_class !== "energy") return null;
  return { entity_id: s.entity_id, name: String(s.attributes.friendly_name ?? s.entity_id), chip: t("chip.counter"), level: "ok" };
}

export function anySensorFilter(s: HassState): EntityOption | null {
  if (!s.entity_id.startsWith("sensor.")) return null;
  return { entity_id: s.entity_id, name: String(s.attributes.friendly_name ?? s.entity_id), chip: s.attributes.unit_of_measurement, level: "neutral" };
}

/** Sensors with a price per kWh or MWh (EUR/kWh, ct/kWh, öre/kWh, €/MWh): offered first when picking a price entity. */
export function priceFilter(s: HassState): EntityOption | null {
  const unit = String(s.attributes.unit_of_measurement ?? "").toLowerCase().replace(/\s/g, "");
  if (!s.entity_id.startsWith("sensor.") || !(unit.endsWith("/kwh") || unit.endsWith("/mwh"))) return null;
  return { entity_id: s.entity_id, name: String(s.attributes.friendly_name ?? s.entity_id), chip: s.attributes.unit_of_measurement, level: "neutral" };
}

export function sessionFilter(s: HassState): EntityOption | null {
  const domain = s.entity_id.split(".")[0];
  if (!["sensor", "binary_sensor", "input_boolean", "switch", "input_select", "select"].includes(domain)) return null;
  if (domain === "sensor" && !Number.isNaN(Number(s.state)) && s.state !== "") return null;
  return { entity_id: s.entity_id, name: String(s.attributes.friendly_name ?? s.entity_id), chip: s.state, level: "neutral" };
}

export function define(name: string, cls: CustomElementConstructor) {
  if (!customElements.get(name)) customElements.define(name, cls);
}

define("ed-dialog", EdDialog);
define("ed-entity-select", EdEntitySelect);
define("ed-confirm", EdConfirm);

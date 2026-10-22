// <ed-settings-form>: electricity price, meters, and solar and export, as plain questions (docs/04).
// Used by the quick start (one section per step) and by the settings page (all sections, one card each).
// Fires "change" with { value, valid } on every change and once after the first render.

import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { meterIds, type ConfigResult, type ExportMode, type Hass, type Settings } from "./api";
import { define, energyOnlyFilter, fire, priceFilter, radio, type EntityOption } from "./components";
import { eur, priceFactor } from "./format";
import { t } from "./i18n";
import { shared } from "./styles";

export type Section = "price" | "meters" | "solar" | "all";
type MeterKey = "import_entity" | "export_entity" | "solar_entity" | "battery_charge_entity" | "battery_discharge_entity";

/** Solar and export only matter with an export or solar counter, or a home battery. */
export function needsSolar(s: Settings): boolean {
  return [s.export_entity, s.solar_entity, s.battery_charge_entity, s.battery_discharge_entity].some((m) => meterIds(m).length > 0);
}

/** A home battery needs both counters, or neither. */
function batteryValid(s: Settings): boolean {
  return (meterIds(s.battery_charge_entity).length > 0) === (meterIds(s.battery_discharge_entity).length > 0);
}

/**
 * Settings saved before the price questions existed answer them the way they were used then:
 * the entity was the full price, and a fixed low tariff equal to normal meant one price.
 */
export function withAnswers(s: Settings): Settings {
  const out = { ...s };
  if (out.contract === "dynamic" && out.price_markup == null) out.price_markup = 0;
  if (out.contract === "fixed" && out.price_low != null && out.price_low === out.price_normal) out.price_low = null;
  if (out.contract && !out.export_price_mode) {
    // Same rule as settings.export_mode() in the backend.
    if (out.export_price_entity && out.contract === "dynamic") out.export_price_mode = "entity";
    else if (out.contract === "dynamic") out.export_price_mode = "auto";
  }
  // With a fixed price the export price is a fixed amount; in older settings an empty amount meant 0.
  if (out.contract === "fixed") {
    out.export_price_mode = "fixed";
    if (s.contract === "fixed" && out.export_price_fixed == null) out.export_price_fixed = 0;
  }
  return out;
}

/** What the backend needs: answers for sections that do not apply are filled with harmless values. */
export function toSave(s: Settings): Settings {
  const out: Settings = {
    ...s, import_entity: meterIds(s.import_entity), export_entity: meterIds(s.export_entity), solar_entity: meterIds(s.solar_entity),
    battery_charge_entity: meterIds(s.battery_charge_entity), battery_discharge_entity: meterIds(s.battery_discharge_entity),
  };
  if (!needsSolar(out)) out.solar_mode = out.solar_mode ?? "export";
  // The export price is only asked with "What you would otherwise have received": drop half answers.
  if (out.solar_mode !== "export" && ((out.export_price_mode === "fixed" && out.export_price_fixed == null)
    || (out.export_price_mode === "entity" && !out.export_price_entity))) out.export_price_mode = null;
  return out;
}

const num = (v: string): number | null => {
  const n = Number(v.replace(",", "."));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
};

export class EdSettingsForm extends LitElement {
  declare hass: Hass;
  declare config: ConfigResult;
  declare value: Settings;
  declare section: Section;
  declare cards: boolean; // all sections: each in its own card
  declare _extra: boolean | null; // price entity: does something come on top?
  declare _dual: boolean | null; // fixed price: normal and low tariff?

  static properties = {
    hass: { attribute: false },
    config: { attribute: false },
    value: { attribute: false },
    section: { type: String },
    cards: { type: Boolean },
    _extra: { state: true },
    _dual: { state: true },
  };

  static styles = [
    shared,
    css`
      :host { display: grid; gap: 20px; }
      .q { display: grid; gap: 8px; }
      .q > .title { font-weight: 500; font-size: 14px; }
      .radios { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
      .sub { display: grid; gap: 12px; padding-left: 12px; border-left: 2px solid var(--ed-line); }
      .row > label.field { flex: 1; min-width: 140px; align-self: flex-start; }
      .meter { display: flex; gap: 4px; align-items: flex-start; }
      .meter ed-entity-select { flex: 1; min-width: 0; }
      .meter button.icon { margin-top: 26px; }
      .check { display: flex; gap: 8px; align-items: center; font-size: 14px; }
      h3 { margin: 4px 0 -8px; }
      section.card { display: grid; gap: 20px; padding: 20px 24px 24px; }
      section.card h2 { margin: 0; }
      @media (max-width: 600px) { section.card { padding: 16px; } }
      .status { display: flex; gap: 6px; align-items: flex-start; }
      .status ha-icon { --mdc-icon-size: 16px; flex: none; margin-top: 1px; }
    `,
  ];

  constructor() {
    super();
    this.section = "all";
    this.cards = false;
    this._extra = null;
    this._dual = null;
  }

  willUpdate(changed: Map<string, unknown>) {
    // The answers to the follow-up questions start from the settings, once.
    if (changed.has("value") && changed.get("value") === undefined && this.value) {
      const s = this.value;
      this._extra = s.price_markup == null ? null : s.price_markup !== 0;
      this._dual = s.contract !== "fixed" || s.price_normal == null ? null : s.price_low != null;
    }
  }

  // Validity changes with the shown section (quick start steps share one form).
  updated(changed: Map<string, unknown>) {
    if (changed.has("section") && this.value) this._emit(this.value);
  }

  private _set(patch: Partial<Settings>) {
    this._emit({ ...this.value, ...patch });
  }

  private _emit(value: Settings) {
    this.value = value;
    fire(this, "change", { value, valid: this.valid(value) });
  }

  /** Every question of the shown sections answered. */
  valid(s: Settings): boolean {
    const show = (x: Section) => this.section === "all" || this.section === x;
    if (show("price") && !this._priceValid(s)) return false;
    if (show("meters") && (meterIds(s.import_entity).length === 0 || !batteryValid(s))) return false;
    if (show("solar") && needsSolar(s) && !this._solarValid(s)) return false;
    return true;
  }

  private _priceValid(s: Settings): boolean {
    if (s.contract === "dynamic") return !!s.price_entity && this._extra !== null && (!this._extra || s.price_markup != null);
    if (s.contract === "fixed") return this._dual !== null && s.price_normal != null && (!this._dual || s.price_low != null);
    return false;
  }

  private _solarValid(s: Settings): boolean {
    if (!s.solar_mode) return false;
    if (s.solar_mode !== "export") return true;
    if (!s.export_price_mode) return false;
    if (s.export_price_mode === "entity") return !!s.export_price_entity;
    if (s.export_price_mode === "fixed") return s.export_price_fixed != null;
    return s.export_price_mode === "auto" && s.contract === "dynamic";
  }

  private _opt(id: string | null | undefined): EntityOption[] {
    const st = id ? this.hass.states[id] : undefined;
    return st ? [{ entity_id: st.entity_id, name: String(st.attributes.friendly_name ?? st.entity_id) }] : [];
  }

  /** Sensors per kWh first, so a price entity can be picked without searching. */
  private _priceOptions(current: string | null | undefined): EntityOption[] {
    const out = Object.values(this.hass.states).map(priceFilter).filter((o): o is EntityOption => !!o);
    out.sort((a, b) => a.name.localeCompare(b.name));
    const cur = this._opt(current);
    return cur.length && !out.some((o) => o.entity_id === current) ? [...cur, ...out] : out;
  }

  private _money(label: string, value: number | null | undefined, help: string, onChange: (v: number | null) => void): TemplateResult {
    return html`<label class="field"><span class="lbl">${label} *</span>
      <input class="input" inputmode="decimal" .value=${value == null ? "" : String(value)} @change=${(e: Event) => onChange(num((e.target as HTMLInputElement).value))} />
      ${help ? html`<span class="help">${help}</span>` : nothing}</label>`;
  }

  /** Price of a price entity now, per kWh in the main currency (ct/kWh and €/MWh are converted). */
  private _state(id: string | null | undefined): number | null {
    const st = id ? this.hass.states[id] : undefined;
    const n = st ? Number(st.state) : NaN;
    return Number.isFinite(n) ? n * priceFactor(st?.attributes.unit_of_measurement) : null;
  }

  private _unit(id: string | null | undefined): string | null {
    const unit = id ? this.hass.states[id]?.attributes.unit_of_measurement : undefined;
    return typeof unit === "string" && priceFactor(unit) !== 1 ? unit : null;
  }

  private _time(label: string, value: string, onChange: (v: string) => void): TemplateResult {
    return html`<label class="field"><span class="lbl">${label} *</span>
      <input class="input" type="time" step="900" .value=${value} @change=${(e: Event) => onChange((e.target as HTMLInputElement).value)} /></label>`;
  }

  render() {
    const all = this.section === "all";
    const s = this.value;
    if (!s) return nothing;
    const part = (heading: string, body: TemplateResult) =>
      !all ? body : this.cards ? html`<section class="card"><h2>${heading}</h2>${body}</section>` : html`<h3>${heading}</h3>${body}`;
    return html`
      ${all || this.section === "price" ? part(t("sf.h.price"), this._price(s)) : nothing}
      ${all || this.section === "meters" ? part(t("sf.h.meters"), this._meters()) : nothing}
      ${(all && needsSolar(s)) || this.section === "solar" ? part(t("sf.h.solar"), this._solar(s)) : nothing}`;
  }

  /** Grid price of this moment with the answers so far: entity (plus markup and VAT) or the normal tariff. */
  private _gridPrice(s: Settings): number | null {
    if (s.contract === "fixed") return s.price_normal ?? null;
    const raw = this._state(s.price_entity);
    if (raw === null) return null;
    return this._extra ? (raw + (s.price_markup ?? 0)) * (1 + (s.price_vat ?? 0) / 100) : raw;
  }

  private _price(s: Settings): TemplateResult {
    const entity = s.contract === "dynamic";
    const fixed = s.contract === "fixed";
    const saved = this.config.settings.price_entity === s.price_entity && this.config.settings.contract === "dynamic";
    const st = this.config.status;
    const raw = this._state(s.price_entity);
    const p = (v: number | null | undefined) => eur(v ?? null, 3);
    const markup = s.price_markup ?? null;
    const vat = s.price_vat ?? 0;
    const exFull = raw !== null ? t("ex.full_yes", { price: p(raw) }) : t("ex.full_yes", { price: p(0.29) });
    const known = raw !== null && markup !== null && markup > 0;
    const exExtra = raw === null
      ? t("ex.full_no", { raw: p(0.09), markup: p(0.17), total: p(0.26) })
      : vat > 0
        ? t("ex.full_no_vat", { raw: p(raw), markup: known ? p(markup) : t("ex.markup"), vat, total: known ? p((raw + markup) * (1 + vat / 100)) : "…" })
        : t("ex.full_no", { raw: p(raw), markup: known ? p(markup) : t("ex.markup"), total: known ? p(raw + markup) : "…" });
    const unit = this._unit(s.price_entity);
    const forecast = !raw || !saved ? "" : st.price_from_action
      ? t("sf.forecast_action", { action: st.price_attribute ?? "" })
      : t(st.price_attribute ? "sf.forecast_found" : "sf.forecast_none");
    const normal = s.price_normal ?? null;
    const low = s.price_low ?? null;
    return html`
      <div class="q">
        <span class="title">${t("sf.how")} *</span>
        <div class="radios" role="radiogroup" aria-label=${t("sf.how")}>
          ${radio(entity, t("sf.entity"), t("sf.entity_text"), () => this._set({ contract: "dynamic" }),
            t("ex.entity", { a: eur(0.24, 2), b: eur(0.31, 2) }))}
          ${radio(fixed, t("sf.fixed"), t("sf.fixed_text"), () => this._set({ contract: "fixed", export_price_mode: "fixed" }),
            t("ex.fixed", { price: eur(0.29, 2) }))}
        </div>
      </div>
      ${entity
        ? html`<div class="sub">
            <ed-entity-select .hass=${this.hass} .label=${t("sf.price_entity")} required
              .value=${s.price_entity ?? null} .options=${this._priceOptions(s.price_entity)} .filter=${priceFilter}
              @value-changed=${(e: CustomEvent) => this._set({ price_entity: e.detail.value })}></ed-entity-select>
            ${s.price_entity
              ? html`<div class="help status"><ha-icon icon="mdi:information-outline"></ha-icon><span>
                  ${raw === null ? t("sf.no_number") : t("ex.now", { price: eur(raw, 3) })}${unit ? ` · ${t("sf.unit", { unit })}` : ""}${forecast ? ` · ${forecast}` : ""}</span></div>`
              : nothing}
            <div class="q">
              <span class="title">${t("sf.full")} *</span>
              <div class="radios" role="radiogroup" aria-label=${t("sf.full")}>
                ${radio(this._extra === false, t("sf.full_yes"), t("sf.full_yes_text"), () => { this._extra = false; this._set({ price_markup: 0, price_vat: null }); }, exFull)}
                ${radio(this._extra === true, t("sf.full_no"), t("sf.full_no_text"), () => { this._extra = true; this._set({ price_markup: s.price_markup ? s.price_markup : null }); }, exExtra)}
              </div>
            </div>
            ${this._extra
              ? html`<div class="row wrap">
                  ${this._money(t("sf.markup"), s.price_markup, t("sf.markup_help"), (v) => this._set({ price_markup: v }))}
                  <label class="field"><span class="lbl">${t("sf.vat")}</span>
                    <input class="input" inputmode="decimal" .value=${s.price_vat == null ? "" : String(s.price_vat)}
                      @change=${(e: Event) => this._set({ price_vat: num((e.target as HTMLInputElement).value) })} />
                    <span class="help">${t("sf.vat_help")}</span></label>
                </div>`
              : nothing}
          </div>`
        : nothing}
      ${fixed
        ? html`<div class="sub">
            <div class="q">
              <span class="title">${t("sf.tariffs")} *</span>
              <div class="radios" role="radiogroup" aria-label=${t("sf.tariffs")}>
                ${radio(this._dual === false, t("sf.one"), t("sf.one_text"), () => { this._dual = false; this._set({ price_low: null, low_start: null, low_end: null, low_weekend: null }); },
                  t("ex.one", { price: eur(normal ?? 0.29, 2) }))}
                ${radio(this._dual === true, t("sf.two"), t("sf.two_text"), () => { this._dual = true; this._set({}); },
                  t("ex.two", { normal: eur(normal ?? 0.31, 2), low: eur(low ?? 0.27, 2) }))}
              </div>
            </div>
            ${this._dual === false ? this._money(t("sf.price"), s.price_normal, "", (v) => this._set({ price_normal: v })) : nothing}
            ${this._dual
              ? html`<div class="row wrap">${this._money(t("set.normal"), s.price_normal, "", (v) => this._set({ price_normal: v }))}
                  ${this._money(t("set.low"), s.price_low, "", (v) => this._set({ price_low: v }))}</div>
                <div class="q">
                  <span class="title">${t("sf.low_hours")}</span>
                  <div class="row wrap">
                    ${this._time(t("sf.low_start"), s.low_start ?? "23:00", (v) => this._set({ low_start: v || null }))}
                    ${this._time(t("sf.low_end"), s.low_end ?? "07:00", (v) => this._set({ low_end: v || null }))}
                  </div>
                  <label class="check"><input type="checkbox" .checked=${s.low_weekend ?? true}
                    @change=${(e: Event) => this._set({ low_weekend: (e.target as HTMLInputElement).checked })} />${t("sf.low_weekend")}</label>
                  <span class="help">${t("set.low_help")}</span>
                </div>`
              : nothing}
          </div>`
        : nothing}`;
  }

  private _meterList(key: MeterKey, label: string, help: string, required: boolean): TemplateResult {
    const raw = this.value[key];
    const ids: (string | null)[] = Array.isArray(raw) ? [...raw] : raw ? [raw] : [];
    if (ids.length === 0) ids.push(null);
    // Empty rows ("Teller toevoegen") stay until removed; meterIds() leaves them out when saving.
    const update = (next: (string | null)[]) => this._set({ [key]: next.map((x) => x ?? "") } as Partial<Settings>);
    return html`<div class="q">
      ${ids.map((id, i) => html`<div class="meter">
        <ed-entity-select .hass=${this.hass} .label=${i === 0 ? label : t("sf.another", { label: label.toLowerCase() })} .help=${i === ids.length - 1 ? help : ""}
          ?required=${required && i === 0} ?allowNone=${!required || i > 0} .value=${id} .options=${this._opt(id)} .filter=${energyOnlyFilter}
          @value-changed=${(e: CustomEvent) => { const next = [...ids]; next[i] = e.detail.value; update(next); }}></ed-entity-select>
        ${ids.length > 1
          ? html`<button class="icon" aria-label=${t("sf.remove", { label })} title=${t("sf.remove", { label })} @click=${() => update(ids.filter((_, j) => j !== i))}><ha-icon icon="mdi:close"></ha-icon></button>`
          : nothing}
      </div>`)}
      ${ids[ids.length - 1]
        ? html`<div><button class="btn text" style="padding-left:0" @click=${() => update([...ids, ""])}>
            <ha-icon icon="mdi:plus"></ha-icon>${t("sf.add_counter")}</button></div>`
        : nothing}
    </div>`;
  }

  private _meters(): TemplateResult {
    return html`
      ${this._meterList("import_entity", t("set.import"), t("sf.import_help"), true)}
      ${this._meterList("export_entity", t("set.export"), t("sf.export_help"), false)}
      ${this._meterList("solar_entity", t("set.solar"), t("sf.solar_help"), false)}
      ${this._meterList("battery_charge_entity", t("set.battery_charge"), "", false)}
      ${this._meterList("battery_discharge_entity", t("set.battery_discharge"), t("sf.battery_help"), false)}`;
  }

  private _solar(s: Settings): TemplateResult {
    const entity = s.contract === "dynamic";
    // The forecast belongs to the saved price entity; another entity is only known after saving.
    const forecast = this.config.settings.price_entity === s.price_entity ? this.config.status.forecast_export_now ?? null : null;
    const grid = this._gridPrice(s);
    const exportNow = !entity ? s.export_price_fixed ?? null
      : s.export_price_mode === "auto" ? forecast
      : s.export_price_mode === "entity" ? this._state(s.export_price_entity)
      : s.export_price_mode === "fixed" ? s.export_price_fixed ?? null : null;
    return html`
      <div class="q">
        <span class="title">${t("set.solar_mode")} *</span>
        <div class="radios" role="radiogroup" aria-label=${t("set.solar_mode")}>
          ${radio(s.solar_mode === "export", t("set.mode.export"), t("set.mode.export_text"), () => this._set({ solar_mode: "export" }),
            exportNow === null ? t("ex.solar_export_unknown") : t("ex.solar_export", { price: eur(exportNow, 2) }))}
          ${radio(s.solar_mode === "free", t("set.mode.free"), t("set.mode.free_text"), () => this._set({ solar_mode: "free" }),
            t("ex.solar_free", { price: eur(0, 2) }))}
          ${radio(s.solar_mode === "grid", t("set.mode.grid"), t("set.mode.grid_text"), () => this._set({ solar_mode: "grid" }),
            grid === null ? t("ex.solar_grid_unknown") : t("ex.solar_grid", { price: eur(grid, 2) }))}
        </div>
      </div>
      ${s.solar_mode === "export" ? this._exportPrice(s, entity, forecast) : nothing}`;
  }

  /** Follow-up of "What you would otherwise have received": where the export price comes from. */
  private _exportPrice(s: Settings, entity: boolean, forecast: number | null): TemplateResult {
    const back = (v: number | null, fallback: number) => (v === null ? t("ex.eg", { price: eur(fallback, 2) }) : t("ex.now", { price: eur(v, 2) }));
    return html`<div class="sub">
      <div class="q">
        <span class="title">${t(entity ? "sf.export_q" : "sf.export_fixed")} *</span>
        ${entity
          ? html`<div class="radios" role="radiogroup" aria-label=${t("sf.export_q")}>
              ${radio(s.export_price_mode === "auto", t("sf.exp.auto"), t("sf.exp.auto_text"), () => this._set({ export_price_mode: "auto" }),
                forecast !== null ? back(forecast, 0) : t("ex.auto"))}
              ${radio(s.export_price_mode === "entity", t("sf.exp.entity"), t("sf.exp.entity_text"), () => this._set({ export_price_mode: "entity" }),
                back(s.export_price_mode === "entity" ? this._state(s.export_price_entity) : null, 0.08))}
              ${radio(s.export_price_mode === "fixed", t("sf.exp.fixed"), t("sf.exp.fixed_text"), () => this._set({ export_price_mode: "fixed" }),
                back(s.export_price_mode === "fixed" ? s.export_price_fixed ?? null : null, 0.07))}
            </div>`
          : nothing}
      </div>
      ${s.export_price_mode === "entity" && entity
        ? html`<ed-entity-select .hass=${this.hass} .label=${t("sf.export_entity")} required .value=${s.export_price_entity ?? null}
            .options=${this._priceOptions(s.export_price_entity)} .filter=${priceFilter}
            @value-changed=${(e: CustomEvent) => this._set({ export_price_entity: e.detail.value })}></ed-entity-select>`
        : nothing}
      ${s.export_price_mode === "fixed" && entity
        ? this._money(t("sf.export_fixed"), s.export_price_fixed, t("sf.export_fixed_help"), (v) => this._set({ export_price_fixed: v }))
        : nothing}
      ${!entity
        ? html`<input class="input" inputmode="decimal" aria-label=${t("sf.export_fixed")} .value=${s.export_price_fixed == null ? "" : String(s.export_price_fixed)}
            @change=${(e: Event) => this._set({ export_price_fixed: num((e.target as HTMLInputElement).value), export_price_mode: "fixed" })} />
          <span class="help">${t("sf.export_fixed_help")}</span>`
        : nothing}
    </div>`;
  }
}

define("ed-settings-form", EdSettingsForm);

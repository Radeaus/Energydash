// Dialogs: add/edit device wizard, device details, prices-and-solar settings with test tools.

import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { api, type Analysis, type Candidate, type Check, type Device, type DeviceType, type Preview, type Settings, type StepLog } from "./api";
import { anySensorFilter, define, energyFilter, energyOnlyFilter, fire, powerFilter, sessionFilter, type EntityOption } from "./components";
import { DEVICE_LIGHT, dateTime, deviceColor, eur, num, time } from "./format";
import { t } from "./i18n";
import { shared } from "./styles";
import { TYPE_ICON, deviceInfo, ruleText, type Ctx } from "./views";

type Step = "pick" | "type" | "sources" | "tune";
const CHARGER_OFF_DELAY_MIN = 60;

function radio(checked: boolean, title: string, text: string, onClick: () => void): TemplateResult {
  return html`<button class="radio" role="radio" aria-checked=${checked} @click=${onClick}>
    <span class="dot"></span><div><b>${title}</b><span>${text}</span></div>
  </button>`;
}

export function checkRow(c: Check): TemplateResult {
  const icon = c.level === "ok" ? "mdi:check-circle" : c.level === "warn" ? "mdi:alert" : "mdi:close-circle";
  const color = c.level === "ok" ? "var(--ed-ok)" : c.level === "warn" ? "var(--ed-warn)" : "var(--ed-err)";
  const value = c.value === null || c.value === undefined ? "" : String(c.value);
  return html`<div class="row" style="align-items:flex-start;padding:6px 0">
    <ha-icon icon=${icon} style="color:${color};--mdc-icon-size:20px;flex:none"></ha-icon>
    <div class="grow"><b style="font-weight:500">${t(`chk.${c.code}`)}</b>${c.code === "unit" || c.code === "state_class" || c.code === "power_only" ? html` <span class="muted small">${value}</span>` : nothing}
      <div class="muted small">${t(`chk.${c.code}.${c.level}`, { value })}</div></div>
  </div>`;
}

const SOLAR_CHECK: Check = { level: "ok", code: "solar", value: null };

const ICONS = [
  "mdi:washing-machine", "mdi:tumble-dryer", "mdi:dishwasher", "mdi:ev-station", "mdi:car-electric", "mdi:server",
  "mdi:fridge", "mdi:heat-pump", "mdi:air-conditioner", "mdi:water-boiler", "mdi:stove", "mdi:microwave",
  "mdi:television", "mdi:desktop-tower", "mdi:lightbulb", "mdi:power-plug",
];

const lookCss = css`
  .look { display: grid; gap: 12px; }
  .swatches, .icons { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .sw { width: 32px; height: 32px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; outline-offset: 2px; }
  .sw[aria-checked="true"] { outline: 2px solid var(--ed-text); }
  .custom { width: 36px; height: 36px; padding: 0; border: 1px solid var(--ed-line); border-radius: 50%; background: none; cursor: pointer; }
  .ic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--ed-line); background: none; cursor: pointer; color: var(--ed-text2); --mdc-icon-size: 22px; }
  .ic[aria-checked="true"] { border: 2px solid currentColor; }
`;

/** Colour and icon of a device: palette swatches plus any colour, a set of icons plus any mdi icon. */
function renderLook(dev: Device, fallbackIdx: number, dark: boolean, onChange: (patch: Partial<Device>) => void): TemplateResult {
  const color = deviceColor(dev.color ?? fallbackIdx, dark);
  const icon = dev.icon || TYPE_ICON[dev.type];
  const hex = typeof dev.color === "string" ? dev.color : DEVICE_LIGHT[(dev.color ?? fallbackIdx) % DEVICE_LIGHT.length];
  return html`<div class="look">
    <div>
      <div style="font-weight:500;font-size:14px;margin-bottom:6px">${t("w.color")}</div>
      <div class="swatches" role="radiogroup" aria-label=${t("w.color")}>
        ${DEVICE_LIGHT.map((_, i) => html`<button class="sw" role="radio" aria-checked=${(dev.color ?? fallbackIdx) === i} aria-label=${t("w.color_n", { n: i + 1 })}
          style="background:${deviceColor(i, dark)}" @click=${() => onChange({ color: i })}></button>`)}
        <label class="row" style="gap:6px"><input class="custom" type="color" aria-label=${t("w.color_custom")} .value=${hex}
          @input=${(e: Event) => onChange({ color: (e.target as HTMLInputElement).value })} /><span class="help">${t("w.color_custom")}</span></label>
      </div>
    </div>
    <div>
      <div style="font-weight:500;font-size:14px;margin-bottom:6px">${t("w.icon")}</div>
      <div class="icons" role="radiogroup" aria-label=${t("w.icon")}>
        ${ICONS.map((i) => html`<button class="ic" role="radio" aria-checked=${icon === i} aria-label=${i} title=${i}
          style=${icon === i ? `color:${color}` : ""} @click=${() => onChange({ icon: i })}><ha-icon icon=${i}></ha-icon></button>`)}
      </div>
    </div>
    <label class="field"><span class="lbl">${t("w.icon_other")}</span>
      <div class="row" style="gap:8px"><ha-icon icon=${icon} style="color:${color};--mdc-icon-size:28px;flex:none"></ha-icon>
        <input class="input" placeholder="mdi:…" .value=${dev.icon ?? ""} @change=${(e: Event) => onChange({ icon: (e.target as HTMLInputElement).value.trim() || null })} /></div>
      <span class="help">${t("w.icon_help")}</span></label>
  </div>`;
}

// ---------------------------------------------------------------- add / edit
export class EdAddDevice extends LitElement {
  declare ctx: Ctx;
  declare candidate: Candidate | null;
  declare existing: Device | null;
  declare _step: Step;
  declare _dev: Device;
  declare _found: { suggested: Candidate[]; others: Candidate[] } | null;
  declare _q: string;
  declare _analysis: Analysis | null;
  declare _analyzing: boolean;
  declare _preview: Preview | null;
  declare _saving: boolean;
  declare _recalc: boolean;
  declare _error: string;

  static properties = {
    ctx: { attribute: false },
    candidate: { attribute: false },
    existing: { attribute: false },
    _step: { state: true },
    _dev: { state: true },
    _found: { state: true },
    _q: { state: true },
    _analysis: { state: true },
    _analyzing: { state: true },
    _preview: { state: true },
    _saving: { state: true },
    _recalc: { state: true },
    _error: { state: true },
  };

  static styles = [
    shared,
    lookCss,
    css`
      .radios { display: grid; gap: 8px; }
      .states { display: flex; flex-wrap: wrap; gap: 8px; }
      svg { width: 100%; height: 160px; display: block; }
      .tune { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
      .sess { font-size: 13px; display: grid; gap: 2px; max-height: 160px; overflow: auto; }
    `,
  ];

  constructor() {
    super();
    this.candidate = null;
    this.existing = null;
    this._step = "pick";
    this._found = null;
    this._q = "";
    this._analysis = null;
    this._analyzing = false;
    this._preview = null;
    this._saving = false;
    this._recalc = true;
    this._error = "";
    this._dev = this._blank();
  }

  private _blank(): Device {
    return {
      name: "", type: "sessions", energy_entity: "", energy_is_power: false, power_entity: null,
      session_source: "power", session_entity: null, session_states: [], threshold_w: 3, off_delay_min: 5, min_duration_min: 10,
    };
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.existing) {
      this._dev = { ...this.existing, session_states: [...this.existing.session_states] };
      this._step = "type";
      this._recalc = false;
      this._analyze();
    } else if (this.candidate) {
      this._fromCandidate(this.candidate);
    } else {
      api.discover(this.ctx.hass).then((r) => (this._found = r));
    }
  }

  private get _isEdit() {
    return !!this.existing;
  }

  private _fromCandidate(c: Candidate) {
    this._dev = {
      ...this._blank(),
      name: c.name,
      type: c.type,
      energy_entity: c.entity_id,
      energy_is_power: c.power_only,
      power_entity: c.power_only ? c.entity_id : c.power_entity,
      session_source: c.type === "charger" ? "entity" : "power",
    };
    this._step = "type";
    this._analyze();
  }

  private _fromEntity(id: string) {
    const st = this.ctx.hass.states[id];
    const power = st?.attributes.device_class === "power";
    const name = String(st?.attributes.friendly_name ?? id);
    const c: Candidate = { entity_id: id, name, unit: st?.attributes.unit_of_measurement ?? null, device_name: null, area: null, in_energy_prefs: false, power_entity: null, power_only: power, type: "sessions", type_reason: "default" };
    this._fromCandidate(c);
  }

  private async _analyze(): Promise<void> {
    const d = this._dev;
    if (!d.energy_entity) return;
    this._analyzing = true;
    try {
      const a = await api.analyze(this.ctx.hass, {
        energy_entity: d.energy_entity,
        energy_is_power: d.energy_is_power,
        power_entity: d.energy_is_power ? null : d.power_entity,
        session_entity: d.session_source === "entity" ? d.session_entity : null,
      });
      this._analysis = a;
      if (!this._isEdit) {
        const patch: Partial<Device> = {};
        if (!d.name) patch.name = d.energy_entity;
        if (this._step === "type" && !this.candidate?.type_reason?.startsWith("name") && a.type_reason !== "no_history") patch.type = a.suggested_type;
        if (d.session_source === "entity" && !d.session_entity && a.session_candidates.length) {
          patch.session_entity = a.session_candidates[0].entity_id;
          this._dev = { ...this._dev, ...patch };
          return this._analyze();
        }
        if (d.session_source === "entity" && d.session_states.length === 0 && a.session_suggested_states?.length) patch.session_states = [...a.session_suggested_states];
        this._dev = { ...this._dev, ...patch };
      }
    } catch (e) {
      this._error = String((e as Error).message ?? e);
    } finally {
      this._analyzing = false;
    }
  }

  private _set(patch: Partial<Device>, reanalyze = false) {
    this._dev = { ...this._dev, ...patch };
    if (reanalyze) this._analyze();
    if (this._step === "tune") this._schedulePreview();
  }

  private _previewTimer?: number;
  private _schedulePreview() {
    window.clearTimeout(this._previewTimer);
    this._previewTimer = window.setTimeout(async () => {
      try {
        this._preview = await api.preview(this.ctx.hass, this._dev);
      } catch (e) {
        this._error = String((e as Error).message ?? e);
      }
    }, 350);
  }

  private get _needsTune() {
    return this._dev.type !== "continuous" && this._dev.session_source === "power";
  }

  private get _seq(): Step[] {
    const s: Step[] = this.candidate || this._isEdit ? [] : ["pick"];
    s.push("type", "sources");
    if (this._needsTune) s.push("tune");
    return s;
  }

  private _go(step: Step) {
    if (step === "tune") {
      if (!this._isEdit && this._analysis && this._dev.threshold_w === 3 && this._dev.off_delay_min === 5) {
        const p = this._analysis.power_settings;
        // Smart charging pauses for whole quarters when prices are high; those stay one session.
        const offDelay = this._dev.type === "charger" ? Math.max(p.off_delay_min, CHARGER_OFF_DELAY_MIN) : p.off_delay_min;
        this._dev = { ...this._dev, threshold_w: p.threshold_w, off_delay_min: offDelay, min_duration_min: p.min_duration_min };
      }
      this._preview = null;
      this._schedulePreview();
    }
    this._step = step;
  }

  private async _save() {
    this._saving = true;
    this._error = "";
    try {
      const dev = { ...this._dev };
      if (dev.type === "continuous") dev.session_states = [];
      await api.saveDevice(this.ctx.hass, dev, this._isEdit ? this._recalc : true);
      fire(this, "saved", this._isEdit ? t("t.saved") : t("t.added"));
    } catch (e) {
      this._error = String((e as Error).message ?? e);
      this._saving = false;
    }
  }

  private get _sourcesValid() {
    const d = this._dev;
    if (!d.energy_entity || !d.name.trim()) return false;
    if (d.type !== "continuous" && d.session_source === "entity") return !!d.session_entity && d.session_states.length > 0;
    return true;
  }

  render() {
    const seq = this._seq;
    const idx = seq.indexOf(this._step);
    const names: Record<Step, string> = { pick: t("w.pick"), type: t("w.type"), sources: t("w.sources"), tune: t("w.tune") };
    const last = idx === seq.length - 1;
    const back = idx > 0 ? () => this._go(seq[idx - 1]) : null;
    const nextOk = this._step === "type" ? !!this._dev.name.trim() : this._step === "sources" ? this._sourcesValid : true;
    return html`<ed-dialog .heading=${t(this._isEdit ? "w.edit_title" : "w.add_title")} .subheading=${t("w.step", { n: idx + 1, total: seq.length, name: names[this._step] })} ?wide=${this._step === "tune"} @closed=${() => fire(this, "closed")}>
      ${this._error ? html`<div class="alert bad"><ha-icon icon="mdi:alert-circle"></ha-icon>${t("c.error", { msg: this._error })}</div>` : nothing}
      ${this._step === "pick" ? this._renderPick() : this._step === "type" ? this._renderType() : this._step === "sources" ? this._renderSources() : this._renderTune()}
      ${this._step !== "pick"
        ? html`
            <button slot="footer" class="btn secondary" @click=${() => (back ? back() : fire(this, "closed"))}>${back ? t("c.back") : t("c.cancel")}</button>
            ${last
              ? html`<button slot="footer" class="btn" ?disabled=${!nextOk || this._saving} @click=${this._save}>${t("c.save")}</button>`
              : html`<button slot="footer" class="btn" ?disabled=${!nextOk} @click=${() => this._go(seq[idx + 1])}>${t("c.next")}</button>`}`
        : html`<button slot="footer" class="btn secondary" @click=${() => fire(this, "closed")}>${t("c.cancel")}</button>`}
    </ed-dialog>`;
  }

  private _renderPick() {
    const q = this._q.toLowerCase();
    const match = (c: { name: string; entity_id: string }) => !q || c.name.toLowerCase().includes(q) || c.entity_id.includes(q);
    const f = this._found;
    // Counters and power sensors that already belong to a device are not offered again.
    const used = new Set(this.ctx.config.devices.flatMap((d) => [d.energy_entity, d.power_entity]).filter((e): e is string => !!e));
    const known = new Set([...(f?.suggested ?? []), ...(f?.others ?? [])].map((c) => c.entity_id));
    const extra: EntityOption[] = q.length >= 2
      ? Object.values(this.ctx.hass.states).map(energyFilter).filter((o): o is EntityOption => !!o && !known.has(o.entity_id) && !used.has(o.entity_id) && match(o)).slice(0, 40)
      : [];
    const row = (c: Candidate) => html`<button class="item" @click=${() => this._fromCandidate(c)}>
      <div class="grow"><div>${c.name}</div><div class="muted small">${c.entity_id}${c.area ? ` · ${c.area}` : ""}</div></div>
      <span class="chip ${c.power_only ? "warn" : "ok"}">${c.power_only ? t("chip.power") : t("chip.counter")}</span>
    </button>`;
    const fresh = (c: Candidate) => !used.has(c.entity_id);
    const sug = (f?.suggested ?? []).filter((c) => fresh(c) && match(c));
    const oth = (f?.others ?? []).filter((c) => fresh(c) && match(c));
    return html`
      <label class="field"><span class="lbl">${t("c.search")}</span>
        <input class="input" .value=${this._q} @input=${(e: Event) => (this._q = (e.target as HTMLInputElement).value)} />
        <span class="help">${t("w.search_help")}</span></label>
      ${!f ? html`<p class="muted">${t("c.loading")}</p>` : nothing}
      ${sug.length ? html`<div><h3>${t("w.suggested")}</h3><div class="list">${sug.map(row)}</div></div>` : nothing}
      ${oth.length || extra.length
        ? html`<div><h3>${t("w.other")}</h3><div class="list">${oth.map(row)}${extra.map((o) => html`<button class="item" @click=${() => this._fromEntity(o.entity_id)}>
            <div class="grow"><div>${o.name}</div><div class="muted small">${o.entity_id}</div></div><span class="chip ${o.level}">${o.chip}</span></button>`)}</div></div>`
        : nothing}
      ${f && !sug.length && !oth.length && !extra.length ? html`<div class="empty" style="text-align:center"><h3>${t("w.no_results")}</h3><p class="muted">${t("w.no_results_hint")}</p></div>` : nothing}`;
  }

  private _renderType() {
    const d = this._dev;
    const types: DeviceType[] = ["sessions", "continuous", "charger"];
    const reason = this._analysis ? t(`w.reason.${this.candidate?.type_reason === "name" ? "name" : this._analysis.type_reason}`) : this._analyzing ? t("w.checking") : "";
    return html`
      <label class="field"><span class="lbl">${t("w.name")} *</span>
        <input class="input" .value=${d.name} @input=${(e: Event) => this._set({ name: (e.target as HTMLInputElement).value })} /></label>
      <div class="muted small">${d.energy_entity}</div>
      <div class="radios" role="radiogroup" aria-label=${t("w.type")}>
        ${types.map((ty) => radio(d.type === ty, t(`type.${ty}`), t(`type.${ty}.text`), () => this._set({ type: ty, session_source: ty === "charger" ? "entity" : d.session_entity && d.session_source === "entity" ? "entity" : "power" }, ty === "charger" && !d.session_entity)))}
      </div>
      ${reason ? html`<div class="help">${reason}</div>` : nothing}
      <details ?open=${this._isEdit}>
        <summary>${t("w.look")}</summary>
        ${renderLook(d, this._defaultColor, this.ctx.dark, (patch) => this._set(patch))}
      </details>`;
  }

  private get _defaultColor(): number {
    const idx = this.ctx.config.devices.findIndex((x) => x.id === this._dev.id);
    if (idx >= 0) return idx;
    const used = new Set(this.ctx.config.devices.map((x) => x.color));
    let i = 0;
    while (used.has(i)) i += 1;
    return i;
  }

  private _renderSources() {
    const d = this._dev;
    const a = this._analysis;
    const hass = this.ctx.hass;
    const f = this._found;
    const energyOptions: EntityOption[] = [];
    const add = (id: string | null | undefined) => {
      if (!id || energyOptions.some((o) => o.entity_id === id) || !hass.states[id]) return;
      const o = energyFilter(hass.states[id]);
      if (o) energyOptions.push(o);
    };
    add(d.energy_entity);
    add(this.candidate?.entity_id);
    add(this.candidate?.power_entity);
    for (const c of [...(f?.suggested ?? []), ...(f?.others ?? [])]) add(c.entity_id);
    const refreshBad = a?.checks.some((c) => c.code === "refresh" && c.level === "bad");
    if (refreshBad) {
      const cur = energyOptions.find((o) => o.entity_id === d.energy_entity);
      if (cur) { cur.chip = t("chip.not_recommended"); cur.level = "bad"; }
    }
    const isCharger = d.type === "charger";
    const sessOpts: EntityOption[] = (a?.session_candidates ?? []).map((c) => ({ entity_id: c.entity_id, name: c.name, chip: c.state, level: "neutral" as const }));
    const states = Array.from(new Set([...(a?.session_states ?? []), ...d.session_states]));
    const powerOpts: EntityOption[] = d.power_entity && hass.states[d.power_entity] ? [powerFilter(hass.states[d.power_entity])!].filter(Boolean) : [];
    const checks = [...(a?.checks ?? []), ...(d.type !== "continuous" && d.session_source === "entity" && a?.session_check ? [a.session_check] : []), SOLAR_CHECK];
    return html`
      <ed-entity-select .hass=${hass} .label=${t("w.energy")} .help=${t("w.energy_help")} required .value=${d.energy_entity} .options=${energyOptions} .filter=${energyFilter}
        @value-changed=${(e: CustomEvent) => {
          const id = e.detail.value as string;
          const power = hass.states[id]?.attributes.device_class === "power";
          this._set({ energy_entity: id, energy_is_power: power, power_entity: power ? id : d.power_entity }, true);
        }}></ed-entity-select>
      ${d.type !== "continuous"
        ? html`<div>
            <div style="font-weight:500;font-size:14px;margin-bottom:6px">${t("w.session_how")} *</div>
            <div class="radios" role="radiogroup">
              ${(isCharger ? (["entity", "power"] as const) : (["power", "entity"] as const)).map((m) =>
                radio(d.session_source === m, t(m === "power" ? "w.from_power" : "w.from_entity"),
                  t(m === "power" ? (isCharger ? "w.from_power_charger" : "w.from_power_text") : (isCharger ? "w.from_entity_charger" : "w.from_entity_text")),
                  () => this._set({ session_source: m }, m === "entity" && !d.session_entity)))}
            </div>
          </div>`
        : nothing}
      ${d.type !== "continuous" && d.session_source === "entity"
        ? html`<ed-entity-select .hass=${hass} .label=${t("w.session_entity")} required .value=${d.session_entity ?? null} .options=${sessOpts} .filter=${sessionFilter}
              @value-changed=${(e: CustomEvent) => this._set({ session_entity: e.detail.value, session_states: [] }, true)}></ed-entity-select>
            ${d.session_entity
              ? html`<div>
                  <div style="font-weight:500;font-size:14px;margin-bottom:6px">${t("w.session_states")} *</div>
                  <div class="states">${states.map((s) => {
                    const on = d.session_states.includes(s);
                    return html`<button class="chip" aria-pressed=${on} @click=${() => this._set({ session_states: on ? d.session_states.filter((x) => x !== s) : [...d.session_states, s] })}>${s}</button>`;
                  })}</div>
                  ${d.session_states.length === 0 ? html`<div class="help" style="color:var(--ed-err);margin-top:4px">${t("w.pick_state")}</div>` : html`<div class="help" style="margin-top:4px">${t("w.session_states_help")}</div>`}
                </div>`
              : nothing}`
        : nothing}
      ${d.type !== "continuous" && d.session_source === "power" && !d.energy_is_power
        ? html`<ed-entity-select .hass=${hass} .label=${t("w.power_entity")} .help=${t("w.power_entity_help")} allowNone .value=${d.power_entity ?? null} .options=${powerOpts} .filter=${powerFilter}
            @value-changed=${(e: CustomEvent) => this._set({ power_entity: e.detail.value })}></ed-entity-select>`
        : nothing}
      <div>
        <h3>${t("v.check")}</h3>
        ${this._analyzing && !a ? html`<p class="muted">${t("w.checking")}</p>` : checks.map(checkRow)}
      </div>
      ${this._isEdit
        ? html`<label class="row" style="align-items:flex-start"><input type="checkbox" .checked=${this._recalc} @change=${(e: Event) => (this._recalc = (e.target as HTMLInputElement).checked)} />
            <div><b style="font-weight:500">${t("w.recalc_edit")}</b><div class="help">${t("w.recalc_edit_help")}</div></div></label>`
        : !this._needsTune ? html`<p class="muted small">${t("w.recalc_note")}</p>` : nothing}`;
  }

  private _renderTune() {
    const d = this._dev;
    const p = this._preview;
    const days = 7;
    let chart: TemplateResult = html`<p class="muted">${t("c.loading")}</p>`;
    if (p) {
      const t0 = new Date(p.start).getTime();
      const t1 = new Date(p.end).getTime();
      const maxW = Math.max(d.threshold_w * 2, ...p.power.map((x) => x[1]));
      const X = (iso: string) => (((new Date(iso).getTime() - t0) / (t1 - t0)) * 1000).toFixed(1);
      const Y = (w: number) => (150 - (Math.min(w, maxW) / maxW) * 140).toFixed(1);
      const line = p.power.map((x) => `${X(x[0])},${Y(x[1])}`).join(" ");
      chart = html`<svg viewBox="0 0 1000 160" preserveAspectRatio="none" role="img" aria-label=${t("w.chart", { d: days })}>
        ${p.sessions.map((s) => html`<rect x=${X(s.start)} y="0" width=${Math.max(Number(X(s.end)) - Number(X(s.start)), 2)} height="150" fill="var(--ed-pri)" opacity="0.15"></rect>`)}
        <polyline points=${line} fill="none" stroke="var(--ed-pri)" stroke-width="1.2" vector-effect="non-scaling-stroke"></polyline>
        <line x1="0" x2="1000" y1=${Y(d.threshold_w)} y2=${Y(d.threshold_w)} stroke="var(--ed-warn)" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"></line>
        <line x1="0" x2="1000" y1="150" y2="150" stroke="var(--ed-line)"></line>
      </svg>`;
    }
    const n = p?.sessions.length ?? 0;
    const standby = this._analysis?.power_settings.standby_w;
    return html`
      ${chart}
      <div class="tune">
        <label class="field"><span class="lbl">${t("w.threshold")} (W)</span>
          <input class="input" type="number" min="0.5" step="0.5" .value=${String(d.threshold_w)} @change=${(e: Event) => this._set({ threshold_w: Number((e.target as HTMLInputElement).value) || 3 })} />
          ${standby !== undefined ? html`<span class="help">${t("w.standby", { w: num(standby, 1) })}</span>` : nothing}</label>
        <label class="field"><span class="lbl">${t("w.off_delay")}: ${num(d.off_delay_min, 0)} min</span>
          <input type="range" min="1" max=${d.type === "charger" ? 240 : 60} step=${d.type === "charger" ? 5 : 1} .value=${String(d.off_delay_min)} @input=${(e: Event) => this._set({ off_delay_min: Number((e.target as HTMLInputElement).value) })} />
          <span class="help">${t(d.type === "charger" ? "w.off_delay_help_charger" : "w.off_delay_help")}</span></label>
        <label class="field"><span class="lbl">${t("w.min_duration")} (min)</span>
          <input class="input" type="number" min="0" step="1" .value=${String(d.min_duration_min)} @change=${(e: Event) => this._set({ min_duration_min: Number((e.target as HTMLInputElement).value) || 0 })} />
          <span class="help">${t("w.min_duration_help")}</span></label>
      </div>
      ${p
        ? html`<div class="alert ${n > 0 ? "ok" : "warn"}"><ha-icon icon=${n > 0 ? "mdi:check-circle" : "mdi:alert"}></ha-icon>
            <div class="grow"><b style="font-weight:500">${n === 0 ? t("w.found_none", { d: days }) : n === 1 ? t("w.found_one", { d: days }) : t("w.found", { n, d: days })}</b>
              <div>${n === 0 ? t("w.found_none_hint") : n > 3 * days ? t("w.found_many_hint") : ""}</div>
              ${n > 0 ? html`<div class="sess">${p.sessions.slice(-12).reverse().map((s) => html`<span>${dateTime(s.start)} – ${time(s.end)} · ${s.minutes} min${s.kwh !== null ? ` · ${num(s.kwh, 2)} kWh` : ""}</span>`)}</div>` : nothing}
            </div></div>`
        : nothing}
      ${this._isEdit
        ? html`<label class="row" style="align-items:flex-start"><input type="checkbox" .checked=${this._recalc} @change=${(e: Event) => (this._recalc = (e.target as HTMLInputElement).checked)} />
            <div><b style="font-weight:500">${t("w.recalc_edit")}</b><div class="help">${t("w.recalc_edit_help")}</div></div></label>`
        : html`<p class="muted small">${t("w.recalc_note")}</p>`}`;
  }
}

// ------------------------------------------------------------- device detail
export class EdDeviceDialog extends LitElement {
  declare ctx: Ctx;
  declare device: Device;
  declare _analysis: Analysis | null;
  declare _steps: StepLog[] | null;
  declare _look: Partial<Device>;

  static properties = { ctx: { attribute: false }, device: { attribute: false }, _analysis: { state: true }, _steps: { state: true }, _look: { state: true } };
  static styles = [shared, lookCss, css`table { width: 100%; border-collapse: collapse; } td, th { text-align: right; padding: 3px 6px; border-bottom: 1px solid var(--ed-line); white-space: nowrap; } td:first-child, th:first-child, td:nth-child(2), th:nth-child(2) { text-align: left; } .scroll { overflow: auto; max-height: 260px; }`];

  constructor() {
    super();
    this._analysis = null;
    this._steps = null;
    this._look = {};
  }

  private _saveTimer?: number;
  private _setLook(patch: Partial<Device>) {
    this._look = { ...this._look, ...patch };
    // The colour picker fires while dragging: save once it settles. No recalculation needed.
    window.clearTimeout(this._saveTimer);
    this._saveTimer = window.setTimeout(() => api.saveDevice(this.ctx.hass, { ...this.device, ...this._look }, false).catch(() => undefined), 400);
  }

  connectedCallback() {
    super.connectedCallback();
    const d = this.device;
    api.analyze(this.ctx.hass, { energy_entity: d.energy_entity, energy_is_power: d.energy_is_power, power_entity: d.energy_is_power ? null : d.power_entity, session_entity: d.session_source === "entity" ? d.session_entity : null })
      .then((a) => (this._analysis = a))
      .catch(() => undefined);
  }

  render() {
    const d = { ...this.device, ...this._look };
    const n = this.ctx.config.numbers[d.id!];
    const admin = this.ctx.config.is_admin;
    const idx = this.ctx.config.devices.findIndex((x) => x.id === d.id);
    const info = { ...deviceInfo(this.ctx, d.id!), color: deviceColor(d.color ?? Math.max(idx, 0), this.ctx.dark) };
    const a = this._analysis;
    const checks = a ? [...a.checks, ...(d.session_source === "entity" && a.session_check && d.type !== "continuous" ? [a.session_check] : []), SOLAR_CHECK] : [];
    const cols = t("v.steps_cols").split("|");
    return html`<ed-dialog .heading=${d.name} .subheading=${t(`type.${d.type}`)} @closed=${() => fire(this, "closed")}>
      <div class="kv">
        <span>${t("v.row_energy")}</span><span class="mono">${d.energy_entity}${d.energy_is_power ? ` (${t("chip.power")})` : ""}</span>
        ${d.power_entity && !d.energy_is_power ? html`<span>${t("v.row_power")}</span><span class="mono">${d.power_entity}</span>` : nothing}
        <span>${t("v.row_sessions")}</span><span>${ruleText(this.ctx, d)}</span>
        <span>${t("v.row_solar")}</span><span>${t("v.solar_rule", { entity: this.ctx.config.settings.import_entity })}</span>
        <span>${t("c.today")}</span><span>${eur(n?.today.cost)} · ${num(n?.today.kwh, 2)} kWh</span>
        <span>${t("c.this_month")}</span><span>${eur(n?.month.cost)} · ${num(n?.month.kwh, 2)} kWh · ${n && n.month.kwh > 0 ? Math.round((n.month.zon / n.month.kwh) * 100) : 0}% ${t("s.solar").toLowerCase()}</span>
      </div>
      <div><h3>${t("v.check")}</h3>${a ? checks.map(checkRow) : html`<p class="muted">${t("w.checking")}</p>`}</div>
      ${admin ? html`<details><summary>${t("w.look")}</summary>${renderLook(d, Math.max(idx, 0), this.ctx.dark, (patch) => this._setLook(patch))}</details>` : nothing}
      <details @toggle=${(e: Event) => { if ((e.target as HTMLDetailsElement).open && !this._steps) api.steps(this.ctx.hass, d.id!).then((r) => (this._steps = r.steps)); }}>
        <summary>${t("v.steps")}</summary>
        ${this._steps === null ? html`<p class="muted">${t("c.loading")}</p>` : this._steps.length === 0 ? html`<p class="muted">${t("v.steps_none")}</p>` : html`<div class="scroll"><table class="mono">
          <tr>${cols.map((c) => html`<th>${c}</th>`)}</tr>
          ${this._steps.map((s) => html`<tr title=${s.notes.join(", ")}><td>${time(s.t0)}</td><td>${time(s.t1)}</td><td>${num(s.kwh, 3)}</td><td>${s.import === null ? "—" : num(s.import, 3)}</td><td>${num(s.net, 3)}</td><td>${num(s.zon, 3)}</td><td>${num(s.price, 4)}</td><td>${num(s.net_cost, 4)}</td></tr>`)}
        </table></div>`}
      </details>
      ${admin
        ? html`<button slot="start" class="btn danger-text" @click=${() => fire(this, "delete-device", d)}>${t("c.delete")}</button>
            <button slot="footer" class="btn secondary" title=${t("v.recalc_text")} @click=${() => fire(this, "recalc-device", d)}>${t("v.recalc")}</button>
            <button slot="footer" class="btn secondary" @click=${() => fire(this, "edit-device", d)}>${t("c.edit")}</button>`
        : nothing}
      <button slot="footer" class="btn" style="background:${info.color}" @click=${() => fire(this, "closed")}>${t("c.close")}</button>
    </ed-dialog>`;
  }
}

// ------------------------------------------------------------------ settings
export class EdSettingsDialog extends LitElement {
  declare ctx: Ctx;
  declare _s: Settings;
  declare _saving: boolean;
  declare _error: string;

  static properties = { ctx: { attribute: false }, _s: { state: true }, _saving: { state: true }, _error: { state: true } };
  static styles = [shared, css`.radios { display: grid; gap: 8px; } .tool { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-top: 1px solid var(--ed-line); } .tool .grow > b { font-weight: 500; }`];

  constructor() {
    super();
    this._saving = false;
    this._error = "";
  }

  connectedCallback() {
    super.connectedCallback();
    this._s = { ...this.ctx.config.settings };
  }

  private _set(patch: Partial<Settings>) {
    this._s = { ...this._s, ...patch };
  }

  private async _save() {
    this._saving = true;
    this._error = "";
    try {
      await api.saveSettings(this.ctx.hass, this._s);
      fire(this, "saved", t("t.saved"));
    } catch (e) {
      this._error = String((e as Error).message ?? e);
      this._saving = false;
    }
  }

  private _num(v: string): number | null {
    const n = Number(v.replace(",", "."));
    return v.trim() === "" || Number.isNaN(n) ? null : n;
  }

  private _import() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data || !Array.isArray(data.devices)) throw new Error(t("set.invalid_file"));
        fire(this, "import-config", data);
      } catch (e) {
        this._error = String((e as Error).message ?? e);
      }
    };
    input.click();
  }

  render() {
    const s = this._s;
    const hass = this.ctx.hass;
    const admin = this.ctx.config.is_admin;
    const st = this.ctx.config.status;
    const opt = (id: string | null | undefined): EntityOption[] => (id && hass.states[id] ? [anySensorFilter(hass.states[id])!] : []);
    const price = s.contract === "dynamic";
    const valid = !!s.import_entity && (price ? !!s.price_entity : s.price_normal !== null && s.price_normal !== undefined);
    return html`<ed-dialog .heading=${t("set.title")} @closed=${() => fire(this, "closed")}>
      ${!admin ? html`<div class="alert info"><ha-icon icon="mdi:information"></ha-icon>${t("c.admin_only")}</div>` : nothing}
      ${this._error ? html`<div class="alert bad"><ha-icon icon="mdi:alert-circle"></ha-icon>${t("c.error", { msg: this._error })}</div>` : nothing}
      <div>
        <div style="font-weight:500;font-size:14px;margin-bottom:6px">${t("set.contract")} *</div>
        <div class="radios" role="radiogroup">
          ${radio(price, t("set.dynamic"), t("set.dynamic_text"), () => this._set({ contract: "dynamic" }))}
          ${radio(!price, t("set.fixed"), t("set.fixed_text"), () => this._set({ contract: "fixed" }))}
        </div>
      </div>
      ${price
        ? html`<ed-entity-select .hass=${hass} .label=${t("set.price_entity")} .help=${t("set.price_entity_help")} required .value=${s.price_entity ?? null} .options=${opt(s.price_entity)} .filter=${anySensorFilter}
              @value-changed=${(e: CustomEvent) => this._set({ price_entity: e.detail.value })}></ed-entity-select>
            <div class="help">${t("set.price_status")}: ${st.price_attribute ? t("set.forecast_found", { attr: st.price_attribute }) + (st.price_scale !== 1 ? t("set.forecast_scaled", { scale: st.price_scale }) : "") : t("set.forecast_none")}${st.price_current !== null ? ` · ${eur(st.price_current, 4)}/kWh` : ""}</div>`
        : html`<div class="row wrap">
            <label class="field grow"><span class="lbl">${t("set.normal")} *</span><input class="input" inputmode="decimal" .value=${s.price_normal == null ? "" : String(s.price_normal)} @change=${(e: Event) => this._set({ price_normal: this._num((e.target as HTMLInputElement).value) })} /></label>
            <label class="field grow"><span class="lbl">${t("set.low")} *</span><input class="input" inputmode="decimal" .value=${s.price_low == null ? "" : String(s.price_low)} @change=${(e: Event) => this._set({ price_low: this._num((e.target as HTMLInputElement).value) })} /><span class="help">${t("set.low_help")}</span></label>
          </div>`}
      <ed-entity-select .hass=${hass} .label=${t("set.import")} .help=${t("set.import_help")} required .value=${s.import_entity} .options=${opt(s.import_entity)} .filter=${energyOnlyFilter}
        @value-changed=${(e: CustomEvent) => this._set({ import_entity: e.detail.value })}></ed-entity-select>
      <ed-entity-select .hass=${hass} .label=${t("set.export")} allowNone .value=${s.export_entity ?? null} .options=${opt(s.export_entity)} .filter=${energyOnlyFilter}
        @value-changed=${(e: CustomEvent) => this._set({ export_entity: e.detail.value })}></ed-entity-select>
      <ed-entity-select .hass=${hass} .label=${t("set.solar")} .help=${t("set.solar_help")} allowNone .value=${s.solar_entity ?? null} .options=${opt(s.solar_entity)} .filter=${energyOnlyFilter}
        @value-changed=${(e: CustomEvent) => this._set({ solar_entity: e.detail.value })}></ed-entity-select>
      <div>
        <div style="font-weight:500;font-size:14px;margin-bottom:6px">${t("set.solar_mode")} *</div>
        <div class="radios" role="radiogroup">
          ${(["export", "free", "grid"] as const).map((m) => radio(s.solar_mode === m, t(`set.mode.${m}`), t(`set.mode.${m}_text`), () => this._set({ solar_mode: m })))}
        </div>
        <div class="help" style="margin-top:6px">${t("set.solar_mode_help")}</div>
      </div>
      ${s.solar_mode === "export"
        ? html`${price ? html`<ed-entity-select .hass=${hass} .label=${t("set.export_price_entity")} .help=${t("set.export_price_entity_help")} allowNone .value=${s.export_price_entity ?? null} .options=${opt(s.export_price_entity)} .filter=${anySensorFilter}
              @value-changed=${(e: CustomEvent) => this._set({ export_price_entity: e.detail.value })}></ed-entity-select>` : nothing}
            <label class="field"><span class="lbl">${t("set.export_price_fixed")}</span><input class="input" inputmode="decimal" .value=${s.export_price_fixed == null ? "" : String(s.export_price_fixed)} @change=${(e: Event) => this._set({ export_price_fixed: this._num((e.target as HTMLInputElement).value) })} /><span class="help">${t("set.export_price_fixed_help")}</span></label>`
        : nothing}
      ${admin
        ? html`<div>
            <h3 style="margin-top:8px">${t("set.test")}</h3>
            <p class="muted small">${t("set.test_text")}</p>
            <div class="tool"><ha-icon icon="mdi:calculator-variant-outline"></ha-icon><div class="grow"><b>${t("set.recalc_all")}</b><div class="help">${t("set.recalc_all_text")}</div></div>
              <button class="btn secondary" @click=${() => fire(this, "recalc-all")}>${t("v.recalc")}</button></div>
            <div class="tool"><ha-icon icon="mdi:file-export-outline"></ha-icon><div class="grow"><b>${t("set.export_btn")} / ${t("set.import_btn").toLowerCase()}</b><div class="help">${t("set.backup_text")}</div></div>
              <div class="row wrap" style="justify-content:flex-end"><button class="btn secondary" @click=${() => fire(this, "export-config")}>${t("set.export_btn")}</button><button class="btn secondary" @click=${this._import}>${t("set.import_btn")}</button></div></div>
            <div class="tool"><ha-icon icon="mdi:restart"></ha-icon><div class="grow"><b>${t("set.reflow")}</b><div class="help">${t("set.reflow_text")}</div></div>
              <a class="btn secondary" style="text-decoration:none" href="/config/integrations/integration/energydash">${t("set.reflow_btn")}</a></div>
            <div class="tool"><ha-icon icon="mdi:eraser"></ha-icon><div class="grow"><b>${t("set.clear")}</b><div class="help">${t("set.clear_text")}</div></div>
              <button class="btn danger-text" @click=${() => fire(this, "reset", "data")}>${t("set.clear")}</button></div>
            <div class="tool"><ha-icon icon="mdi:backup-restore"></ha-icon><div class="grow"><b>${t("set.reset")}</b><div class="help">${t("set.reset_text")}</div></div>
              <button class="btn danger-text" @click=${() => fire(this, "reset", "all")}>${t("set.reset")}</button></div>
            <p class="muted small">${t("set.version", { v: this.ctx.config.version })} · ${t("local")}</p>
          </div>`
        : nothing}
      <button slot="footer" class="btn secondary" @click=${() => fire(this, "closed")}>${t("c.cancel")}</button>
      ${admin ? html`<button slot="footer" class="btn" ?disabled=${!valid || this._saving} @click=${this._save}>${t("c.save")}</button>` : nothing}
    </ed-dialog>`;
  }
}

define("ed-add-device", EdAddDevice);
define("ed-device-dialog", EdDeviceDialog);
define("ed-settings-dialog", EdSettingsDialog);

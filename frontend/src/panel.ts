// <energydash-panel>: the sidebar panel registered by the integration (docs/05).

import { LitElement, css, html, nothing } from "lit";
import { api, type Candidate, type ConfigResult, type Device, type Hass, type Session } from "./api";
import { define } from "./components";
import "./dialogs";
import "./onboarding";
import { download, setLocale } from "./format";
import { setLanguage, t } from "./i18n";
import { shared } from "./styles";
import { renderSessionDetail, type Ctx } from "./views";

type Tab = "dashboard" | "sessions" | "baseload" | "devices";
type Dialog =
  | { kind: "add"; candidate?: Candidate | null; device?: Device | null }
  | { kind: "device"; device: Device }
  | { kind: "session"; session: Session }
  | { kind: "settings" };
interface Confirm {
  heading: string;
  text: string;
  action: string;
  danger: boolean;
  run: () => Promise<unknown>;
  toast: string;
}

class EnergydashPanel extends LitElement {
  declare hass: Hass;
  declare narrow: boolean;
  declare _config: ConfigResult | null;
  declare _tab: Tab;
  declare _dialog: Dialog | null;
  declare _confirm: Confirm | null;
  declare _toast: string;
  declare _tick: number;
  declare _error: string;
  declare _onboarding: boolean;

  static properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    route: { attribute: false },
    panel: { attribute: false },
    _config: { state: true },
    _tab: { state: true },
    _dialog: { state: true },
    _confirm: { state: true },
    _toast: { state: true },
    _tick: { state: true },
    _error: { state: true },
    _onboarding: { state: true },
  };

  private _unsub?: Promise<() => void>;
  private _toastTimer?: number;
  private _started = false;

  constructor() {
    super();
    this.narrow = false;
    this._config = null;
    this._tab = "dashboard";
    this._dialog = null;
    this._confirm = null;
    this._toast = "";
    this._tick = 0;
    this._error = "";
    this._onboarding = false;
    try {
      const saved = window.localStorage.getItem("energydash.tab") as Tab | null;
      if (saved && ["dashboard", "sessions", "baseload", "devices"].includes(saved)) this._tab = saved;
    } catch {
      /* storage blocked */
    }
  }

  updated() {
    if (this.hass && !this._started) {
      this._started = true;
      const lang = this.hass.locale?.language ?? this.hass.language ?? "nl";
      setLanguage(lang);
      this._load();
      this._unsub = this.hass.connection.subscribeMessage(() => this._load(), { type: "energydash/subscribe" });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsub?.then((u) => u()).catch(() => undefined);
    this._unsub = undefined;
    this._started = false;
  }

  private async _load() {
    try {
      const cfg = await api.config(this.hass);
      setLocale(this.hass.locale?.language ?? this.hass.language ?? "nl", cfg.currency);
      this._config = cfg;
      this._tick += 1;
      this._error = "";
    } catch (e) {
      this._error = String((e as Error).message ?? e);
    }
  }

  private _setTab(tab: Tab) {
    this._tab = tab;
    try {
      window.localStorage.setItem("energydash.tab", tab);
    } catch {
      /* storage blocked */
    }
  }

  private _showToast(text: string) {
    this._toast = text;
    window.clearTimeout(this._toastTimer);
    this._toastTimer = window.setTimeout(() => (this._toast = ""), 4000);
  }

  private _done(text: string) {
    this._dialog = null;
    this._showToast(text);
    this._load();
  }

  private _ask(c: Confirm) {
    this._confirm = c;
  }

  private async _runConfirm() {
    const c = this._confirm;
    if (!c) return;
    this._confirm = null;
    try {
      await c.run();
      this._done(c.toast);
    } catch (e) {
      this._showToast(t("c.error", { msg: String((e as Error).message ?? e) }));
    }
  }

  static styles = [
    shared,
    css`
      :host { display: block; min-height: 100vh; background: var(--primary-background-color, #fafafa); }
      .toolbar {
        display: flex; align-items: center; gap: 4px; height: 56px; padding: 0 8px 0 4px;
        background: var(--app-header-background-color, var(--primary-background-color)); color: var(--app-header-text-color, var(--ed-text));
        border-bottom: 1px solid var(--app-header-border-bottom, var(--ed-line)); position: sticky; top: 0; z-index: 3;
      }
      .toolbar .title { font-size: 20px; margin-left: 12px; flex: 1; }
      nav { display: flex; gap: 4px; padding: 8px 12px; overflow-x: auto; border-bottom: 1px solid var(--ed-line); background: var(--primary-background-color); position: sticky; top: 56px; z-index: 2; }
      nav button { font: inherit; font-size: 14px; font-weight: 500; border: none; background: none; color: var(--ed-text2); padding: 8px 16px; border-radius: 999px; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; white-space: nowrap; }
      nav button[aria-selected="true"] { color: var(--ed-pri); background: color-mix(in srgb, var(--ed-pri) 12%, transparent); }
      :host([narrow]) nav { position: fixed; bottom: 0; left: 0; right: 0; top: auto; justify-content: space-around; border-top: 1px solid var(--ed-line); border-bottom: none; padding: 6px 4px; }
      :host([narrow]) nav button { flex-direction: column; gap: 2px; font-size: 11px; padding: 6px 8px; }
      :host([narrow]) main { padding-bottom: 72px; }
      .banner { max-width: 1200px; margin: 12px auto 0; padding: 0 16px; }
      .toast {
        position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 20; background: var(--ed-text); color: var(--ed-card);
        padding: 12px 20px; border-radius: 8px; font-size: 14px; display: flex; gap: 12px; align-items: center; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      }
      :host([narrow]) .toast { bottom: 88px; }
    `,
  ];

  private get _ctx(): Ctx {
    return { hass: this.hass, config: this._config!, dark: !!this.hass.themes?.darkMode, narrow: this.narrow, tick: this._tick };
  }

  render() {
    const cfg = this._config;
    const toolbar = html`<div class="toolbar">
      <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
      <div class="title">Energydash</div>
      ${cfg ? html`<button class="icon" aria-label=${t("c.settings")} title=${t("c.settings")} @click=${() => (this._dialog = { kind: "settings" })}><ha-icon icon="mdi:cog"></ha-icon></button>` : nothing}
    </div>`;
    if (this._error && !cfg) return html`${toolbar}<div class="banner"><div class="alert bad"><ha-icon icon="mdi:alert-circle"></ha-icon>${t("c.error", { msg: this._error })}</div></div>`;
    if (!cfg) return html`${toolbar}<div class="banner"><p class="muted">${t("c.loading")}</p></div>`;
    const busy = Object.keys(cfg.status.busy).length > 0;
    const tabs: [Tab, string, string][] = [
      ["dashboard", t("tab.dashboard"), "mdi:view-dashboard-outline"],
      ["sessions", t("tab.sessions"), "mdi:format-list-bulleted"],
      ["baseload", t("tab.baseload"), "mdi:weather-night"],
      ["devices", t("tab.devices"), "mdi:power-plug-outline"],
    ];
    const ctx = this._ctx;
    return html`${toolbar}
      ${busy && !this._onboarding ? html`<div class="banner"><div class="alert info"><ha-icon icon="mdi:progress-clock"></ha-icon>${t("busy")}</div></div>` : nothing}
      ${cfg.devices.length === 0 || this._onboarding
        ? this._renderEmpty()
        : html`<nav role="tablist">${tabs.map(([id, label, icon]) => html`<button role="tab" aria-selected=${this._tab === id} @click=${() => this._setTab(id)}><ha-icon icon=${icon}></ha-icon>${label}</button>`)}</nav>
            <main
              @open-session=${(e: CustomEvent) => (this._dialog = { kind: "session", session: e.detail })}
              @open-device=${(e: CustomEvent) => (this._dialog = { kind: "device", device: e.detail })}
              @add-device=${() => (this._dialog = { kind: "add" })}>
              ${this._tab === "dashboard" ? html`<ed-dashboard .ctx=${ctx}></ed-dashboard>` : nothing}
              ${this._tab === "sessions" ? html`<ed-sessions .ctx=${ctx}></ed-sessions>` : nothing}
              ${this._tab === "baseload" ? html`<ed-baseload .ctx=${ctx}></ed-baseload>` : nothing}
              ${this._tab === "devices" ? html`<ed-devices .ctx=${ctx}></ed-devices>` : nothing}
            </main>`}
      ${this._renderDialog(ctx)}
      ${this._confirm
        ? html`<ed-confirm .heading=${this._confirm.heading} .text=${this._confirm.text} .action=${this._confirm.action} .danger=${this._confirm.danger}
            @cancel=${() => (this._confirm = null)} @confirm=${this._runConfirm}></ed-confirm>`
        : nothing}
      ${this._toast ? html`<div class="toast" role="status">${this._toast}<button class="icon" style="color:inherit;padding:2px" aria-label=${t("c.close")} @click=${() => (this._toast = "")}><ha-icon icon="mdi:close"></ha-icon></button></div>` : nothing}`;
  }

  // Quick start stays on screen once started, also after the first device is added, until the user leaves it.
  private _renderEmpty() {
    return html`<ed-onboarding .ctx=${this._ctx}
      @started=${() => (this._onboarding = true)}
      @finished=${() => { this._onboarding = false; this._setTab("dashboard"); }}
      @advanced=${() => (this._dialog = { kind: "add" })}
      @adjust=${(e: CustomEvent) => (this._dialog = { kind: "add", candidate: e.detail })}></ed-onboarding>`;
  }

  private _renderDialog(ctx: Ctx) {
    const d = this._dialog;
    if (!d) return nothing;
    const close = () => (this._dialog = null);
    const saved = (e: CustomEvent) => this._done(e.detail);
    if (d.kind === "add") {
      return html`<ed-add-device .ctx=${ctx} .candidate=${d.candidate ?? null} .existing=${d.device ?? null} @closed=${close} @saved=${saved}></ed-add-device>`;
    }
    if (d.kind === "session") {
      return html`<ed-dialog wide .heading=${t("s.session")} @closed=${close}>${renderSessionDetail(ctx, d.session, ctx.config.settings.solar_mode)}
        <button slot="footer" class="btn" @click=${close}>${t("c.close")}</button></ed-dialog>`;
    }
    if (d.kind === "device") {
      const dev = d.device;
      return html`<ed-device-dialog .ctx=${ctx} .device=${dev} @closed=${close}
        @edit-device=${() => (this._dialog = { kind: "add", device: dev })}
        @recalc-device=${() => this._ask({ heading: `${t("v.recalc")}?`, text: t("v.recalc_text"), action: t("v.recalc"), danger: false, run: () => api.recalculate(this.hass, dev.id), toast: t("t.recalc") })}
        @delete-device=${() => this._ask({ heading: t("v.delete_q"), text: t("v.delete_text", { name: dev.name }), action: t("c.delete"), danger: true, run: () => api.deleteDevice(this.hass, dev.id!), toast: t("t.deleted") })}
      ></ed-device-dialog>`;
    }
    return html`<ed-settings-dialog .ctx=${ctx} @closed=${close} @saved=${saved}
      @recalc-all=${() => this._ask({ heading: t("set.recalc_q"), text: t("set.recalc_q_text"), action: t("v.recalc"), danger: false, run: () => api.recalculate(this.hass), toast: t("t.recalc") })}
      @export-config=${async () => {
        const data = await api.exportConfig(this.hass);
        download(`energydash-${new Date().toISOString().slice(0, 10)}.json`, data);
        this._showToast(t("t.exported"));
      }}
      @import-config=${(e: CustomEvent) => {
        const data = e.detail as { devices: unknown[] };
        this._ask({ heading: t("set.import_q"), text: t("set.import_q_text", { n: data.devices.length }), action: t("set.import_btn"), danger: true,
          run: () => api.importConfig(this.hass, data as Record<string, unknown>, true), toast: t("t.imported", { n: data.devices.length }) });
      }}
      @reset=${(e: CustomEvent) => {
        const all = e.detail === "all";
        this._ask({ heading: t(all ? "set.reset_q" : "set.clear_q"), text: t(all ? "set.reset_q_text" : "set.clear_q_text"), action: t(all ? "set.reset" : "set.clear"), danger: true,
          run: () => api.reset(this.hass, all ? "all" : "data"), toast: t("t.reset") });
      }}
    ></ed-settings-dialog>`;
  }
}

define("energydash-panel", EnergydashPanel);

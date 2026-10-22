import { css } from "lit";

// HA theme variables first, so light/dark and user themes work automatically (docs/04).
export const shared = css`
  :host {
    --ed-radius: 12px;
    --ed-gap: 16px;
    --ed-ok: var(--success-color, #036730);
    --ed-warn: var(--warning-color, #9d3800);
    --ed-err: var(--error-color, #b30532);
    --ed-pri: var(--primary-color, #006787);
    --ed-card: var(--card-background-color, #fff);
    --ed-line: var(--divider-color, #e6e6e6);
    --ed-text: var(--primary-text-color, #141414);
    --ed-text2: var(--secondary-text-color, #5e5e5e);
    font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    color: var(--ed-text);
  }
  * { box-sizing: border-box; }
  h2 { font-size: 20px; font-weight: 500; margin: 0 0 4px; }
  h3 { font-size: 16px; font-weight: 500; margin: 0 0 12px; }
  p { margin: 0 0 8px; line-height: 1.5; }
  .muted { color: var(--ed-text2); font-size: 14px; }
  .small { font-size: 12px; }
  .card {
    background: var(--ed-card);
    border: 1px solid var(--ed-line);
    border-radius: var(--ed-radius);
    padding: 16px;
  }
  .grid { display: grid; gap: var(--ed-gap); }
  .row { display: flex; align-items: center; gap: 12px; }
  .between { justify-content: space-between; }
  .wrap { flex-wrap: wrap; }
  .grow { flex: 1; min-width: 0; }
  button.btn {
    font: inherit; font-weight: 500; font-size: 14px; cursor: pointer;
    border-radius: 999px; padding: 8px 18px; border: 1px solid transparent;
    background: var(--ed-pri); color: var(--text-primary-color, #fff);
    display: inline-flex; align-items: center; gap: 6px; min-height: 36px;
  }
  button.btn ha-icon { --mdc-icon-size: 18px; }
  button.btn[disabled] { opacity: 0.45; cursor: default; }
  button.btn.secondary { background: transparent; color: var(--ed-pri); border-color: var(--ed-line); }
  button.btn.text { background: transparent; color: var(--ed-pri); padding: 8px 10px; }
  button.btn.danger { background: var(--ed-err); color: #fff; }
  button.btn.danger-text { background: transparent; color: var(--ed-err); border-color: var(--ed-line); }
  button.icon {
    background: none; border: none; cursor: pointer; color: inherit; padding: 8px; border-radius: 50%;
    display: inline-flex; --mdc-icon-size: 22px;
  }
  button.icon:hover, button.btn.secondary:hover, button.btn.text:hover { background: rgba(127, 127, 127, 0.1); }
  .chip {
    display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 999px;
    font-size: 12px; font-weight: 500; white-space: nowrap; border: 1px solid transparent;
  }
  .chip.ok { color: var(--ed-ok); background: color-mix(in srgb, var(--ed-ok) 12%, transparent); }
  .chip.warn { color: var(--ed-warn); background: color-mix(in srgb, var(--ed-warn) 14%, transparent); }
  .chip.bad { color: var(--ed-err); background: color-mix(in srgb, var(--ed-err) 12%, transparent); }
  .chip.neutral { color: var(--ed-text2); border-color: var(--ed-line); }
  button.chip { cursor: pointer; font: inherit; font-size: 13px; padding: 4px 12px; background: transparent; color: var(--ed-text2); border-color: var(--ed-line); }
  button.chip[aria-pressed="true"] { color: var(--ed-pri); border-color: var(--ed-pri); background: color-mix(in srgb, var(--ed-pri) 10%, transparent); }
  .alert { display: flex; gap: 10px; padding: 12px 14px; border-radius: 8px; font-size: 14px; line-height: 1.45; }
  .alert ha-icon { flex: none; --mdc-icon-size: 20px; }
  .alert.ok { background: color-mix(in srgb, var(--ed-ok) 12%, transparent); }
  .alert.ok ha-icon { color: var(--ed-ok); }
  .alert.warn { background: color-mix(in srgb, var(--ed-warn) 12%, transparent); }
  .alert.warn ha-icon { color: var(--ed-warn); }
  .alert.bad { background: color-mix(in srgb, var(--ed-err) 12%, transparent); }
  .alert.bad ha-icon { color: var(--ed-err); }
  .alert.info { background: color-mix(in srgb, var(--ed-pri) 10%, transparent); }
  .alert.info ha-icon { color: var(--ed-pri); }
  label.field { display: grid; gap: 4px; font-size: 14px; }
  label.field > span.lbl { font-weight: 500; }
  .help { font-size: 12px; color: var(--ed-text2); }
  input.input, select.input {
    font: inherit; font-size: 15px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--ed-line);
    background: var(--ed-card); color: var(--ed-text); width: 100%;
  }
  input.input:focus, select.input:focus { outline: 2px solid var(--ed-pri); outline-offset: -1px; }
  .radio {
    display: flex; gap: 12px; padding: 12px; border: 1px solid var(--ed-line); border-radius: 12px; cursor: pointer;
    text-align: left; background: transparent; font: inherit; color: inherit; width: 100%;
  }
  .radio[aria-checked="true"] { border: 2px solid var(--ed-pri); padding: 11px; background: color-mix(in srgb, var(--ed-pri) 7%, transparent); }
  .radio .dot { flex: none; width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--ed-text2); margin-top: 2px; display: grid; place-items: center; }
  .radio[aria-checked="true"] .dot { border-color: var(--ed-pri); }
  .radio[aria-checked="true"] .dot::after { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--ed-pri); }
  .radio b { display: block; font-weight: 500; margin-bottom: 2px; }
  .radio span { font-size: 13px; color: var(--ed-text2); line-height: 1.4; }
  .radio span.ex {
    display: block; width: fit-content; margin-top: 8px; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-variant-numeric: tabular-nums;
    color: var(--ed-text); background: color-mix(in srgb, var(--ed-text) 6%, transparent);
  }
  .radio[aria-checked="true"] span.ex { background: color-mix(in srgb, var(--ed-pri) 14%, transparent); }
  .list { display: grid; }
  .list > .item { display: flex; align-items: center; gap: 12px; padding: 12px 4px; border-bottom: 1px solid var(--ed-line); }
  .list > .item:last-child { border-bottom: none; }
  .list > button.item { background: none; border-left: none; border-right: none; border-top: none; font: inherit; color: inherit; text-align: left; cursor: pointer; width: 100%; }
  .list > button.item:hover { background: rgba(127, 127, 127, 0.06); }
  .swatch { width: 10px; height: 10px; border-radius: 3px; flex: none; }
  .kv { display: grid; grid-template-columns: minmax(110px, 40%) 1fr; gap: 8px 16px; font-size: 14px; }
  .kv > :nth-child(odd) { color: var(--ed-text2); }
  .kv > :nth-child(even) { word-break: break-word; }
  .mono { font-family: var(--code-font-family, ui-monospace, monospace); font-size: 12px; }
  details summary { cursor: pointer; font-weight: 500; padding: 8px 0; }
  [data-tip] { cursor: help; }
  [data-tip]:hover, [data-tip]:focus-visible { text-decoration: underline dotted; text-underline-offset: 4px; outline: none; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
`;

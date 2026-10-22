// Formatting and colours. Colours follow docs/04 (validated for colour blindness and contrast).

let LOCALE = "nl-NL";
let CURRENCY = "EUR";

export function setLocale(lang: string, currency: string) {
  LOCALE = lang.startsWith("nl") ? "nl-NL" : lang;
  CURRENCY = currency || "EUR";
}

export function eur(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
    Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v,
  );
}

export function num(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

export function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
}

export function day(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(LOCALE, opts);
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function minutesBetween(a: string, b: string | null): number {
  if (!b) return 0;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

export const DEVICE_LIGHT = ["#6250d6", "#e87ba4", "#008300", "#eda100", "#1baf7a", "#e34948", "#2f7fd8", "#a35a00"];
const DEVICE_DARK = ["#9085e9", "#d55181", "#008300", "#c98500", "#199e70", "#e66767", "#5ba3f0", "#c98a3c"];

export function deviceColor(index: number | string | null | undefined, dark: boolean): string {
  if (typeof index === "string") return index;
  const list = dark ? DEVICE_DARK : DEVICE_LIGHT;
  return list[(index ?? 0) % list.length];
}

export const colors = (dark: boolean) => ({
  zon: dark ? "#c94e00" : "#f36d00",
  net: "#488fc2",
  rest: dark ? "#7a7a7a" : "#989898",
});

export function conic(parts: { v: number; color: string }[], gap = "var(--card-background-color, #fff)"): string {
  const total = parts.reduce((a, p) => a + Math.max(p.v, 0), 0);
  if (total <= 0) return `conic-gradient(var(--divider-color) 0deg 360deg)`;
  let acc = 0;
  const stops: string[] = [];
  const many = parts.filter((p) => p.v > 0).length > 1;
  for (const p of parts) {
    if (p.v <= 0) continue;
    const a = acc;
    const b = acc + (p.v / total) * 360;
    if (many) {
      stops.push(`${p.color} ${(a + 1).toFixed(1)}deg ${(b - 1).toFixed(1)}deg`, `${gap} ${(b - 1).toFixed(1)}deg ${b.toFixed(1)}deg`);
    } else {
      stops.push(`${p.color} 0deg 360deg`);
    }
    acc = b;
  }
  return `conic-gradient(${many ? `${gap} 0deg 1deg, ` : ""}${stops.join(", ")})`;
}

export function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

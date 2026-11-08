import type { haalDashboard } from "@/lib/api/account.functions";

export type DashData = Exclude<NonNullable<Awaited<ReturnType<typeof haalDashboard>>>, { geblokkeerd: true }>;
export type Lead = DashData["leads"][number];
export type Afspraak = DashData["afspraken"][number];
export type Gesprek = DashData["gesprekken"][number];

export type Status = "nieuw" | "opvolging" | "offerte" | "afspraak" | "klant" | "verloren";
export const STATUS_LABEL: Record<Status, string> = {
  nieuw: "Nieuw",
  opvolging: "Volgo volgt op",
  offerte: "Offerte",
  afspraak: "Afspraak",
  klant: "Klant",
  verloren: "Verloren",
};

/** SQL-tijd in UTC ("2026-10-30 21:04:00") naar Date. */
export const sqlDate = (s: string) => new Date(s.replace(" ", "T") + "Z");

const dagFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });
/** Datum als YYYY-MM-DD in Amsterdamse tijd. */
export const dagKey = (d: Date) => dagFmt.format(d);
export const uurAms = (d: Date) => Number(new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", hour12: false }).format(d)) % 24;
export const tijdAms = (d: Date) => d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
export const datumAms = (d: Date) => d.toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

export function geleden(d: Date, nu = Date.now()) {
  const min = Math.max(0, Math.round((nu - d.getTime()) / 60000));
  if (min < 1) return "zojuist";
  if (min < 60) return `${min} min geleden`;
  const u = Math.round(min / 60);
  if (u < 24) return `${u} uur geleden`;
  const dg = Math.round(u / 24);
  return `${dg} ${dg === 1 ? "dag" : "dagen"} geleden`;
}

export function warmteLabel(w: number) {
  return w >= 75 ? "Heet" : w >= 55 ? "Warm" : "Lauw";
}

/** Lokale datumstring ("YYYY-MM-DD") verschuiven met n dagen. */
export function plusDag(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

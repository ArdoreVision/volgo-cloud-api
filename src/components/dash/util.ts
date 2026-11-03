import type { haalDashboard } from "@/lib/api/account.functions";

export type DashData = Exclude<NonNullable<Awaited<ReturnType<typeof haalDashboard>>>, { geblokkeerd: true }>;
export type Lead = DashData["leads"][number];
export type Afspraak = DashData["afspraken"][number];
export type Gesprek = DashData["gesprekken"][number];

export type Status = "nieuw" | "opvolging" | "offerte" | "afspraak" | "klant" | "verloren";
export const STATUS_LABEL: Record<Status, string> = {
  nieuw: "New",
  opvolging: "AVA following up",
  offerte: "Quote",
  afspraak: "Appointment",
  klant: "Customer",
  verloren: "Lost",
};

/** SQL-tijd in UTC ("2026-10-30 21:04:00") naar Date. */
export const sqlDate = (s: string) => new Date(s.replace(" ", "T") + "Z");

/**
 * Every time in the dashboard is shown in the business's own time zone (the one from the calendar settings),
 * not in the viewer's or in Amsterdam's. The dashboard sets it once from the loader data.
 */
let TZ = "Europe/Amsterdam";
export function zetTijdzone(tz: string | null | undefined) {
  if (!tz) return;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    TZ = tz;
  } catch {
    /* unknown zone: keep the previous one */
  }
}
export const tijdzone = () => TZ;

/** Datum als YYYY-MM-DD in de tijdzone van het bedrijf. */
export const dagKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
export const uurAms = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d)) % 24;
export const tijdAms = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
export const datumAms = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });
export const datumKort = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
export const datumLang = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
export const datumWeekdag = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
/** "Today", "Yesterday" or "Mon 3 Nov". */
export function dagLabel(d: Date, nu = Date.now()) {
  const k = dagKey(d);
  if (k === dagKey(new Date(nu))) return "Today";
  if (k === dagKey(new Date(nu - 86400000))) return "Yesterday";
  return datumWeekdag(d);
}
/** Appointments are stored as the business's wall-clock time ("YYYY-MM-DDTHH:MM"): show them without converting. */
export function afspraakTekst(start: string) {
  const d = new Date(`${start.slice(0, 16)}:00Z`);
  return `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}, ${start.slice(11, 16)}`;
}

export function geleden(d: Date, nu = Date.now()) {
  const min = Math.max(0, Math.round((nu - d.getTime()) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const u = Math.round(min / 60);
  if (u < 24) return `${u} ${u === 1 ? "hour" : "hours"} ago`;
  const dg = Math.round(u / 24);
  return `${dg} ${dg === 1 ? "day" : "days"} ago`;
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

// The business's own calendar (Google, Outlook, Apple), linked through its private iCal address.
// Volgo reads the busy times from it, so visitors are never offered a moment that is already taken there.
// And the other way round: a private iCal feed of Volgo's appointments that the business can add to its own calendar.

/** A busy period in the business's local time, "YYYY-MM-DDTHH:MM", the same format as the afspraken table. */
export type Bezet = { start: string; eind: string };

const CACHE = new Map<string, { tot: number; items: Bezet[] }>();
const MIN = 60000;

/** Offset in minutes of a time zone at a moment (positive east of UTC). */
function offset(tz: string, utcMs: number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(utcMs))
      .map((x) => [x.type, x.value]),
  );
  const alsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((alsUtc - utcMs) / MIN);
}
/** Wall-clock time in a zone → UTC milliseconds. */
export function zoneNaarUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string) {
  const gok = Date.UTC(y, mo - 1, d, h, mi);
  let t = gok - offset(tz, gok) * MIN;
  t = gok - offset(tz, t) * MIN;
  return t;
}
/** UTC milliseconds → "YYYY-MM-DDTHH:MM" in a zone. */
export function utcNaarLokaal(ms: number, tz: string) {
  return new Date(ms + offset(tz, ms) * MIN).toISOString().slice(0, 16);
}
const geldigeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** Unfolds the iCal lines (a line starting with a space continues the one before). */
function regels(ics: string) {
  return ics.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

type Waarde = { waarde: string; tz?: string; datum: boolean };
function leesTijd(regel: string): Waarde | null {
  const i = regel.indexOf(":");
  if (i < 0) return null;
  const kop = regel.slice(0, i);
  const waarde = regel.slice(i + 1).trim();
  const tz = /TZID=([^;:]+)/.exec(kop)?.[1]?.replace(/^"|"$/g, "");
  return { waarde, tz, datum: /VALUE=DATE(?!-)/.test(kop) || /^\d{8}$/.test(waarde) };
}
/** One iCal date or date-time → UTC milliseconds. Floating times are read in the business's zone. */
function naarMs(w: Waarde, standaard: string) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(w.waarde);
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", , z] = m;
  if (z) return Date.UTC(+y, +mo - 1, +d, +h, +mi);
  const tz = w.tz && geldigeZone(w.tz) ? w.tz : standaard;
  return zoneNaarUtc(+y, +mo, +d, +h, +mi, tz);
}

const DAGCODE = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** Start moments of an event within [van, tot), including simple repeats (daily, weekly, monthly, yearly). */
function herhalingen(startMs: number, rrule: string | null, uitzonderingen: Set<number>, van: number, tot: number, tz: string) {
  if (!rrule) return startMs < tot ? [startMs] : [];
  const r = Object.fromEntries(rrule.split(";").map((x) => x.split("=") as [string, string]));
  const freq = r.FREQ;
  const interval = Math.max(1, Number(r.INTERVAL) || 1);
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const until = r.UNTIL ? naarMs({ waarde: r.UNTIL, datum: false }, tz) ?? Infinity : Infinity;
  const byday = r.BYDAY ? r.BYDAY.split(",").map((x) => DAGCODE.indexOf(x.replace(/^[+-]?\d+/, ""))).filter((x) => x >= 0) : [];
  // Work on the wall-clock time in the business zone, so a weekly 09:00 stays 09:00 across daylight saving.
  const lok = utcNaarLokaal(startMs, tz);
  const [y, mo, d] = lok.slice(0, 10).split("-").map(Number);
  const [h, mi] = lok.slice(11, 16).split(":").map(Number);
  const uit: number[] = [];
  let n = 0;
  const neem = (ms: number) => {
    n++;
    if (ms >= startMs && ms <= until && !uitzonderingen.has(ms) && ms < tot && ms + 24 * 60 * MIN > van) uit.push(ms);
  };
  for (let i = 0; i < 800 && n < count; i++) {
    let basis: Date;
    if (freq === "DAILY") basis = new Date(Date.UTC(y, mo - 1, d + i * interval));
    else if (freq === "WEEKLY") basis = new Date(Date.UTC(y, mo - 1, d + i * 7 * interval));
    else if (freq === "MONTHLY") basis = new Date(Date.UTC(y, mo - 1 + i * interval, d));
    else if (freq === "YEARLY") basis = new Date(Date.UTC(y + i * interval, mo - 1, d));
    else return [startMs];
    const msVan = (dt: Date) => zoneNaarUtc(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), h, mi, tz);
    if (freq === "WEEKLY" && byday.length) {
      // Every chosen weekday in this week (the week starts on the day of the first event).
      for (let k = 0; k < 7 && n < count; k++) {
        const dag = new Date(basis.getTime() + k * 86400000);
        if (byday.includes(dag.getUTCDay())) neem(msVan(dag));
      }
    } else neem(msVan(basis));
    if (msVan(basis) > Math.min(tot, until)) break;
  }
  return uit;
}

/** Reads an iCal file into busy periods between van and tot (UTC ms), in the business's local time. */
export function leesIcs(ics: string, tz: string, van: number, tot: number): Bezet[] {
  const uit: Bezet[] = [];
  let ev: Record<string, string[]> | null = null;
  const bijRecurrence = new Set<string>();
  const events: Record<string, string[]>[] = [];
  for (const r of regels(ics)) {
    if (r === "BEGIN:VEVENT") ev = {};
    else if (r === "END:VEVENT") {
      if (ev) events.push(ev);
      ev = null;
    } else if (ev) {
      const naam = r.split(/[;:]/)[0];
      (ev[naam] ??= []).push(r);
    }
  }
  // Moved single occurrences of a repeating event replace the original moment.
  for (const e of events) {
    const w = e["RECURRENCE-ID"]?.[0] ? leesTijd(e["RECURRENCE-ID"][0]) : null;
    const ms = w ? naarMs(w, tz) : null;
    if (ms !== null) bijRecurrence.add(`${e.UID?.[0]}|${ms}`);
  }
  for (const e of events) {
    if (/STATUS:CANCELLED/.test(e.STATUS?.[0] ?? "")) continue;
    // "Free" (transparent) events, like a reminder or a birthday, do not block time.
    if (/TRANSP:TRANSPARENT/.test(e.TRANSP?.[0] ?? "")) continue;
    const s = e.DTSTART?.[0] ? leesTijd(e.DTSTART[0]) : null;
    if (!s) continue;
    const startMs = naarMs(s, tz);
    if (startMs === null) continue;
    const ew = e.DTEND?.[0] ? leesTijd(e.DTEND[0]) : null;
    let duur = ew ? (naarMs(ew, tz) ?? startMs) - startMs : s.datum ? 24 * 60 * MIN : 60 * MIN;
    const dur = /DURATION:P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(e.DURATION?.[0] ?? "");
    if (!ew && dur) duur = ((+(dur[1] ?? 0) * 24 + +(dur[2] ?? 0)) * 60 + +(dur[3] ?? 0)) * MIN;
    if (duur <= 0) continue;
    const ex = new Set<number>();
    for (const regel of e.EXDATE ?? []) {
      const w = leesTijd(regel);
      if (!w) continue;
      for (const deel of w.waarde.split(",")) {
        const ms = naarMs({ ...w, waarde: deel }, tz);
        if (ms !== null) ex.add(ms);
      }
    }
    const rrule = e.RRULE?.[0]?.split(":").slice(1).join(":") ?? null;
    for (const ms of herhalingen(startMs, e["RECURRENCE-ID"] ? null : rrule, ex, van, tot, tz)) {
      if (rrule && bijRecurrence.has(`${e.UID?.[0]}|${ms}`)) continue;
      if (ms + duur <= van || ms >= tot) continue;
      uit.push({ start: utcNaarLokaal(ms, tz), eind: utcNaarLokaal(ms + duur, tz) });
    }
  }
  return uit;
}

/** Only https addresses of calendar services, so this can never be used to reach anything else. */
export function geldigeAgendaUrl(url: string) {
  const u = url.trim().replace(/^webcal:\/\//i, "https://");
  try {
    const p = new URL(u);
    if (p.protocol !== "https:") return null;
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(p.hostname) || !p.hostname.includes(".")) return null;
    return p.toString();
  } catch {
    return null;
  }
}

/** Fetches the business's calendar (cached for 5 minutes) and returns the busy periods in the window. */
export async function bezetInAgenda(url: string, tz: string, van: string, tot: string): Promise<Bezet[]> {
  const ok = geldigeAgendaUrl(url);
  if (!ok) return [];
  const nu = Date.now();
  const vanMs = zoneNaarUtc(+van.slice(0, 4), +van.slice(5, 7), +van.slice(8, 10), 0, 0, tz);
  const totMs = zoneNaarUtc(+tot.slice(0, 4), +tot.slice(5, 7), +tot.slice(8, 10), 23, 59, tz);
  const sleutel = `${ok}|${tz}`;
  let c = CACHE.get(sleutel);
  if (!c || c.tot < nu) {
    try {
      const r = await fetch(ok, { headers: { Accept: "text/calendar" }, redirect: "follow", signal: AbortSignal.timeout(6000) });
      const tekst = r.ok ? await r.text() : "";
      if (!tekst.includes("BEGIN:VCALENDAR")) return c?.items ?? [];
      // Read a wide window once (yesterday to 70 days ahead) and cache that.
      const items = leesIcs(tekst.slice(0, 3_000_000), tz, nu - 86400000, nu + 70 * 86400000);
      c = { tot: nu + 5 * MIN, items };
      CACHE.set(sleutel, c);
    } catch (err) {
      console.error("[agenda]", err);
      return c?.items ?? [];
    }
  }
  return c.items.filter((b) => b.start < tot && b.eind > van && vanMs < totMs);
}

/** Tries a calendar address the business pasted: does it work, and how many busy moments are coming up? */
export async function testAgenda(url: string, tz: string) {
  const ok = geldigeAgendaUrl(url);
  if (!ok) return { ok: false as const, message: "That is not a calendar address. It starts with https:// (or webcal://) and ends in .ics." };
  try {
    const r = await fetch(ok, { headers: { Accept: "text/calendar" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
    const tekst = r.ok ? await r.text() : "";
    if (!tekst.includes("BEGIN:VCALENDAR"))
      return { ok: false as const, message: "Volgo could not read a calendar at this address. Check that you copied the secret iCal address (not the public or embed link)." };
    const nu = Date.now();
    const items = leesIcs(tekst.slice(0, 3_000_000), tz, nu, nu + 21 * 86400000);
    CACHE.delete(`${ok}|${tz}`);
    return { ok: true as const, message: "", aantal: items.length, url: ok };
  } catch {
    return { ok: false as const, message: "Your calendar could not be reached. Please try again in a minute." };
  }
}

/** The appointments in Volgo as an iCal file, for the business to add to Google, Outlook or Apple Calendar. */
export function maakIcs(bedrijf: string, tz: string, afspraken: { id: number; titel: string; start: string; eind: string; locatie: string | null; notitie: string | null }[]) {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
  const z = (lokaal: string) => {
    const ms = zoneNaarUtc(+lokaal.slice(0, 4), +lokaal.slice(5, 7), +lokaal.slice(8, 10), +lokaal.slice(11, 13), +lokaal.slice(14, 16), tz);
    return new Date(ms).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  };
  const nu = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const regelsUit = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Volgo//Appointments//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(`Volgo · ${bedrijf}`)}`, "X-PUBLISHED-TTL:PT15M"];
  for (const a of afspraken) {
    regelsUit.push(
      "BEGIN:VEVENT",
      `UID:volgo-${a.id}@thevolgo.app`,
      `DTSTAMP:${nu}`,
      `DTSTART:${z(a.start)}`,
      `DTEND:${z(a.eind)}`,
      `SUMMARY:${esc(a.titel)}`,
      ...(a.locatie ? [`LOCATION:${esc(a.locatie)}`] : []),
      ...(a.notitie ? [`DESCRIPTION:${esc(a.notitie)}`] : []),
      "END:VEVENT",
    );
  }
  regelsUit.push("END:VCALENDAR");
  return regelsUit.map((r) => (r.length > 74 ? r.match(/.{1,74}/g)!.join("\r\n ") : r)).join("\r\n") + "\r\n";
}

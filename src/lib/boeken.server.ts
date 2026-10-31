// Appointments: visitors pick a free moment in a small calendar inside the AVA chat.
// Only within opening hours and never on top of another appointment in the business calendar.
import type { D1Database } from "@cloudflare/workers-types";

import type { AvaInstellingen } from "./ava.server";

const DAGEN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const SOORTEN = { bellen: "Phone call", langs: "Visit at your address", kantoor: "At our office" } as const;
export type Soort = keyof typeof SOORTEN;
export const isSoort = (s: string): s is Soort => s in SOORTEN;

/** Current local time of the business as "YYYY-MM-DDTHH:MM". */
export function nuLokaal(tz: string, plusMin = 0) {
  const d = new Date(Date.now() + plusMin * 60000);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

const naarDate = (s: string) => new Date(`${s}:00Z`);
const naarTekst = (d: Date) => d.toISOString().slice(0, 16);
const plus = (s: string, min: number) => naarTekst(new Date(naarDate(s).getTime() + min * 60000));
const minuten = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** "Tuesday 4 November, 10:00" */
export function leesbaar(s: string) {
  const d = naarDate(s);
  const maand = d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  return `${DAGEN[d.getUTCDay()]} ${d.getUTCDate()} ${maand}, ${s.slice(11, 16)}`;
}

type Inst = AvaInstellingen;
const openDagen = (inst: Inst) => inst.open_dagen.split(",").map(Number);
export const soortenVan = (inst: Inst) => inst.afspraak_soorten.split(",").filter(isSoort);

async function bezet(DB: D1Database, team: number, van: string, tot: string) {
  return (
    await DB.prepare("SELECT start, eind FROM afspraken WHERE team_id = ? AND voorbeeld = 0 AND start < ? AND eind > ? ORDER BY start")
      .bind(team, tot, van)
      .all<{ start: string; eind: string }>()
  ).results;
}

/**
 * Calendar for the chat: 3 full weeks starting on Monday of this week (business time zone).
 * Every day is listed; closed, past and fully booked days are marked so the chat can show them dimmed.
 * Every slot of an open day is listed with vrij = true/false (taken or too soon).
 */
export async function vrijeDagen(DB: D1Database, inst: Inst, weken = 3) {
  const nu = nuLokaal(inst.tijdzone);
  const vanaf = nuLokaal(inst.tijdzone, 120);
  const vandaag = nu.slice(0, 10);
  const wd = naarDate(`${vandaag}T12:00`).getUTCDay();
  const maandag = plus(`${vandaag}T00:00`, -((wd + 6) % 7) * 24 * 60);
  const einde = plus(maandag, weken * 7 * 24 * 60);
  const drukte = await bezet(DB, inst.team_id, maandag, einde);
  const open = openDagen(inst);
  const duur = inst.afspraak_duur;
  const stap = duur <= 30 ? 30 : 60;
  const uit: { datum: string; weekdag: number; status: "voorbij" | "dicht" | "vol" | "open"; tijden: { t: string; vrij: boolean }[] }[] = [];
  for (let d = 0; d < weken * 7; d++) {
    const datum = plus(maandag, d * 24 * 60).slice(0, 10);
    const weekdag = naarDate(`${datum}T12:00`).getUTCDay();
    if (datum < vandaag) {
      uit.push({ datum, weekdag, status: "voorbij", tijden: [] });
      continue;
    }
    if (!open.includes(weekdag)) {
      uit.push({ datum, weekdag, status: "dicht", tijden: [] });
      continue;
    }
    const tijden: { t: string; vrij: boolean }[] = [];
    for (let m = minuten(inst.open_van); m + duur <= minuten(inst.open_tot); m += stap) {
      const s = `${datum}T${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      const e = plus(s, duur);
      tijden.push({ t: s.slice(11, 16), vrij: s >= vanaf && !drukte.some((b) => b.start < e && b.eind > s) });
    }
    uit.push({ datum, weekdag, status: tijden.some((x) => x.vrij) ? "open" : datum === vandaag ? "voorbij" : "vol", tijden });
  }
  return uit;
}

/** Short instruction for AVA: when to open the calendar in the chat. */
export function agendaInstructies(inst: Inst) {
  const soorten = soortenVan(inst).map((s) => SOORTEN[s].toLowerCase()).join(", ");
  return `APPOINTMENTS
- Visitors can book a ${inst.afspraak_duur}-minute appointment themselves (${soorten}) in a small calendar inside this chat. It only shows moments that are still free.
- As soon as someone wants an appointment, a call back, a visit, a measuring visit or a quote visit, call the agenda_tonen tool. Then tell them in one or two short, friendly sentences that they can pick a day and time below, in 3 easy steps. Don't ask for their name or contact details then: the calendar asks for them. Never list dates or times yourself and never promise a time.
- If they say the calendar doesn't work for them, take their name and phone number so the team can call to plan (and update the conversation as usual).`;
}

export type Boeking = { start: string; soort: string; naam: string; contact: string; adres?: string; notitie?: string };

/** Books an appointment if the slot is valid and still free. */
export async function boekAfspraak(DB: D1Database, inst: Inst, b: Boeking, leadId: number | null) {
  const start = String(b.start ?? "").trim().replace(" ", "T").slice(0, 16);
  const soort = isSoort(b.soort) && soortenVan(inst).includes(b.soort) ? b.soort : null;
  if (!soort) return { ok: false as const, reden: "Choose how you'd like to meet." };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start) || Number.isNaN(naarDate(start).getTime())) return { ok: false as const, reden: "Choose a day and time." };
  if (!b.naam?.trim() || !b.contact?.trim()) return { ok: false as const, reden: "Fill in your name and phone number or email." };
  if (soort === "langs" && !b.adres?.trim()) return { ok: false as const, reden: "Fill in the address where we should come." };
  const eind = plus(start, inst.afspraak_duur);
  const t = minuten(start.slice(11, 16));
  const weg = "This moment is no longer available. Please pick another time.";
  if (start < nuLokaal(inst.tijdzone, 60)) return { ok: false as const, reden: weg };
  if (start > nuLokaal(inst.tijdzone, 60 * 24 * 60)) return { ok: false as const, reden: weg };
  if (!openDagen(inst).includes(naarDate(start).getUTCDay())) return { ok: false as const, reden: weg };
  if (t < minuten(inst.open_van) || t + inst.afspraak_duur > minuten(inst.open_tot)) return { ok: false as const, reden: weg };
  if ((await bezet(DB, inst.team_id, start, eind)).length) return { ok: false as const, reden: weg };
  const titel = `${SOORTEN[soort]} · ${b.naam.trim()}`.slice(0, 120);
  const notitie = [`Booked by the visitor in the AVA chat. Contact: ${b.contact.trim()}`, b.notitie?.trim()].filter(Boolean).join("\n").slice(0, 600);
  const locatie = soort === "langs" ? (b.adres ?? "").trim() : soort === "kantoor" ? "At the office" : `Phone call: ${b.contact.trim()}`;
  await DB.prepare("INSERT INTO afspraken (team_id, lead_id, titel, start, eind, locatie, notitie, voorbeeld) VALUES (?, ?, ?, ?, ?, ?, ?, 0)")
    .bind(inst.team_id, leadId, titel, start, eind, locatie.slice(0, 160), notitie)
    .run();
  return { ok: true as const, start, eind, soort };
}

import type { D1Database } from "@cloudflare/workers-types";

import { randomToken } from "./auth.server";
import { SITE_URL, esc, mailOpmaak, verstuurMail } from "./mail.server";

/**
 * One inbox: website chat, contact form and email all become a conversation in "Inbox".
 * Messages from a contact form or email start a conversation here; replies by email continue it.
 */

export type Kanaal = "Contactformulier" | "E-mail" | "WhatsApp" | "SMS" | "Telefoon";
const KANAAL_LEAD: Record<Kanaal, string> = { Contactformulier: "Contactformulier", "E-mail": "E-mail", WhatsApp: "WhatsApp", SMS: "Sms", Telefoon: "Telefoon" };
const KANAAL_TEKST: Record<Kanaal, string> = { Contactformulier: "het contactformulier", "E-mail": "mail", WhatsApp: "WhatsApp", SMS: "sms", Telefoon: "de telefoon" };

export async function nieuwBinnen(DB: D1Database, team: number, b: { kanaal: Kanaal; naam: string; contact: string; tekst: string; onderwerp?: string; externId?: string; rol?: "bezoeker" | "log" }) {
  const naam = b.naam.trim().slice(0, 60) || (b.kanaal === "Contactformulier" ? "Websitebezoeker" : b.contact);
  const onderwerp = (b.onderwerp || b.tekst).replace(/\s+/g, " ").trim().slice(0, 120);
  const g = await DB.prepare(
    "INSERT INTO ava_gesprekken (team_id, bezoeker, kanaal, onderwerp, status, gestart, laatste, berichten, warmte, voorbeeld) VALUES (?, ?, ?, ?, 'live', datetime('now'), datetime('now'), 1, 60, 0)",
  )
    .bind(team, naam, b.kanaal, onderwerp)
    .run();
  const id = Number(g.meta?.last_row_id);
  const token = randomToken(16);
  const lead = await DB.prepare("INSERT INTO klant_leads (gebruiker_id, naam, onderwerp, kanaal, status, laatste_actie, voorbeeld) VALUES (?, ?, ?, ?, 'nieuw', ?, 0)")
    .bind(team, naam, onderwerp, KANAAL_LEAD[b.kanaal], `Contact: ${b.contact}`.slice(0, 200))
    .run();
  const leadId = Number(lead.meta?.last_row_id);
  await DB.batch([
    DB.prepare("INSERT INTO ava_gesprek_meta (gesprek_id, token, naam, contact, lead_id, extern_id) VALUES (?, ?, ?, ?, ?, ?)").bind(id, token, b.naam.trim().slice(0, 100) || null, b.contact.slice(0, 120), leadId, b.externId ?? null),
    DB.prepare("INSERT INTO ava_berichten (gesprek_id, rol, tekst) VALUES (?, ?, ?)").bind(id, b.rol ?? "bezoeker", b.tekst.slice(0, 4000)),
    DB.prepare("INSERT OR REPLACE INTO lead_scores (lead_id, warmte, reden) VALUES (?, 70, ?)").bind(leadId, `Nam contact op via ${KANAAL_TEKST[b.kanaal]}`),
  ]);
  await meldTeam(DB, team, b.kanaal === "Telefoon" ? `Gemiste oproep: ${naam}` : `Nieuw bericht: ${naam}`, onderwerp, KANAAL_TEKST[b.kanaal]);
  return { id, token, leadId };
}

/**
 * A WhatsApp message, text or call from a provider webhook. Continues the open conversation with the
 * same number (last 30 days, same channel) or starts a new one with a request in "Aanvragen".
 */
export async function berichtBinnen(DB: D1Database, team: number, b: { kanaal: "WhatsApp" | "SMS" | "Telefoon"; van: string; naam?: string; tekst: string; rol?: "bezoeker" | "log" }) {
  const bestaand = await DB.prepare(
    `SELECT g.id, g.bezoeker FROM ava_gesprek_meta m JOIN ava_gesprekken g ON g.id = m.gesprek_id
     WHERE g.team_id = ? AND m.extern_id = ? AND g.kanaal = ? AND g.laatste > datetime('now', '-30 days') ORDER BY g.id DESC LIMIT 1`,
  )
    .bind(team, b.van, b.kanaal)
    .first<{ id: number; bezoeker: string }>();
  if (!bestaand) return { ...(await nieuwBinnen(DB, team, { kanaal: b.kanaal, naam: b.naam ?? "", contact: b.van, tekst: b.tekst, externId: b.van, rol: b.rol })), nieuw: true };
  await DB.batch([
    DB.prepare("INSERT INTO ava_berichten (gesprek_id, rol, tekst) VALUES (?, ?, ?)").bind(bestaand.id, b.rol ?? "bezoeker", b.tekst.slice(0, 4000)),
    DB.prepare("UPDATE ava_gesprekken SET laatste = datetime('now'), status = 'live', berichten = berichten + 1 WHERE id = ?").bind(bestaand.id),
  ]);
  if (b.naam) await DB.prepare("UPDATE ava_gesprek_meta SET naam = COALESCE(naam, ?) WHERE gesprek_id = ?").bind(b.naam.slice(0, 100), bestaand.id).run();
  await meldTeam(DB, team, b.kanaal === "Telefoon" ? `Gemiste oproep: ${bestaand.bezoeker}` : `${bestaand.bezoeker} via ${KANAAL_TEKST[b.kanaal]}`, b.tekst.slice(0, 140), KANAAL_TEKST[b.kanaal]);
  return { id: bestaand.id, nieuw: false };
}

/** A visitor replied by email to a Volgo message: add it to their conversation. */
export async function antwoordBinnen(DB: D1Database, token: string, tekst: string) {
  const m = await DB.prepare("SELECT m.gesprek_id, g.team_id, g.bezoeker FROM ava_gesprek_meta m JOIN ava_gesprekken g ON g.id = m.gesprek_id WHERE m.token = ?")
    .bind(token)
    .first<{ gesprek_id: number; team_id: number; bezoeker: string }>();
  if (!m) return false;
  await DB.batch([
    DB.prepare("INSERT INTO ava_berichten (gesprek_id, rol, tekst) VALUES (?, 'bezoeker', ?)").bind(m.gesprek_id, tekst.slice(0, 4000)),
    DB.prepare("UPDATE ava_gesprekken SET laatste = datetime('now'), status = 'live', berichten = berichten + 1 WHERE id = ?").bind(m.gesprek_id),
    DB.prepare("INSERT INTO ava_berichten (gesprek_id, rol, tekst) VALUES (?, 'log', 'Antwoord ontvangen per mail')").bind(m.gesprek_id),
  ]);
  await meldTeam(DB, m.team_id, `${m.bezoeker} antwoordde`, tekst.slice(0, 140), "mail");
  return true;
}

async function meldTeam(DB: D1Database, team: number, titel: string, tekst: string, via: string) {
  const { pushNaarTeam } = await import("./webpush.server");
  await pushNaarTeam(DB, team, titel, tekst, "/dashboard#gesprekken").catch(() => undefined);
  const e = await DB.prepare("SELECT email FROM gebruikers WHERE id = ?").bind(team).first<{ email: string }>();
  if (e?.email)
    await verstuurMail(
      e.email,
      titel,
      mailOpmaak(titel, `<p style="margin:0 0 12px">Via ${esc(via)}:</p><p style="margin:0;white-space:pre-wrap">${esc(tekst)}</p>`, { tekst: "Open je inbox", url: `${SITE_URL}/dashboard#gesprekken` }),
    ).catch(() => false);
}

/** Strips quoted history and signatures from an email reply. */
export function schoonAntwoord(t: string) {
  const regels = t.replace(/\r/g, "").split("\n");
  const uit: string[] = [];
  for (const r of regels) {
    if (/^(On .+ wrote:|Op .+ schreef .+:|-----Original Message-----|Van: |From: |Verzonden: |Sent: )/i.test(r.trim())) break;
    if (r.startsWith(">")) continue;
    uit.push(r);
  }
  return uit.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

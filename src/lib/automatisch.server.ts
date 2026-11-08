import type { D1Database } from "@cloudflare/workers-types";

import { bindings } from "./bindings.server";
import { SITE_URL, esc } from "./mail.server";

/**
 * Volgo's automatic messages to a business's visitors and customers:
 * - reminder the day before an appointment
 * - review request after an appointment (Google review link)
 * - follow-up after 1 and 3 days for people who chatted but did not book
 * - seasonal message to earlier customers (off by default)
 * Runs every hour from the cron. Every message is sent at most once (auto_berichten has a unique key).
 */

export type Taal = "nl" | "en";
type Inst = {
  team_id: number;
  sleutel: string;
  bedrijf: string;
  bedrijfsinfo: string;
  tijdzone: string;
  taal: string;
  kleur: string;
  review_url: string;
  antwoord_mail: string;
  site_url: string;
  auto_herinnering: number;
  auto_review: number;
  auto_opvolging: number;
  auto_seizoen: number;
  eigenaar_mail: string;
};

const MAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const TEL_RE = /(?:\+|00)?\d[\d\s().-]{7,}\d/;

export function contactVan(tekst: string) {
  const mail = tekst.match(MAIL_RE)?.[0];
  if (mail) return { soort: "mail" as const, waarde: mail.toLowerCase() };
  const tel = tekst.match(TEL_RE)?.[0];
  if (tel) return { soort: "sms" as const, waarde: normTel(tel) };
  return null;
}

function normTel(t: string) {
  let d = t.replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = `+${d.slice(2)}`;
  if (d.startsWith("06") && d.length === 10) d = `+31${d.slice(1)}`;
  else if (d.startsWith("0") && d.length === 10) d = `+31${d.slice(1)}`;
  return d;
}

/** Rough language guess from what the visitor wrote. */
export function taalVan(tekst: string, standaard: Taal): Taal {
  const t = ` ${tekst.toLowerCase()} `;
  const nl = (t.match(/\s(ik|je|jij|wij|het|een|niet|graag|hallo|hoi|bedankt|tuin|wat|kost|kunnen|kan|mijn|ook|voor|met|van|afspraak)\s/g) ?? []).length;
  const en = (t.match(/\s(i|you|the|and|is|are|my|hello|hi|thanks|garden|what|cost|can|could|for|with|of|appointment)\s/g) ?? []).length;
  if (nl === 0 && en === 0) return standaard;
  return nl >= en ? "nl" : "en";
}

// ── Sending ──────────────────────────────────────────────

function opmaak(inst: Inst, kop: string, inhoud: string, knop?: { tekst: string; url: string }, voet?: string) {
  const kleur = /^#[0-9a-f]{6}$/i.test(inst.kleur) ? inst.kleur : "#0a0a0a";
  return `<!doctype html><html><body style="margin:0;background:#f5f7fa;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0b1220">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;padding:32px">
<p style="margin:0 0 20px;font-weight:600;font-size:15px;color:${kleur}">${esc(inst.bedrijf)}</p>
<h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;letter-spacing:-0.01em">${esc(kop)}</h1>
<div style="font-size:15px;line-height:1.6;color:#334155">${inhoud}</div>
${knop ? `<p style="margin:26px 0 0"><a href="${esc(knop.url)}" style="display:inline-block;background:${kleur};color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px">${esc(knop.tekst)}</a></p>` : ""}
</div>
${voet ? `<p style="max-width:520px;margin:18px auto 0;text-align:center;font-size:12px;color:#94a3b8">${voet}</p>` : ""}
</body></html>`;
}

const alinea = (t: string) =>
  t
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${esc(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");

/** Where replies to a visitor mail go: into the Volgo inbox when mail routing is on, else to the business. */
function antwoordAdres(inst: Inst, token?: string | null) {
  const { INBOUND_MAIL } = bindings();
  if (INBOUND_MAIL === "aan" && token) return `r-${token}@thevolgo.app`;
  return inst.antwoord_mail || inst.eigenaar_mail || undefined;
}

export async function mailNamens(inst: Inst, aan: string, onderwerp: string, html: string, token?: string | null) {
  const { RESEND_API_KEY, MAIL_FROM } = bindings();
  if (!RESEND_API_KEY) return false;
  const adres = (MAIL_FROM ?? "").match(/<([^>]+)>/)?.[1] ?? "hallo@thevolgo.app";
  const naam = inst.bedrijf.replace(/[<>"]/g, "").slice(0, 60) || "Volgo";
  const reply = antwoordAdres(inst, token);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${naam} <${adres}>`, to: [aan], subject: onderwerp.slice(0, 150), html, ...(reply ? { reply_to: reply } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** SMS via Twilio, only when the TWILIO_* secrets are set. */
export async function stuurSms(aan: string, tekst: string) {
  const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM } = bindings();
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return false;
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: aan, From: TWILIO_FROM, Body: tekst.slice(0, 600) }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export const smsAan = () => {
  const b = bindings();
  return Boolean(b.TWILIO_SID && b.TWILIO_TOKEN && b.TWILIO_FROM);
};

type Bericht = { onderwerp: string; kop: string; tekst: string; knop?: { tekst: string; url: string }; sms: string };

/** Sends one message to a visitor by mail or SMS. Returns the channel used, or null. */
export async function stuurBezoeker(inst: Inst, contact: string, b: Bericht, token?: string | null, taal: Taal = "nl") {
  const c = contactVan(contact);
  if (!c) return null;
  if (c.soort === "mail") {
    const afmeld = token ? `<a href="${SITE_URL}/api/afmelden?t=${encodeURIComponent(token)}" style="color:#94a3b8">${taal === "nl" ? "Geen berichten meer ontvangen" : "Stop these messages"}</a>` : "";
    const voet = `${esc(inst.bedrijf)}${afmeld ? ` · ${afmeld}` : ""}`;
    return (await mailNamens(inst, c.waarde, b.onderwerp, opmaak(inst, b.kop, alinea(b.tekst), b.knop, voet), token)) ? ("mail" as const) : null;
  }
  return (await stuurSms(c.waarde, b.sms)) ? ("sms" as const) : null;
}

/** Claims (team, kind, ref) once. Returns false if it was already done. */
async function claim(DB: D1Database, team: number, soort: string, ref: string, aan: string) {
  const r = await DB.prepare("INSERT OR IGNORE INTO auto_berichten (team_id, soort, ref, aan, status) VALUES (?, ?, ?, ?, 'bezig')").bind(team, soort, ref, aan.slice(0, 120)).run();
  return Boolean(r.meta?.changes);
}
async function klaar(DB: D1Database, team: number, soort: string, ref: string, kanaal: string | null, onderwerp: string) {
  await DB.prepare("UPDATE auto_berichten SET status = ?, kanaal = ?, onderwerp = ? WHERE team_id = ? AND soort = ? AND ref = ?")
    .bind(kanaal ? "verstuurd" : "mislukt", kanaal ?? "", onderwerp.slice(0, 150), team, soort, ref)
    .run();
}

/** A note in the conversation, visible to the business in the inbox only (not to the visitor). */
export async function notitie(DB: D1Database, gesprekId: number | null | undefined, tekst: string) {
  if (!gesprekId) return;
  await DB.prepare("INSERT INTO ava_berichten (gesprek_id, rol, tekst) VALUES (?, 'log', ?)").bind(gesprekId, tekst.slice(0, 600)).run();
}

// ── Claude (short texts) ─────────────────────────────────

export async function korteTekst(system: string, vraag: string, max = 500) {
  const { ANTHROPIC_API_KEY, CLAUDE_MODEL } = bindings();
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: CLAUDE_MODEL || "claude-haiku-5-5", max_tokens: max, thinking: { type: "disabled" }, system, messages: [{ role: "user", content: vraag }] }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { content: { type: string; text?: string }[] };
    return j.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim() || null;
  } catch {
    return null;
  }
}

// ── Texts ────────────────────────────────────────────────

const DAG = { nl: ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const MAAND = {
  nl: ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
export function wanneerTekst(start: string, taal: Taal) {
  const d = new Date(`${start}:00Z`);
  return taal === "nl"
    ? `${DAG.nl[d.getUTCDay()]} ${d.getUTCDate()} ${MAAND.nl[d.getUTCMonth()]} om ${start.slice(11, 16)}`
    : `${DAG.en[d.getUTCDay()]} ${d.getUTCDate()} ${MAAND.en[d.getUTCMonth()]} at ${start.slice(11, 16)}`;
}

const voornaam = (n: string) => (n || "").trim().split(/\s+/)[0] || "";

function herinneringTekst(inst: Inst, naam: string, start: string, locatie: string, taal: Taal): Bericht {
  const w = wanneerTekst(start, taal);
  const vn = voornaam(naam);
  if (taal === "nl")
    return {
      onderwerp: `Herinnering: afspraak met ${inst.bedrijf}, ${w}`,
      kop: `Tot morgen${vn ? `, ${vn}` : ""}!`,
      tekst: `Een korte herinnering aan je afspraak met ${inst.bedrijf}: ${w}.${locatie ? `\n\n${locatie}` : ""}\n\nKun je toch niet? Antwoord dan even op dit bericht, dan plannen we een ander moment.`,
      sms: `Herinnering: je afspraak met ${inst.bedrijf} is ${w}. Kun je niet? Laat het ons even weten.`,
    };
  return {
    onderwerp: `Reminder: your appointment with ${inst.bedrijf}, ${w}`,
    kop: `See you tomorrow${vn ? `, ${vn}` : ""}!`,
    tekst: `A quick reminder of your appointment with ${inst.bedrijf}: ${w}.${locatie ? `\n\n${locatie}` : ""}\n\nCan't make it after all? Just reply to this message and we'll find another time.`,
    sms: `Reminder: your appointment with ${inst.bedrijf} is ${w}. Can't make it? Let us know.`,
  };
}

function reviewTekst(inst: Inst, naam: string, taal: Taal): Bericht {
  const vn = voornaam(naam);
  if (taal === "nl")
    return {
      onderwerp: `Hoe was het, ${vn || "en"}? 30 seconden voor ${inst.bedrijf}`,
      kop: `Bedankt${vn ? `, ${vn}` : ""}!`,
      tekst: `Fijn dat we je mochten helpen. Wil je in 30 seconden een review achterlaten? Daarmee help je ${inst.bedrijf} enorm, en andere mensen weten zo wat ze kunnen verwachten.\n\nWas er iets niet goed? Antwoord dan op dit bericht, dan lossen we het op.`,
      knop: { tekst: "Review schrijven", url: inst.review_url },
      sms: `Bedankt voor je afspraak met ${inst.bedrijf}! Wil je een korte review achterlaten? ${inst.review_url}`,
    };
  return {
    onderwerp: `How did it go${vn ? `, ${vn}` : ""}? 30 seconds for ${inst.bedrijf}`,
    kop: `Thank you${vn ? `, ${vn}` : ""}!`,
    tekst: `We're glad we could help. Would you leave a quick review? It helps ${inst.bedrijf} a lot and lets others know what to expect.\n\nSomething not right? Just reply to this message and we'll sort it out.`,
    knop: { tekst: "Write a review", url: inst.review_url },
    sms: `Thanks for your appointment with ${inst.bedrijf}! Would you leave a short review? ${inst.review_url}`,
  };
}

function boekLink(inst: Inst) {
  return inst.site_url ? `${inst.site_url.replace(/#.*$/, "")}#volgo-boek` : `${SITE_URL}/demo/${inst.sleutel}#volgo-boek`;
}

async function opvolgTekst(inst: Inst, naam: string, gesprek: string, dag: 1 | 3, taal: Taal): Promise<Bericht> {
  const vn = voornaam(naam);
  const link = boekLink(inst);
  const ai = await korteTekst(
    `You write a short, warm follow-up message for ${inst.bedrijf}. ${inst.bedrijfsinfo.slice(0, 1200)}
Write in ${taal === "nl" ? "Dutch (informal 'je')" : "English"}. 2 to 4 short sentences, no greeting line, no signature, no subject, no emojis, no prices or promises that are not in the chat.
${dag === 1 ? "This is the first follow-up, one day after the chat: refer to what they asked, and invite them to plan a moment." : "This is the last follow-up, three days after the chat: short and friendly, no pressure, say they can always reply."}`,
    `Visitor name: ${naam || "unknown"}\nThe chat:\n${gesprek.slice(-2500)}`,
    300,
  );
  const kop = taal === "nl" ? `Hoi${vn ? ` ${vn}` : ""},` : `Hi${vn ? ` ${vn}` : ""},`;
  const tekst =
    ai ??
    (taal === "nl"
      ? dag === 1
        ? `Bedankt voor je bericht aan ${inst.bedrijf}. Zullen we een moment plannen om het rustig door te nemen? Kies hieronder een dag en tijd die jou uitkomt, of antwoord gewoon op dit bericht.`
        : `Nog even een korte check: kunnen we je ergens mee helpen? Antwoord gerust op dit bericht, of plan hieronder een moment.`
      : dag === 1
        ? `Thanks for reaching out to ${inst.bedrijf}. Shall we plan a moment to go through it? Pick a day and time below, or just reply to this message.`
        : `Just a quick check: can we help you with anything? Feel free to reply to this message or plan a moment below.`);
  return {
    onderwerp: taal === "nl" ? (dag === 1 ? `Je vraag aan ${inst.bedrijf}` : `Nog vragen? ${inst.bedrijf} helpt je graag`) : dag === 1 ? `Your question to ${inst.bedrijf}` : `Any questions? ${inst.bedrijf} is happy to help`,
    kop,
    tekst,
    knop: { tekst: taal === "nl" ? "Plan een moment" : "Plan a moment", url: link },
    sms: `${kop} ${tekst.slice(0, 300)} ${link}`,
  };
}

const SEIZOEN: Record<number, { nl: string; en: string }> = {
  3: { nl: "lente", en: "spring" },
  6: { nl: "zomer", en: "summer" },
  9: { nl: "najaar", en: "autumn" },
  12: { nl: "winter", en: "winter" },
};

async function seizoenTekst(inst: Inst, maand: number, taal: Taal): Promise<Omit<Bericht, "kop"> | null> {
  const s = SEIZOEN[maand];
  if (!s) return null;
  const ai = await korteTekst(
    `You write a short seasonal message from ${inst.bedrijf} to earlier customers. About the business: ${inst.bedrijfsinfo.slice(0, 1500)}
Write in ${taal === "nl" ? "Dutch (informal 'je')" : "English"}. Season: ${s[taal]}. 2 to 4 short sentences: one useful seasonal tip that fits this business (for a gardener e.g. "time to prune the hedge"), then invite them to plan a moment. No greeting line, no signature, no prices, no emojis, no invented discounts.
Return two parts separated by a line with only ---: first a subject line (max 60 characters), then the message.`,
    "Write it.",
    350,
  );
  const [onderwerp, tekst] = (ai ?? "").split(/\n-{3,}\n/).map((x) => x.trim());
  const link = boekLink(inst);
  const tekst2 =
    tekst ||
    (taal === "nl"
      ? `De ${s.nl} komt eraan, een mooi moment om alles weer op orde te brengen. Zullen we iets voor je plannen? Kies hieronder een moment of antwoord op dit bericht.`
      : `${s.en[0].toUpperCase()}${s.en.slice(1)} is coming, a good moment to get everything in shape again. Shall we plan something? Pick a moment below or reply to this message.`);
  return {
    onderwerp: (onderwerp && tekst ? onderwerp : taal === "nl" ? `Klaar voor de ${s.nl}? ${inst.bedrijf}` : `Ready for ${s.en}? ${inst.bedrijf}`).slice(0, 90),
    tekst: tekst2,
    knop: { tekst: taal === "nl" ? "Plan een moment" : "Plan a moment", url: link },
    sms: `${inst.bedrijf}: ${tekst2.slice(0, 280)} ${link}`,
  };
}

// ── The hourly run ───────────────────────────────────────

const INST_SQL = `SELECT a.team_id, a.sleutel, g.bedrijf, a.bedrijfsinfo, a.tijdzone, a.taal, a.kleur, a.review_url, a.antwoord_mail, a.site_url,
  a.auto_herinnering, a.auto_review, a.auto_opvolging, a.auto_seizoen, g.email AS eigenaar_mail
  FROM ava_instellingen a JOIN gebruikers g ON g.id = a.team_id WHERE g.status IN ('actief', 'proef')`;

export async function instVoorAuto(DB: D1Database, team: number) {
  return DB.prepare(`${INST_SQL} AND a.team_id = ?`).bind(team).first<Inst>();
}

/** Finds the visitor's contact for an appointment: the chat it came from, else "Contact:" in the note. */
async function contactAfspraak(DB: D1Database, a: { lead_id: number | null; notitie: string | null; titel: string }) {
  const meta = a.lead_id
    ? await DB.prepare("SELECT gesprek_id, token, naam, contact, afgemeld FROM ava_gesprek_meta WHERE lead_id = ? ORDER BY gesprek_id DESC LIMIT 1")
        .bind(a.lead_id)
        .first<{ gesprek_id: number; token: string; naam: string | null; contact: string | null; afgemeld: number }>()
    : null;
  const uitNotitie = (a.notitie ?? "").match(/Contact:\s*([^\n]+)/i)?.[1]?.trim();
  const contact = meta?.contact || uitNotitie || "";
  const naam = meta?.naam || a.titel.split("·").slice(1).join("·").trim() || "";
  return { meta, contact, naam };
}

async function taalGesprek(DB: D1Database, gesprekId: number | undefined, standaard: Taal): Promise<Taal> {
  if (!gesprekId) return standaard;
  const r = await DB.prepare("SELECT group_concat(tekst, ' ') AS t FROM (SELECT tekst FROM ava_berichten WHERE gesprek_id = ? AND rol = 'bezoeker' ORDER BY id LIMIT 6)").bind(gesprekId).first<{ t: string | null }>();
  return taalVan(r?.t ?? "", standaard);
}

const tl = (inst: Inst): Taal => (inst.taal === "en" ? "en" : "nl");

export async function draaiAutomatisch(DB: D1Database) {
  const teams = (await DB.prepare(INST_SQL).all<Inst>()).results;
  const { isDemoSleutel } = await import("./push.server");
  let n = 0;
  for (const inst of teams) {
    if (isDemoSleutel(inst.sleutel)) continue;
    try {
      n += await voorTeam(DB, inst);
    } catch (err) {
      console.error("[automatisch]", inst.team_id, err);
    }
  }
  return n;
}

async function voorTeam(DB: D1Database, inst: Inst) {
  let n = 0;
  const nu = (m: number) => lokaal(inst.tijdzone, m);

  // 1. Reminder: appointments that start in 2 to 26 hours.
  if (inst.auto_herinnering) {
    const rij = (
      await DB.prepare("SELECT id, lead_id, titel, start, locatie, notitie FROM afspraken WHERE team_id = ? AND voorbeeld = 0 AND start > ? AND start <= ? ORDER BY start LIMIT 40")
        .bind(inst.team_id, nu(120), nu(26 * 60))
        .all<{ id: number; lead_id: number | null; titel: string; start: string; locatie: string | null; notitie: string | null }>()
    ).results;
    for (const a of rij) {
      const c = await contactAfspraak(DB, a);
      if (!c.contact || !contactVan(c.contact) || c.meta?.afgemeld) continue;
      const ref = `${a.id}-${a.start}`;
      if (!(await claim(DB, inst.team_id, "herinnering", ref, c.contact))) continue;
      const taal = await taalGesprek(DB, c.meta?.gesprek_id, tl(inst));
      const loc = a.locatie && !/^(phone call|telefoon|chat):/i.test(a.locatie) ? a.locatie : "";
      const b = herinneringTekst(inst, c.naam, a.start, loc, taal);
      const k = await stuurBezoeker(inst, c.contact, b, c.meta?.token, taal);
      await klaar(DB, inst.team_id, "herinnering", ref, k, b.onderwerp);
      if (k) {
        n++;
        await notitie(DB, c.meta?.gesprek_id, `Volgo stuurde een herinnering per ${k === "mail" ? "mail" : "sms"} naar ${c.contact}`);
      }
    }
  }

  // 2. Review request: appointments that ended 1 to 72 hours ago.
  if (inst.auto_review && /^https:\/\//.test(inst.review_url)) {
    const rij = (
      await DB.prepare("SELECT id, lead_id, titel, start, eind, notitie FROM afspraken WHERE team_id = ? AND voorbeeld = 0 AND eind <= ? AND eind > ? ORDER BY eind LIMIT 40")
        .bind(inst.team_id, nu(-60), nu(-72 * 60))
        .all<{ id: number; lead_id: number | null; titel: string; start: string; eind: string; notitie: string | null }>()
    ).results;
    for (const a of rij) {
      const c = await contactAfspraak(DB, a);
      if (!c.contact || !contactVan(c.contact) || c.meta?.afgemeld) continue;
      // One review request per person, ever.
      if (!(await claim(DB, inst.team_id, "review", contactVan(c.contact)!.waarde, c.contact))) continue;
      const taal = await taalGesprek(DB, c.meta?.gesprek_id, tl(inst));
      const b = reviewTekst(inst, c.naam, taal);
      const k = await stuurBezoeker(inst, c.contact, b, c.meta?.token, taal);
      await klaar(DB, inst.team_id, "review", contactVan(c.contact)!.waarde, k, b.onderwerp);
      if (k) {
        n++;
        await notitie(DB, c.meta?.gesprek_id, `Volgo vroeg ${c.naam || c.contact} per ${k === "mail" ? "mail" : "sms"} om een review`);
      }
    }
  }

  // 3. Follow-up: chatted, left contact details, but did not book. After 1 day and after 3 days.
  if (inst.auto_opvolging) {
    const rij = (
      await DB.prepare(
        `SELECT g.id, g.gestart, m.token, m.naam, m.contact, m.lead_id,
           (julianday('now') - julianday(g.gestart)) AS dagen
         FROM ava_gesprekken g JOIN ava_gesprek_meta m ON m.gesprek_id = g.id
         LEFT JOIN klant_leads l ON l.id = m.lead_id
         WHERE g.team_id = ? AND g.voorbeeld = 0 AND m.contact IS NOT NULL AND m.contact != '' AND m.afgemeld = 0
           AND g.gestart > datetime('now', '-6 days') AND g.gestart <= datetime('now', '-1 day')
           AND COALESCE(l.status, 'nieuw') NOT IN ('afspraak', 'klant', 'verloren')
           AND m.overgenomen_door IS NULL
           AND NOT EXISTS (SELECT 1 FROM afspraken a WHERE a.team_id = g.team_id AND m.lead_id IS NOT NULL AND a.lead_id = m.lead_id)
           AND NOT EXISTS (SELECT 1 FROM ava_berichten b WHERE b.gesprek_id = g.id AND b.rol = 'mens')
         ORDER BY g.id LIMIT 30`,
      )
        .bind(inst.team_id)
        .all<{ id: number; gestart: string; token: string; naam: string | null; contact: string; lead_id: number | null; dagen: number }>()
    ).results;
    for (const g of rij) {
      if (!contactVan(g.contact)) continue;
      const dag: 1 | 3 = g.dagen >= 3 ? 3 : 1;
      const ref = `${g.id}-${dag}`;
      // Day 3 only when day 1 went out (or this chat is already 3+ days old and nothing was sent: then send just one).
      if (dag === 3) {
        const eerst = await DB.prepare("SELECT status FROM auto_berichten WHERE team_id = ? AND soort = 'opvolging' AND ref = ?").bind(inst.team_id, `${g.id}-1`).first<{ status: string }>();
        if (!eerst) {
          if (!(await claim(DB, inst.team_id, "opvolging", `${g.id}-1`, g.contact))) continue;
          await klaar(DB, inst.team_id, "opvolging", `${g.id}-1`, null, "skipped");
        }
        // Reply came after the first follow-up? Then stop.
        const antwoord = await DB.prepare(
          "SELECT 1 FROM ava_berichten b JOIN auto_berichten x ON x.team_id = ? AND x.soort = 'opvolging' AND x.ref = ? WHERE b.gesprek_id = ? AND b.rol = 'bezoeker' AND b.created_at > x.gemaakt LIMIT 1",
        )
          .bind(inst.team_id, `${g.id}-1`, g.id)
          .first();
        if (antwoord) continue;
      }
      if (!(await claim(DB, inst.team_id, "opvolging", ref, g.contact))) continue;
      const hist = (await DB.prepare("SELECT rol, tekst FROM ava_berichten WHERE gesprek_id = ? AND rol IN ('bezoeker', 'ava') ORDER BY id LIMIT 30").bind(g.id).all<{ rol: string; tekst: string }>()).results;
      const gesprek = hist.map((h) => `${h.rol === "bezoeker" ? "Visitor" : "Assistant"}: ${h.tekst}`).join("\n");
      const taal = taalVan(hist.filter((h) => h.rol === "bezoeker").map((h) => h.tekst).join(" "), tl(inst));
      const b = await opvolgTekst(inst, g.naam ?? "", gesprek, dag, taal);
      const k = await stuurBezoeker(inst, g.contact, b, g.token, taal);
      await klaar(DB, inst.team_id, "opvolging", ref, k, b.onderwerp);
      if (k) {
        n++;
        await notitie(DB, g.id, `Volgo stuurde opvolging ${dag === 1 ? "1 (na 1 dag)" : "2 (na 3 dagen)"} per ${k === "mail" ? "mail" : "sms"}:\n${b.tekst}`);
      }
    }
  }

  // 4. Seasonal message to earlier customers: first week of March, June, September and December, 10:00 local time or later.
  if (inst.auto_seizoen) {
    const lokaalNu = nu(0);
    const maand = Number(lokaalNu.slice(5, 7));
    const dag = Number(lokaalNu.slice(8, 10));
    if (SEIZOEN[maand] && dag <= 7 && lokaalNu.slice(11, 13) >= "10") {
      const rij = (
        await DB.prepare(
          `SELECT m.gesprek_id, m.token, m.naam, m.contact FROM ava_gesprek_meta m JOIN ava_gesprekken g ON g.id = m.gesprek_id
           LEFT JOIN klant_leads l ON l.id = m.lead_id
           WHERE g.team_id = ? AND g.voorbeeld = 0 AND m.contact IS NOT NULL AND m.contact != '' AND m.afgemeld = 0
             AND g.gestart < datetime('now', '-30 days')
             AND (l.status IN ('klant', 'afspraak') OR EXISTS (SELECT 1 FROM afspraken a WHERE a.team_id = g.team_id AND m.lead_id IS NOT NULL AND a.lead_id = m.lead_id))
           ORDER BY m.gesprek_id DESC LIMIT 200`,
        )
          .bind(inst.team_id)
          .all<{ gesprek_id: number; token: string; naam: string | null; contact: string }>()
      ).results;
      const teksten: Partial<Record<Taal, Awaited<ReturnType<typeof seizoenTekst>>>> = {};
      let deze = 0;
      for (const p of rij) {
        if (deze >= 40) break; // spread over the hours, max 40 per hour per business
        const c = contactVan(p.contact);
        if (!c) continue;
        const ref = `${lokaalNu.slice(0, 7)}-${c.waarde}`;
        if (!(await claim(DB, inst.team_id, "seizoen", ref, p.contact))) continue;
        const taal = await taalGesprek(DB, p.gesprek_id, tl(inst));
        if (!(taal in teksten)) teksten[taal] = await seizoenTekst(inst, maand, taal);
        const t = teksten[taal];
        if (!t) continue;
        const vn = voornaam(p.naam ?? "");
        const k = await stuurBezoeker(inst, p.contact, { ...t, kop: taal === "nl" ? `Hoi${vn ? ` ${vn}` : ""},` : `Hi${vn ? ` ${vn}` : ""},` }, p.token, taal);
        await klaar(DB, inst.team_id, "seizoen", ref, k, t.onderwerp);
        if (k) {
          n++;
          deze++;
          await notitie(DB, p.gesprek_id, `Volgo stuurde het ${SEIZOEN[maand].nl}bericht per ${k === "mail" ? "mail" : "sms"}`);
        }
      }
    }
  }
  return n;
}

function lokaal(tz: string, plusMin = 0) {
  const d = new Date(Date.now() + plusMin * 60000);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

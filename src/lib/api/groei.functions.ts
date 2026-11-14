import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Automations, reviews, payment requests and "Your website" for the customer's dashboard.
async function sessie() {
  const { actieveGebruiker } = await import("../toegang.server");
  const { bindings } = await import("../bindings.server");
  const g = await actieveGebruiker().catch(() => null);
  const { DB } = bindings();
  if (!g || !DB) throw new Error("Not logged in");
  return { g, DB };
}

async function instVan(DB: Awaited<ReturnType<typeof sessie>>["DB"], team: number) {
  const { instellingenVoorTeam } = await import("../ava.server");
  await instellingenVoorTeam(DB, team);
  const { instVoorAuto } = await import("../automatisch.server");
  const i = await instVoorAuto(DB, team);
  if (i) return i;
  // Account without an active plan: still return the basics.
  return DB.prepare(
    `SELECT a.team_id, a.sleutel, g.bedrijf, a.bedrijfsinfo, a.tijdzone, a.taal, a.kleur, a.review_url, a.antwoord_mail, a.site_url,
      a.auto_herinnering, a.auto_review, a.auto_opvolging, a.auto_seizoen, g.email AS eigenaar_mail
     FROM ava_instellingen a JOIN gebruikers g ON g.id = a.team_id WHERE a.team_id = ?`,
  )
    .bind(team)
    .first<NonNullable<Awaited<ReturnType<typeof instVoorAuto>>>>()
    .then((x) => x!);
}

// ── Automations ─────────────────────────────────────────

export const haalAutomatisch = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB } = await sessie();
  const i = await instVan(DB, g.team_id);
  const { smsAan } = await import("../automatisch.server");
  const { bindings } = await import("../bindings.server");
  const [log, tel] = await Promise.all([
    DB.prepare("SELECT id, soort, aan, kanaal, onderwerp, status, gemaakt FROM auto_berichten WHERE team_id = ? AND status != 'bezig' AND onderwerp != 'skipped' ORDER BY id DESC LIMIT 40")
      .bind(g.team_id)
      .all<{ id: number; soort: string; aan: string; kanaal: string; onderwerp: string; status: string; gemaakt: string }>(),
    DB.prepare("SELECT soort, COUNT(*) AS n FROM auto_berichten WHERE team_id = ? AND status = 'verstuurd' AND gemaakt > datetime('now', '-30 days') GROUP BY soort")
      .bind(g.team_id)
      .all<{ soort: string; n: number }>(),
  ]);
  return {
    aan: { herinnering: !!i.auto_herinnering, review: !!i.auto_review, opvolging: !!i.auto_opvolging, seizoen: !!i.auto_seizoen },
    reviewUrl: i.review_url,
    sms: smsAan(),
    mailIn: bindings().INBOUND_MAIL === "aan",
    sleutel: i.sleutel,
    log: log.results,
    maand: Object.fromEntries(tel.results.map((r) => [r.soort, r.n])) as Record<string, number>,
  };
});

// ── Reviews: AI reply ────────────────────────────────────

export const schrijfReviewAntwoord = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ naam: z.string().trim().max(80).optional(), sterren: z.number().int().min(1).max(5), review: z.string().trim().min(2).max(3000) }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    const i = await instVan(DB, g.team_id);
    const { korteTekst, taalVan } = await import("../automatisch.server");
    const taal = taalVan(data.review, i.taal === "en" ? "en" : "nl");
    const antwoord = await korteTekst(
      `You write the public reply of ${i.bedrijf} to a Google review. About the business: ${i.bedrijfsinfo.slice(0, 1200)}
Reply in the language of the review (${taal === "nl" ? "Dutch, informal 'je' unless the review uses 'u'" : "English"}). 2 to 4 sentences, warm and personal, mention something specific from the review, use the reviewer's first name if given.
4-5 stars: thank them and invite them back. 1-3 stars: thank them for the feedback, take it seriously without arguing, and invite them to get in touch to make it right. Never promise refunds or discounts. No emojis, no hashtags, no signature line, no quotes around the text.`,
      `Reviewer: ${data.naam || "unknown"}\nStars: ${data.sterren}/5\nReview: ${data.review}`,
      350,
    );
    if (!antwoord) return { ok: false as const, antwoord: "", message: "No reply could be written right now. Please try again." };
    await DB.prepare("INSERT INTO review_antwoorden (team_id, naam, sterren, review, antwoord) VALUES (?, ?, ?, ?, ?)")
      .bind(g.team_id, data.naam ?? "", data.sterren, data.review, antwoord)
      .run();
    return { ok: true as const, antwoord, message: "" };
  });

export const haalReviewsKlant = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB } = await sessie();
  const i = await instVan(DB, g.team_id);
  const [antwoorden, verzoeken] = await Promise.all([
    DB.prepare("SELECT id, naam, sterren, review, antwoord, gemaakt FROM review_antwoorden WHERE team_id = ? ORDER BY id DESC LIMIT 20").bind(g.team_id).all<{ id: number; naam: string; sterren: number; review: string; antwoord: string; gemaakt: string }>(),
    DB.prepare("SELECT aan, kanaal, status, gemaakt FROM auto_berichten WHERE team_id = ? AND soort = 'review' ORDER BY id DESC LIMIT 30").bind(g.team_id).all<{ aan: string; kanaal: string; status: string; gemaakt: string }>(),
  ]);
  return { reviewUrl: i.review_url, aan: !!i.auto_review, antwoorden: antwoorden.results, verzoeken: verzoeken.results };
});

// ── Payment requests ─────────────────────────────────────

export const haalBetalingen = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB } = await sessie();
  const i = await DB.prepare("SELECT iban, stripe_sleutel != '' AS stripe FROM ava_instellingen WHERE team_id = ?").bind(g.team_id).first<{ iban: string; stripe: number }>();
  const r = await DB.prepare("SELECT id, token, naam, contact, bedrag, omschrijving, status, gemaakt, betaald FROM betaalverzoeken WHERE team_id = ? ORDER BY id DESC LIMIT 60")
    .bind(g.team_id)
    .all<{ id: number; token: string; naam: string; contact: string; bedrag: number; omschrijving: string; status: string; gemaakt: string; betaald: string | null }>();
  const contacten = await DB.prepare(
    "SELECT m.gesprek_id, COALESCE(m.naam, g.bezoeker) AS naam, m.contact FROM ava_gesprek_meta m JOIN ava_gesprekken g ON g.id = m.gesprek_id WHERE g.team_id = ? AND g.voorbeeld = 0 AND m.contact IS NOT NULL AND m.contact != '' ORDER BY g.laatste DESC LIMIT 50",
  )
    .bind(g.team_id)
    .all<{ gesprek_id: number; naam: string; contact: string }>();
  return { klaar: Boolean(i?.iban || i?.stripe), online: Boolean(i?.stripe), iban: !!i?.iban, verzoeken: r.results, contacten: contacten.results };
});

export const maakBetaalverzoek = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        naam: z.string().trim().min(1).max(100),
        contact: z.string().trim().min(5).max(160),
        bedrag: z.number().int().min(100).max(5_000_000),
        omschrijving: z.string().trim().min(2).max(160),
        gesprek_id: z.number().int().optional(),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    const i = await instVan(DB, g.team_id);
    const extra = await DB.prepare("SELECT iban, stripe_sleutel FROM ava_instellingen WHERE team_id = ?").bind(g.team_id).first<{ iban: string; stripe_sleutel: string }>();
    if (!extra?.iban && !extra?.stripe_sleutel) return { ok: false as const, message: "Payments are not switched on for your account yet. Ask Volgo to switch them on." };
    const { contactVan, stuurBezoeker, taalVan } = await import("../automatisch.server");
    if (!contactVan(data.contact)) return { ok: false as const, message: "Fill in an email address or mobile number." };
    let gesprek: { gesprek_id: number; token: string } | null = null;
    if (data.gesprek_id)
      gesprek = await DB.prepare("SELECT m.gesprek_id, m.token FROM ava_gesprek_meta m JOIN ava_gesprekken g ON g.id = m.gesprek_id WHERE m.gesprek_id = ? AND g.team_id = ?")
        .bind(data.gesprek_id, g.team_id)
        .first<{ gesprek_id: number; token: string }>();
    const { randomToken } = await import("../auth.server");
    const token = randomToken(16);
    await DB.prepare("INSERT INTO betaalverzoeken (team_id, token, gesprek_id, naam, contact, bedrag, omschrijving) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(g.team_id, token, gesprek?.gesprek_id ?? null, data.naam, data.contact, data.bedrag, data.omschrijving)
      .run();
    const { SITE_URL } = await import("../mail.server");
    const { euro } = await import("../betaal.server");
    const link = `${SITE_URL}/api/betaal/${token}`;
    const taal = taalVan(data.omschrijving, i.taal === "en" ? "en" : "nl");
    const vn = data.naam.split(/\s+/)[0];
    const kanaal = await stuurBezoeker(
      i,
      data.contact,
      taal === "nl"
        ? { onderwerp: `Betaalverzoek van ${i.bedrijf}: ${euro(data.bedrag)}`, kop: `Hoi ${vn},`, tekst: `Hierbij het betaalverzoek voor ${data.omschrijving}: ${euro(data.bedrag)}.\n\nBedankt voor je vertrouwen in ${i.bedrijf}!`, knop: { tekst: `Betaal ${euro(data.bedrag)}`, url: link }, sms: `${i.bedrijf}: betaalverzoek ${euro(data.bedrag)} voor ${data.omschrijving}. Betalen: ${link}` }
        : { onderwerp: `Payment request from ${i.bedrijf}: ${euro(data.bedrag)}`, kop: `Hi ${vn},`, tekst: `Here is the payment request for ${data.omschrijving}: ${euro(data.bedrag)}.\n\nThank you for choosing ${i.bedrijf}!`, knop: { tekst: `Pay ${euro(data.bedrag)}`, url: link }, sms: `${i.bedrijf}: payment request ${euro(data.bedrag)} for ${data.omschrijving}. Pay: ${link}` },
      null,
      taal,
    );
    const { notitie } = await import("../automatisch.server");
    await notitie(DB, gesprek?.gesprek_id, `Betaalverzoek verstuurd: ${euro(data.bedrag)} voor "${data.omschrijving}"`);
    return { ok: true as const, link, verstuurd: Boolean(kanaal), message: kanaal ? "" : "Opgeslagen, maar versturen lukte niet. Kopieer de link en stuur hem zelf." };
  });

export const annuleerBetaalverzoek = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int() }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    await DB.prepare("UPDATE betaalverzoeken SET status = 'geannuleerd' WHERE id = ? AND team_id = ? AND status = 'open'").bind(data.id, g.team_id).run();
    return { ok: true };
  });

export const markeerBetaald = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int() }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    await DB.prepare("UPDATE betaalverzoeken SET status = 'betaald', betaald = datetime('now') WHERE id = ? AND team_id = ? AND status = 'open'").bind(data.id, g.team_id).run();
    return { ok: true };
  });

// ── Your website: address, install check, preview ───────

export const haalMijnWebsite = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB } = await sessie();
  const i = await instVan(DB, g.team_id);
  const { bindings } = await import("../bindings.server");
  return { sleutel: i.sleutel, siteUrl: i.site_url, reviewUrl: i.review_url, mailIn: bindings().INBOUND_MAIL === "aan" };
});

export const bewaarMijnWebsite = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        site_url: z.union([z.literal(""), z.string().trim().max(300).regex(/^https?:\/\/[^\s]+\.[^\s]+$/)]).optional(),
        review_url: z.union([z.literal(""), z.string().trim().max(500).regex(/^https:\/\/[^\s]+$/)]).optional(),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    await instVan(DB, g.team_id);
    if (data.site_url !== undefined) await DB.prepare("UPDATE ava_instellingen SET site_url = ? WHERE team_id = ?").bind(data.site_url.replace(/^http:\/\//, "https://"), g.team_id).run();
    if (data.review_url !== undefined) await DB.prepare("UPDATE ava_instellingen SET review_url = ? WHERE team_id = ?").bind(data.review_url, g.team_id).run();
    return { ok: true };
  });

/** Is the chat code on the website? Looks for ava.js with this business's key in the homepage. */
export const controleerInstallatie = createServerFn({ method: "POST" }).handler(async () => {
  const { g, DB } = await sessie();
  const i = await instVan(DB, g.team_id);
  if (!/^https?:\/\//.test(i.site_url)) return { status: "geen" as const };
  try {
    const r = await fetch(i.site_url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; VolgoCheck/1.0; +https://thevolgo.app)" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
    const html = await r.text();
    let staat = html.includes(i.sleutel) && html.includes("ava.js");
    // Some builders (Wix, Squarespace) load scripts later: then the chat itself reports a visit.
    if (!staat) staat = Boolean(await DB.prepare("SELECT 1 FROM site_views WHERE team_id = ? AND dag >= date('now', '-7 days') LIMIT 1").bind(g.team_id).first().catch(() => null));
    if (!staat) return { status: "niet" as const };
    // Found: tick "Add Volgo to your website" in Get started, so the customer never has to confirm it by hand.
    await DB.prepare("INSERT INTO onboarding (team_id, geinstalleerd) VALUES (?, 1) ON CONFLICT(team_id) DO UPDATE SET geinstalleerd = 1").bind(g.team_id).run().catch(() => undefined);
    return { status: "ok" as const };
  } catch {
    return { status: "onbereikbaar" as const };
  }
});

/** "This week Volgo did…" on the Today screen: what the customer pays for, in four numbers. */
export const haalWeek = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB } = await sessie();
  const t = g.team_id;
  const een = async (sql: string) => (await DB.prepare(sql).bind(t).first<{ n: number }>())?.n ?? 0;
  const [gesprekken, aanvragen, afspraken, berichten, betaald] = await Promise.all([
    een("SELECT COUNT(*) AS n FROM ava_gesprekken WHERE team_id = ? AND voorbeeld = 0 AND gestart > datetime('now', '-7 days')"),
    een("SELECT COUNT(*) AS n FROM klant_leads WHERE gebruiker_id = ? AND voorbeeld = 0 AND created_at > datetime('now', '-7 days')"),
    een("SELECT COUNT(*) AS n FROM ava_berichten b JOIN ava_gesprekken g ON g.id = b.gesprek_id WHERE g.team_id = ? AND b.rol = 'bezoeker' AND b.tekst LIKE 'Booked:%' AND b.created_at > datetime('now', '-7 days')"),
    een("SELECT COUNT(*) AS n FROM auto_berichten WHERE team_id = ? AND status = 'verstuurd' AND gemaakt > datetime('now', '-7 days')"),
    een("SELECT COALESCE(SUM(bedrag), 0) AS n FROM betaalverzoeken WHERE team_id = ? AND status = 'betaald' AND betaald > datetime('now', '-7 days')"),
  ]);
  return { gesprekken, aanvragen, afspraken, berichten, betaald };
});

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { huidigeGebruiker } from "../auth.server";
import { bindings } from "../bindings.server";
import { PLANS, isPlan } from "../plans";

/** Only the Volgo owners (ADMIN_EMAILS in wrangler.jsonc) may use these. */
async function admin() {
  const g = await huidigeGebruiker().catch(() => null);
  const { DB, ADMIN_EMAILS } = bindings();
  const lijst = (ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!g || !DB || !lijst.includes(g.email.toLowerCase())) return null;
  return { g, DB };
}

export const isAdmin = createServerFn({ method: "GET" }).handler(async () => Boolean(await admin()));

export const haalAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const a = await admin();
  if (!a) return null;
  const { DB } = a;
  const [klanten, aanvragen] = await Promise.all([
    DB.prepare(
      `SELECT g.id, g.bedrijf, g.naam, g.email, g.plan, g.status, g.proef_tot, g.created_at, g.testmodus,
              (SELECT COUNT(*) FROM team_leden t WHERE t.team_id = g.id AND t.gebruiker_id != g.id) AS leden,
              (SELECT COUNT(*) FROM ava_gesprekken c WHERE c.team_id = g.id AND c.voorbeeld = 0 AND c.gestart >= datetime('now', 'start of month')) AS gesprekken,
              (SELECT COUNT(*) FROM klant_leads l WHERE l.gebruiker_id = g.id AND l.voorbeeld = 0) AS leads,
              (SELECT MAX(c.laatste) FROM ava_gesprekken c WHERE c.team_id = g.id AND c.voorbeeld = 0) AS laatst_actief,
              (SELECT sc.ok FROM site_controles sc JOIN klant_sites st ON st.id = sc.site_id WHERE st.team_id = g.id ORDER BY sc.id DESC LIMIT 1) AS site_ok
       FROM gebruikers g
       WHERE g.id NOT IN (SELECT gebruiker_id FROM team_leden WHERE gebruiker_id != team_id) AND g.status != 'verwijderd'
       ORDER BY g.created_at DESC LIMIT 500`,
    ).all<{
      id: number;
      bedrijf: string;
      naam: string;
      email: string;
      plan: string;
      status: string;
      proef_tot: string | null;
      created_at: string;
      testmodus: number;
      leden: number;
      gesprekken: number;
      leads: number;
      laatst_actief: string | null;
      site_ok: number | null;
    }>(),
    DB.prepare(
      `SELECT w.id, w.team_id, w.created_at, w.contact, w.telefoon, w.domein, w.huidige_site, w.wensen, w.status, g.bedrijf, g.naam, g.email, g.plan
       FROM website_aanvragen w JOIN gebruikers g ON g.id = w.team_id ORDER BY w.id DESC LIMIT 200`,
    ).all<{
      id: number;
      team_id: number;
      created_at: string;
      contact: string;
      telefoon: string;
      domein: string;
      huidige_site: string;
      wensen: string;
      status: string;
      bedrijf: string;
      naam: string;
      email: string;
      plan: string;
    }>(),
  ]);
  const betalend = klanten.results.filter((k) => k.status === "actief" && !k.testmodus);
  const mrr = betalend.reduce((som, k) => som + (isPlan(k.plan) ? PLANS[k.plan].prijs : 0), 0) / 100;
  return {
    klanten: klanten.results,
    aanvragen: aanvragen.results,
    cijfers: {
      totaal: klanten.results.length,
      proef: klanten.results.filter((k) => k.status === "proef").length,
      actief: klanten.results.filter((k) => k.status === "actief").length,
      verlopen: klanten.results.filter((k) => k.status === "verlopen").length,
      mrr,
      openAanvragen: aanvragen.results.filter((w) => w.status !== "live").length,
    },
  };
});

export const zetAanvraagStatus = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int(), status: z.enum(["ontvangen", "in_gesprek", "in_aanbouw", "review", "live"]) }).parse(v))
  .handler(async ({ data }) => {
    const a = await admin();
    if (!a) return { ok: false };
    await a.DB.prepare("UPDATE website_aanvragen SET status = ? WHERE id = ?").bind(data.status, data.id).run();
    return { ok: true };
  });

type StripeLijst<T> = { data?: T[]; has_more?: boolean; error?: { message?: string } };
type Factuur = { id: string; number: string | null; amount_paid: number; currency: string; created: number; customer: string; customer_email: string | null; customer_name: string | null; hosted_invoice_url: string | null; livemode: boolean; status_transitions?: { paid_at?: number | null }; lines?: { data?: { description?: string | null }[] } };
type Abo = { id: string; customer: string; status: string; trial_end: number | null; items?: { data?: { quantity?: number; price?: { unit_amount?: number | null } }[] } };

async function stripeAlles<T extends { id: string }>(key: string, pad: string, max = 5) {
  const uit: T[] = [];
  let na = "";
  for (let i = 0; i < max; i++) {
    const r = await fetch(`https://api.stripe.com/v1/${pad}${pad.includes("?") ? "&" : "?"}limit=100${na ? `&starting_after=${na}` : ""}`, { headers: { Authorization: `Bearer ${key}` } });
    const j = (await r.json()) as StripeLijst<T>;
    if (!r.ok) throw new Error(j.error?.message ?? `Stripe ${r.status}`);
    uit.push(...(j.data ?? []));
    if (!j.has_more || !j.data?.length) break;
    na = j.data[j.data.length - 1]!.id;
  }
  return uit;
}

const bedragAbo = (s: Abo) => (s.items?.data ?? []).reduce((som, it) => som + (it.price?.unit_amount ?? 0) * (it.quantity ?? 1), 0);

/** Volgo's own revenue, straight from Stripe: every paid invoice, monthly recurring revenue and what comes in after trials. */
export const haalOmzet = createServerFn({ method: "GET" }).handler(async () => {
  const a = await admin();
  if (!a) return null;
  const { STRIPE_SECRET_KEY } = bindings();
  if (!STRIPE_SECRET_KEY) return { ok: false as const, message: "Stripe is not connected." };
  try {
    const [facturen, actief, proef, achter, klanten] = await Promise.all([
      stripeAlles<Factuur>(STRIPE_SECRET_KEY, "invoices?status=paid"),
      stripeAlles<Abo>(STRIPE_SECRET_KEY, "subscriptions?status=active"),
      stripeAlles<Abo>(STRIPE_SECRET_KEY, "subscriptions?status=trialing"),
      stripeAlles<Abo>(STRIPE_SECRET_KEY, "subscriptions?status=past_due", 1),
      a.DB.prepare("SELECT id, bedrijf, email, plan, stripe_klant FROM gebruikers WHERE COALESCE(stripe_klant, '') != ''").all<{ id: number; bedrijf: string; email: string; plan: string; stripe_klant: string }>(),
    ]);
    const perKlant = new Map(klanten.results.map((k) => [k.stripe_klant, k]));
    const betalingen = facturen
      .filter((f) => f.amount_paid > 0)
      .map((f) => {
        const k = perKlant.get(f.customer);
        return {
          id: f.id,
          nummer: f.number ?? "",
          bedrag: f.amount_paid / 100,
          valuta: f.currency.toUpperCase(),
          betaald: (f.status_transitions?.paid_at ?? f.created) * 1000,
          bedrijf: k?.bedrijf ?? f.customer_name ?? "Unknown customer",
          email: k?.email ?? f.customer_email ?? "",
          plan: k && isPlan(k.plan) ? PLANS[k.plan].naam : (f.lines?.data?.[0]?.description ?? ""),
          factuur: f.hosted_invoice_url,
        };
      })
      .sort((x, y) => y.betaald - x.betaald);
    const nu = new Date();
    const maandStart = Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), 1);
    const som = (l: typeof betalingen) => Math.round(l.reduce((s, b) => s + b.bedrag, 0) * 100) / 100;
    return {
      ok: true as const,
      live: STRIPE_SECRET_KEY.startsWith("sk_live"),
      dezeMaand: som(betalingen.filter((b) => b.betaald >= maandStart)),
      totaal: som(betalingen),
      mrr: actief.reduce((s, x) => s + bedragAbo(x), 0) / 100,
      betalend: actief.length,
      inProef: proef.length,
      naProef: proef.reduce((s, x) => s + bedragAbo(x), 0) / 100,
      achterstand: achter.length,
      betalingen: betalingen.slice(0, 300),
    };
  } catch (err) {
    console.error("[admin omzet]", err);
    return { ok: false as const, message: "Couldn't load revenue from Stripe right now." };
  }
});


/** Public: real reviews for the landing page. */
export const haalReviews = createServerFn({ method: "GET" }).handler(async () => {
  const { DB } = bindings();
  if (!DB) return [];
  const r = await DB.prepare("SELECT id, naam, bedrijf, plaats, branche, tekst, sterren, resultaat FROM reviews WHERE zichtbaar = 1 ORDER BY id DESC LIMIT 12").all<{
    id: number; naam: string; bedrijf: string; plaats: string; branche: string; tekst: string; sterren: number; resultaat: string;
  }>();
  return r.results;
});

export const alleReviews = createServerFn({ method: "GET" }).handler(async () => {
  const a = await admin();
  if (!a) return [];
  const r = await a.DB.prepare("SELECT id, created_at, naam, bedrijf, plaats, branche, tekst, sterren, resultaat, zichtbaar FROM reviews ORDER BY id DESC").all<{
    id: number; created_at: string; naam: string; bedrijf: string; plaats: string; branche: string; tekst: string; sterren: number; resultaat: string; zichtbaar: number;
  }>();
  return r.results;
});

export const bewaarReview = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        id: z.number().int().optional(),
        naam: z.string().trim().min(2).max(80),
        bedrijf: z.string().trim().min(2).max(120),
        plaats: z.string().trim().max(80).default(""),
        branche: z.string().trim().max(80).default(""),
        tekst: z.string().trim().min(20).max(600),
        sterren: z.number().int().min(1).max(5).default(5),
        resultaat: z.string().trim().max(120).default(""),
        zichtbaar: z.boolean().default(true),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const a = await admin();
    if (!a) return { ok: false as const };
    if (data.id) {
      await a.DB.prepare("UPDATE reviews SET naam=?, bedrijf=?, plaats=?, branche=?, tekst=?, sterren=?, resultaat=?, zichtbaar=? WHERE id=?")
        .bind(data.naam, data.bedrijf, data.plaats, data.branche, data.tekst, data.sterren, data.resultaat, data.zichtbaar ? 1 : 0, data.id)
        .run();
    } else {
      await a.DB.prepare("INSERT INTO reviews (naam, bedrijf, plaats, branche, tekst, sterren, resultaat, zichtbaar) VALUES (?,?,?,?,?,?,?,?)")
        .bind(data.naam, data.bedrijf, data.plaats, data.branche, data.tekst, data.sterren, data.resultaat, data.zichtbaar ? 1 : 0)
        .run();
    }
    return { ok: true as const };
  });

export const verwijderReview = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int() }).parse(v))
  .handler(async ({ data }) => {
    const a = await admin();
    if (!a) return { ok: false as const };
    await a.DB.prepare("DELETE FROM reviews WHERE id = ?").bind(data.id).run();
    return { ok: true as const };
  });

/** Public: which ad pixels are configured (IDs only; scripts load after consent). */
export const haalTracking = createServerFn({ method: "GET" }).handler(async () => {
  const { META_PIXEL_ID, GOOGLE_TAG_ID } = bindings();
  return { meta: META_PIXEL_ID || "", google: GOOGLE_TAG_ID || "" };
});

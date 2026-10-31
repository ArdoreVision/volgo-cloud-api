import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { hashIp, recentCount } from "../aanvraag.server";
import { checkWachtwoord, hashWachtwoord, huidigeGebruiker, maakSessie, randomToken, stopSessie } from "../auth.server";
import { bindings } from "../bindings.server";
import { PLANS, isPlan } from "../plans";
import { seedTeam, zorgVoorKanaal } from "../team.server";
import { heeftToegang } from "../toegang.server";

function origin() {
  const host = getRequestHeader("host") ?? "thevolgo.app";
  return `https://${host}`;
}

async function stripe(path: string, init?: { method?: string; body?: URLSearchParams }) {
  const { STRIPE_SECRET_KEY } = bindings();
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: init?.body,
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

// 1. Abonnement kiezen → naar betalen (Stripe) of naar de testbetaling.
export const startBetaling = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ plan: z.string() }).parse(v))
  .handler(async ({ data }) => {
    if (!isPlan(data.plan)) return { ok: false as const, message: "Unknown plan." };
    const plan = PLANS[data.plan];
    const { DB, STRIPE_SECRET_KEY } = bindings();
    if (!DB) return { ok: false as const, message: "Database unavailable." };

    // Logged in (switching plans)? Reuse the Stripe customer and skip the trial.
    const ik = await huidigeGebruiker().catch(() => null);
    const bestaand = ik
      ? await DB.prepare("SELECT stripe_klant, plan FROM gebruikers WHERE id = ?").bind(ik.team_id).first<{ stripe_klant: string | null; plan: string }>()
      : null;
    if (ik && ik.rol !== "eigenaar") return { ok: false as const, message: "Only the account owner can change the plan." };

    if (STRIPE_SECRET_KEY) {
      const b = new URLSearchParams();
      if (bestaand?.stripe_klant) b.set("customer", bestaand.stripe_klant);
      b.set("mode", "subscription");
      b.set("locale", "en");
      b.set("line_items[0][quantity]", "1");
      b.set("line_items[0][price_data][currency]", "eur");
      b.set("line_items[0][price_data][unit_amount]", String(plan.prijs));
      b.set("line_items[0][price_data][recurring][interval]", "month");
      b.set("line_items[0][price_data][product_data][name]", `Volgo ${plan.naam}`);
      if (plan.proefDagen && !ik) b.set("subscription_data[trial_period_days]", String(plan.proefDagen));
      b.set("metadata[plan]", plan.id);
      // HCC is zelf de verkoper; Stripe "Managed Payments" (Stripe als verkoper) staat uit.
      b.set("managed_payments[enabled]", "false");
      b.set("adaptive_pricing[enabled]", "false"); // altijd in euro's
      b.set("billing_address_collection", "required");
      b.set("tax_id_collection[enabled]", "true");
      b.set("success_url", `${origin()}/signup?session_id={CHECKOUT_SESSION_ID}`);
      b.set("cancel_url", `${origin()}/pricing`);
      try {
        const s = await stripe("checkout/sessions", { method: "POST", body: b });
        return { ok: true as const, url: String(s.url) };
      } catch (err) {
        console.error("[betaling]", err);
        return { ok: false as const, message: "Payments are temporarily unavailable. Please try again later." };
      }
    }

    const token = randomToken(16);
    await DB.prepare("INSERT INTO betalingen (token, plan, status, testmodus) VALUES (?, ?, 'open', 1)").bind(token, plan.id).run();
    return { ok: true as const, url: `/checkout?token=${token}` };
  });

// Testbetaling: alleen zolang er geen Stripe-sleutel is.
export const bekijkTestBetaling = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ token: z.string().max(64) }).parse(v))
  .handler(async ({ data }) => {
    const { DB, STRIPE_SECRET_KEY } = bindings();
    if (!DB || STRIPE_SECRET_KEY) return null;
    const r = await DB.prepare("SELECT plan, status FROM betalingen WHERE token = ? AND testmodus = 1").bind(data.token).first<{ plan: string; status: string }>();
    return r && isPlan(r.plan) ? { plan: r.plan, status: r.status } : null;
  });

export const rondTestBetalingAf = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ token: z.string().max(64) }).parse(v))
  .handler(async ({ data }) => {
    const { DB, STRIPE_SECRET_KEY } = bindings();
    if (!DB || STRIPE_SECRET_KEY) return { ok: false as const };
    const r = await DB.prepare("UPDATE betalingen SET status = 'betaald' WHERE token = ? AND testmodus = 1 AND status = 'open'").bind(data.token).run();
    return { ok: (r.meta?.changes ?? 0) > 0 };
  });

// 2. Na betalen: controleren voordat iemand een account mag maken.
export const controleerBetaling = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ token: z.string().max(64).optional(), session_id: z.string().max(200).optional() }).parse(v))
  .handler(async ({ data }) => {
    const { DB, STRIPE_SECRET_KEY } = bindings();
    if (!DB) return null;
    if (data.session_id && STRIPE_SECRET_KEY) {
      const bestaand = await DB.prepare("SELECT token, plan, email, gebruikt FROM betalingen WHERE token = ?").bind(data.session_id).first<{ token: string; plan: string; email: string | null; gebruikt: number }>();
      if (bestaand) return bestaand.gebruikt ? null : { token: bestaand.token, plan: bestaand.plan, email: bestaand.email ?? "" };
      try {
        const s = await stripe(`checkout/sessions/${encodeURIComponent(data.session_id)}`);
        const meta = (s.metadata ?? {}) as Record<string, string>;
        const details = (s.customer_details ?? {}) as Record<string, string>;
        if (s.status !== "complete" || !isPlan(meta.plan)) return null;
        await DB.prepare("INSERT INTO betalingen (token, plan, status, email, stripe_klant, stripe_abonnement) VALUES (?, ?, 'betaald', ?, ?, ?)")
          .bind(data.session_id, meta.plan, details.email ?? "", String(s.customer ?? ""), String(s.subscription ?? ""))
          .run();
        return { token: data.session_id, plan: meta.plan, email: details.email ?? "" };
      } catch (err) {
        console.error("[betaling controle]", err);
        return null;
      }
    }
    if (data.token) {
      const r = await DB.prepare("SELECT token, plan, email, gebruikt, status FROM betalingen WHERE token = ?").bind(data.token).first<{ token: string; plan: string; email: string | null; gebruikt: number; status: string }>();
      if (r && r.status === "betaald" && !r.gebruikt) return { token: r.token, plan: r.plan, email: r.email ?? "" };
    }
    return null;
  });

// 3. Account aanmaken (alleen met een geldige, betaalde en nog ongebruikte betaling).
export const maakAccount = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        token: z.string().min(8).max(200),
        naam: z.string().trim().min(2).max(100),
        bedrijf: z.string().trim().min(2).max(120),
        email: z.string().trim().toLowerCase().email().max(200),
        wachtwoord: z.string().min(8).max(200),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { DB } = bindings();
    if (!DB) return { ok: false as const, message: "Database unavailable." };
    const b = await DB.prepare("SELECT plan, status, gebruikt, testmodus, stripe_klant, stripe_abonnement FROM betalingen WHERE token = ?")
      .bind(data.token)
      .first<{ plan: string; status: string; gebruikt: number; testmodus: number; stripe_klant: string | null; stripe_abonnement: string | null }>();
    if (!b || b.status !== "betaald" || b.gebruikt || !isPlan(b.plan)) {
      return { ok: false as const, message: "We couldn’t find your payment. Please choose a plan again." };
    }
    const bestaat = await DB.prepare("SELECT id FROM gebruikers WHERE email = ?").bind(data.email).first();
    if (bestaat) return { ok: false as const, message: "An account with this email address already exists. Please log in." };

    const plan = PLANS[b.plan];
    const hash = await hashWachtwoord(data.wachtwoord);
    const res = await DB.prepare(
      `INSERT INTO gebruikers (email, naam, bedrijf, wachtwoord, plan, status, proef_tot, stripe_klant, stripe_abonnement, testmodus)
       VALUES (?, ?, ?, ?, ?, ?, ${plan.proefDagen ? `datetime('now', '+${plan.proefDagen} days')` : "NULL"}, ?, ?, ?)`,
    )
      .bind(data.email, data.naam, data.bedrijf, hash, plan.id, plan.proefDagen ? "proef" : "actief", b.stripe_klant ?? "", b.stripe_abonnement ?? "", b.testmodus)
      .run();
    const id = Number(res.meta?.last_row_id);
    await DB.prepare("UPDATE betalingen SET gebruikt = 1 WHERE token = ?").bind(data.token).run();
    await seedTeam(DB, id);
    await zorgVoorKanaal(DB, id);
    return { ok: true as const };
  });

// 3b. Abonnement (opnieuw) activeren op een bestaand account, bv. na een verlopen proefperiode.
export const activeerAbonnement = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ token: z.string().min(8).max(200) }).parse(v))
  .handler(async ({ data }) => {
    const g = await huidigeGebruiker();
    const { DB } = bindings();
    if (!g || !DB) return { ok: false as const, message: "Please log in first." };
    if (g.rol !== "eigenaar") return { ok: false as const, message: "Only the account owner can change the subscription." };
    const b = await DB.prepare("SELECT plan, status, gebruikt, stripe_klant, stripe_abonnement FROM betalingen WHERE token = ?")
      .bind(data.token)
      .first<{ plan: string; status: string; gebruikt: number; stripe_klant: string | null; stripe_abonnement: string | null }>();
    if (!b || b.status !== "betaald" || b.gebruikt || !isPlan(b.plan)) return { ok: false as const, message: "We couldn’t find your payment." };
    // Switching plans: stop the old Stripe subscription so the customer never pays twice.
    const oud = await DB.prepare("SELECT stripe_abonnement FROM gebruikers WHERE id = ?").bind(g.team_id).first<{ stripe_abonnement: string | null }>();
    const { STRIPE_SECRET_KEY } = bindings();
    if (STRIPE_SECRET_KEY && oud?.stripe_abonnement && b.stripe_abonnement && oud.stripe_abonnement !== b.stripe_abonnement) {
      await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(oud.stripe_abonnement)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      }).catch((e) => console.error("[plan switch] cancel old", e));
    }
    await DB.batch([
      DB.prepare("UPDATE gebruikers SET plan = ?, status = 'actief', proef_tot = NULL, stripe_check = NULL, stripe_klant = COALESCE(NULLIF(?, ''), stripe_klant), stripe_abonnement = COALESCE(NULLIF(?, ''), stripe_abonnement) WHERE id = ?").bind(
        b.plan,
        b.stripe_klant ?? "",
        b.stripe_abonnement ?? "",
        g.team_id,
      ),
      DB.prepare("UPDATE betalingen SET gebruikt = 1 WHERE token = ?").bind(data.token),
    ]);
    return { ok: true as const, message: "" };
  });

// 4. Inloggen / uitloggen
export const inloggen = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ email: z.string().trim().toLowerCase().max(200), wachtwoord: z.string().max(200) }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = bindings();
    if (!DB) return { ok: false as const, message: "Database unavailable." };
    const ipHash = await hashIp(getRequestHeader("cf-connecting-ip") ?? "onbekend");
    if ((await recentCount("chat_log", ipHash, 15)) >= 60) return { ok: false as const, message: "Too many attempts. Please try again in 15 minutes." };
    await DB.prepare("INSERT INTO chat_log (ip_hash) VALUES (?)").bind(ipHash).run();
    const g = await DB.prepare("SELECT id, wachtwoord FROM gebruikers WHERE email = ?").bind(data.email).first<{ id: number; wachtwoord: string }>();
    if (!g || !(await checkWachtwoord(data.wachtwoord, g.wachtwoord))) {
      return { ok: false as const, message: "Incorrect email address or password." };
    }
    await maakSessie(g.id);
    return { ok: true as const };
  });

export const uitloggen = createServerFn({ method: "POST" }).handler(async () => {
  await stopSessie();
  return { ok: true };
});

// 5. Dashboard: alles voor het team in één keer.
export const haalDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const g = await huidigeGebruiker();
  if (!g) return null;
  const { DB } = bindings();
  if (!DB) return null;
  const team = g.team_id;
  // Geen actief abonnement of proefperiode? Dan geen dashboard.
  if (!(await heeftToegang(DB, team))) return { geblokkeerd: true as const };

  // Oudere testaccounts krijgen eenmalig de nieuwe voorbeelddata.
  const heeftGesprekken = await DB.prepare("SELECT id FROM ava_gesprekken WHERE team_id = ? LIMIT 1").bind(team).first();
  if (!heeftGesprekken) {
    const echt = await DB.prepare("SELECT id FROM klant_leads WHERE gebruiker_id = ? AND voorbeeld = 0 LIMIT 1").bind(team).first();
    if (!echt) {
      await DB.prepare("DELETE FROM klant_leads WHERE gebruiker_id = ? AND voorbeeld = 1").bind(team).run();
      await seedTeam(DB, team);
    }
  }
  await zorgVoorKanaal(DB, team);
  // Voorbeeld-livegesprekken blijven "live" zodat je ziet hoe het eruitziet.
  await DB.prepare(
    "UPDATE ava_gesprekken SET laatste = datetime('now', '-' || (id % 3) || ' minutes'), gestart = datetime('now', '-' || (berichten * 2 + id % 3) || ' minutes') WHERE team_id = ? AND voorbeeld = 1 AND status = 'live'",
  )
    .bind(team)
    .run();

  const eigenaar =
    g.rol === "eigenaar"
      ? g
      : await DB.prepare("SELECT plan, status, proef_tot, bedrijf, testmodus FROM gebruikers WHERE id = ?").bind(team).first<{ plan: string; status: string; proef_tot: string | null; bedrijf: string; testmodus: number }>();

  const [leads, afspraken, gesprekken, leden, kanalen] = await Promise.all([
    DB.prepare(
      `SELECT l.id, l.created_at, l.naam, l.onderwerp, l.kanaal, l.status, l.laatste_actie, l.voorbeeld,
              COALESCE(s.warmte, 50) AS warmte, s.reden
       FROM klant_leads l LEFT JOIN lead_scores s ON s.lead_id = l.id
       WHERE l.gebruiker_id = ? AND l.created_at > datetime('now', '-181 days')
       ORDER BY l.created_at DESC LIMIT 1000`,
    )
      .bind(team)
      .all<{ id: number; created_at: string; naam: string; onderwerp: string; kanaal: string; status: string; laatste_actie: string | null; voorbeeld: number; warmte: number; reden: string | null }>(),
    DB.prepare("SELECT id, lead_id, titel, start, eind, locatie, notitie, voorbeeld FROM afspraken WHERE team_id = ? ORDER BY start")
      .bind(team)
      .all<{ id: number; lead_id: number | null; titel: string; start: string; eind: string; locatie: string | null; notitie: string | null; voorbeeld: number }>(),
    DB.prepare(
      "SELECT g.id, g.bezoeker, g.kanaal, g.onderwerp, g.status, g.gestart, g.laatste, g.berichten, g.warmte, g.voorbeeld, m.overgenomen_naam FROM ava_gesprekken g LEFT JOIN ava_gesprek_meta m ON m.gesprek_id = g.id WHERE g.team_id = ? ORDER BY g.laatste DESC LIMIT 30",
    )
      .bind(team)
      .all<{ id: number; bezoeker: string; kanaal: string; onderwerp: string; status: string; gestart: string; laatste: string; berichten: number; warmte: number; voorbeeld: number; overgenomen_naam: string | null }>(),
    DB.prepare(
      `SELECT g.id, g.naam, g.email, COALESCE(t.rol, 'eigenaar') AS rol FROM gebruikers g
       LEFT JOIN team_leden t ON t.gebruiker_id = g.id
       WHERE g.id = ? OR t.team_id = ? ORDER BY g.id`,
    )
      .bind(team, team)
      .all<{ id: number; naam: string; email: string; rol: string }>(),
    DB.prepare("SELECT id, naam FROM kanalen WHERE team_id = ? ORDER BY id").bind(team).all<{ id: number; naam: string }>(),
  ]);

  return {
    gebruiker: {
      ...g,
      plan: eigenaar?.plan ?? g.plan,
      status: eigenaar?.status ?? g.status,
      proef_tot: eigenaar?.proef_tot ?? g.proef_tot,
      bedrijf: eigenaar?.bedrijf ?? g.bedrijf,
    },
    leads: leads.results,
    afspraken: afspraken.results,
    gesprekken: gesprekken.results,
    leden: leden.results,
    kanalen: kanalen.results,
    gebruik: { gesprekken: await (await import("../limieten.server")).gesprekkenDezeMaand(DB, team) },
    nu: new Date().toISOString(),
  };
});

const STATUSSEN = ["nieuw", "opvolging", "offerte", "afspraak", "klant", "verloren"] as const;
export const zetLeadStatus = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int(), status: z.enum(STATUSSEN) }).parse(v))
  .handler(async ({ data }) => {
    const g = await huidigeGebruiker();
    const { DB } = bindings();
    if (!g || !DB) return { ok: false };
    await DB.prepare("UPDATE klant_leads SET status = ? WHERE id = ? AND gebruiker_id = ?").bind(data.status, data.id, g.team_id).run();
    return { ok: true };
  });

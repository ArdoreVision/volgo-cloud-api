import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { hashIp, recentCount } from "../aanvraag.server";
import { checkWachtwoord, hashWachtwoord, huidigeGebruiker, maakSessie, randomToken, stopSessie } from "../auth.server";
import { bindings } from "../bindings.server";
import { SITE_URL, VOLGO_INBOX, esc, mailOpmaak, verstuurMail } from "../mail.server";
import { PLANS, PROEF_PRIJS, isPlan } from "../plans";
import { leesProfiel, profielCompleet } from "../profiel-vragen";
import { beoordeel } from "../wachtwoord";
import { seedTeam, wisVoorbeelden, zorgVoorKanaal } from "../team.server";
import { actieveGebruiker, heeftToegang } from "../toegang.server";

function origin() {
  if (SITE_URL) return SITE_URL;
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
    if (plan.verborgen) return { ok: false as const, message: "This plan is no longer available." };
    const { DB, STRIPE_SECRET_KEY } = bindings();
    if (!DB) return { ok: false as const, message: "Database unavailable." };

    // Logged in (switching plans)? Reuse the Stripe customer and skip the trial.
    const ik = await huidigeGebruiker().catch(() => null);
    const bestaand = ik
      ? await DB.prepare("SELECT stripe_klant, plan, status, stripe_abonnement FROM gebruikers WHERE id = ?")
          .bind(ik.team_id)
          .first<{ stripe_klant: string | null; plan: string; status: string; stripe_abonnement: string | null }>()
      : null;
    // The €1 trial is for first-time customers only: new visitors, or an account that never had a plan (status "nieuw").
    const proefMag = !ik || (bestaand?.status === "nieuw" && !bestaand.stripe_abonnement);
    if (ik && ik.rol !== "eigenaar") return { ok: false as const, message: "Only the account owner can change the plan." };

    // Existing customer with a running Stripe subscription: change the plan in place (prorated, no double billing).
    if (ik && STRIPE_SECRET_KEY) {
      const huidig = await DB.prepare("SELECT stripe_abonnement FROM gebruikers WHERE id = ?").bind(ik.team_id).first<{ stripe_abonnement: string | null }>();
      if (huidig?.stripe_abonnement) {
        try {
          const sub = (await stripe(`subscriptions/${encodeURIComponent(huidig.stripe_abonnement)}`)) as {
            status?: string;
            items?: { data?: { id: string }[] };
          };
          const item = sub.items?.data?.[0]?.id;
          if (item && sub.status && ["active", "trialing", "past_due"].includes(sub.status)) {
            const prod = new URLSearchParams();
            prod.set("name", `Volgo ${plan.naam}`);
            const product = (await stripe("products", { method: "POST", body: prod })) as { id: string };
            const u = new URLSearchParams();
            u.set("items[0][id]", item);
            u.set("items[0][price_data][currency]", "eur");
            u.set("items[0][price_data][product]", product.id);
            u.set("items[0][price_data][unit_amount]", String(plan.prijs));
            u.set("items[0][price_data][recurring][interval]", "month");
            u.set("proration_behavior", "create_prorations");
            // Moving up to a plan with a setup fee: charge it once, on the next invoice.
            if (plan.opstart && !PLANS[(isPlan(bestaand?.plan) ? bestaand.plan : "start") as keyof typeof PLANS].opstart) {
              u.set("add_invoice_items[0][price_data][currency]", "eur");
              u.set("add_invoice_items[0][price_data][product]", product.id);
              u.set("add_invoice_items[0][price_data][unit_amount]", String(plan.opstart));
            }
            if (bindings().BTW === "aan") u.set("automatic_tax[enabled]", "true");
            u.set("metadata[plan]", plan.id);
            await stripe(`subscriptions/${encodeURIComponent(huidig.stripe_abonnement)}`, { method: "POST", body: u });
            await DB.prepare("UPDATE gebruikers SET plan = ?, stripe_check = NULL WHERE id = ?").bind(plan.id, ik.team_id).run();
            return { ok: true as const, url: "/dashboard" };
          }
        } catch (err) {
          console.error("[plan switch]", err);
          return { ok: false as const, message: "Switching plans didn't work right now. Please try again in a minute." };
        }
      }
    }

    if (STRIPE_SECRET_KEY) {
      const b = new URLSearchParams();
      if (bestaand?.stripe_klant) b.set("customer", bestaand.stripe_klant);
      // New customer: their account email is already filled in on the payment page.
      else if (ik?.email) b.set("customer_email", ik.email);
      // Tie a logged-in checkout to this team, so the payment can only activate this account.
      if (ik) {
        b.set("metadata[team_id]", String(ik.team_id));
        b.set("subscription_data[metadata][team_id]", String(ik.team_id));
      }
      b.set("mode", "subscription");
      b.set("locale", "auto"); // Stripe in the customer's browser language (Dutch for Dutch customers)
      b.set("line_items[0][quantity]", "1");
      b.set("line_items[0][price_data][currency]", "eur");
      b.set("line_items[0][price_data][unit_amount]", String(plan.prijs));
      b.set("line_items[0][price_data][recurring][interval]", "month");
      b.set("line_items[0][price_data][product_data][name]", `Volgo ${plan.naam}`);
      if (plan.proefDagen && proefMag) {
        b.set("subscription_data[trial_period_days]", String(plan.proefDagen));
        // The trial is not free: €1 is charged today (one-time, on the first invoice), the full monthly price after the trial.
        b.set("line_items[1][quantity]", "1");
        b.set("line_items[1][price_data][currency]", "eur");
        b.set("line_items[1][price_data][unit_amount]", String(PROEF_PRIJS));
        b.set("line_items[1][price_data][product_data][name]", `Volgo ${plan.naam} · ${plan.proefDagen}-day trial`);
      }
      // One-time setup fee (Complete), on the first invoice next to the first month.
      if (plan.opstart) {
        const n = plan.proefDagen && proefMag ? 2 : 1;
        b.set(`line_items[${n}][quantity]`, "1");
        b.set(`line_items[${n}][price_data][currency]`, "eur");
        b.set(`line_items[${n}][price_data][unit_amount]`, String(plan.opstart));
        b.set(`line_items[${n}][price_data][product_data][name]`, `Volgo ${plan.naam} · one-time setup (website)`);
      }
      b.set("metadata[plan]", plan.id);
      // HCC is zelf de verkoper; Stripe "Managed Payments" (Stripe als verkoper) staat uit.
      b.set("managed_payments[enabled]", "false");
      b.set("adaptive_pricing[enabled]", "false"); // altijd in euro's
      b.set("billing_address_collection", "required");
      b.set("tax_id_collection[enabled]", "true");
      if (bindings().BTW === "aan") {
        b.set("automatic_tax[enabled]", "true");
        if (bestaand?.stripe_klant) {
          b.set("customer_update[address]", "auto");
          b.set("customer_update[name]", "auto");
        }
      }
      b.set("success_url", `${origin()}/signup?session_id={CHECKOUT_SESSION_ID}`);
      b.set("cancel_url", `${origin()}/dashboard`);
      try {
        const s = await stripe("checkout/sessions", { method: "POST", body: b });
        const { push } = await import("../push.server");
        await push(`🛒 Checkout opened: ${plan.naam}`, `Someone is at the Stripe payment page for Volgo ${plan.naam} (€${plan.prijsTekst}/mo${plan.opstart ? ` + €${plan.opstart / 100} setup` : ""})${ik ? " — existing customer switching plans" : ""}.`, { tags: ["shopping_cart"], prioriteit: 3 });
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
        // testmodus = 1 for payments made with a Stripe test key, so they never count as real revenue.
        await DB.prepare("INSERT INTO betalingen (token, plan, status, email, stripe_klant, stripe_abonnement, testmodus) VALUES (?, ?, 'betaald', ?, ?, ?, ?)")
          .bind(data.session_id, meta.plan, details.email ?? "", String(s.customer ?? ""), String(s.subscription ?? ""), s.livemode ? 0 : 1)
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
    const { DB, STRIPE_SECRET_KEY } = bindings();
    if (!DB) return { ok: false as const, message: "Database unavailable." };
    const sterkte = beoordeel(data.wachtwoord, [data.naam, data.bedrijf, data.email]);
    if (!sterkte.ok) return { ok: false as const, message: sterkte.tip };
    const b = await DB.prepare("SELECT plan, status, gebruikt, testmodus, stripe_klant, stripe_abonnement FROM betalingen WHERE token = ?")
      .bind(data.token)
      .first<{ plan: string; status: string; gebruikt: number; testmodus: number; stripe_klant: string | null; stripe_abonnement: string | null }>();
    if (!b || b.status !== "betaald" || b.gebruikt || !isPlan(b.plan) || (STRIPE_SECRET_KEY && b.testmodus && (!b.stripe_abonnement || STRIPE_SECRET_KEY.startsWith("sk_live")))) {
      return { ok: false as const, message: "We couldn’t find your payment. Please choose a plan again." };
    }
    const bestaat = await DB.prepare("SELECT id FROM gebruikers WHERE email = ?").bind(data.email).first();
    if (bestaat) return { ok: false as const, message: "An account with this email address already exists. Please log in." };
    // Claim the payment first: one payment can only ever create one account.
    const claim = await DB.prepare("UPDATE betalingen SET gebruikt = 1 WHERE token = ? AND gebruikt = 0").bind(data.token).run();
    if ((claim.meta?.changes ?? 0) !== 1) return { ok: false as const, message: "This payment has already been used. Please log in." };

    const plan = PLANS[b.plan];
    const hash = await hashWachtwoord(data.wachtwoord);
    const res = await DB.prepare(
      `INSERT INTO gebruikers (email, naam, bedrijf, wachtwoord, plan, status, proef_tot, stripe_klant, stripe_abonnement, testmodus)
       VALUES (?, ?, ?, ?, ?, ?, ${plan.proefDagen ? `datetime('now', '+${plan.proefDagen} days')` : "NULL"}, ?, ?, ?)`,
    )
      .bind(data.email, data.naam, data.bedrijf, hash, plan.id, plan.proefDagen ? "proef" : "actief", b.stripe_klant ?? "", b.stripe_abonnement ?? "", b.testmodus)
      .run();
    const id = Number(res.meta?.last_row_id);
    await seedTeam(DB, id);
    await zorgVoorKanaal(DB, id);
    // Tell the Volgo inbox about every new signup. Never blocks or fails the signup itself.
    await verstuurMail(
      VOLGO_INBOX,
      `New signup: ${data.bedrijf} (${plan.naam})`,
      mailOpmaak(
        `New signup: ${esc(data.bedrijf)}`,
        `<p><strong>${esc(data.naam)}</strong> · ${esc(data.email)}</p>
         <p>Plan: <strong>${plan.naam}</strong>${plan.proefDagen ? ` · ${plan.proefDagen}-day trial (€1)` : ""}${b.testmodus ? " · <em>test payment</em>" : ""}</p>
         <p style="color:#64748b">Account #${id} · ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC</p>`,
        { tekst: "Open admin", url: `${origin()}/admin` },
      ),
    ).catch(() => false);
    {
      const { push } = await import("../push.server");
      await push(
        `🎉 New signup: ${data.bedrijf}`,
        `${data.naam} · ${data.email}\nVolgo ${plan.naam}${plan.proefDagen ? ` · ${plan.proefDagen}-day trial for €1, then €${plan.prijsTekst}/mo` : ` · €${plan.prijsTekst}/mo`}${b.testmodus ? " · TEST" : ""}`,
        { tags: ["tada"], prioriteit: 5, link: `${origin()}/admin` },
      );
    }
    // Straight into the dashboard: no second login.
    await maakSessie(id);
    // proef/test tell the browser whether real money was paid at checkout (only then a "Purchase" goes to the ad pixel).
    return { ok: true as const, plan: plan.id, prijs: plan.prijs / 100, proef: plan.proefDagen > 0, test: Boolean(b.testmodus) };
  });

// 3a. Account aanmaken zonder abonnement: je komt in een dashboard dat op slot zit tot je een plan kiest (7 dagen voor €1).
export const maakAccountZonderPlan = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
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
    const ipHash = await hashIp(getRequestHeader("cf-connecting-ip") ?? "onbekend");
    const { binnenLimiet } = await import("../limiet.server");
    if (!(await binnenLimiet(DB, `signup:${ipHash}`, 60, 5))) return { ok: false as const, message: "Too many new accounts from this network. Please try again later." };
    const sterkte = beoordeel(data.wachtwoord, [data.naam, data.bedrijf, data.email]);
    if (!sterkte.ok) return { ok: false as const, message: sterkte.tip };
    const bestaat = await DB.prepare("SELECT id FROM gebruikers WHERE email = ?").bind(data.email).first();
    if (bestaat) return { ok: false as const, message: "An account with this email address already exists. Please log in." };
    const hash = await hashWachtwoord(data.wachtwoord);
    const res = await DB.prepare(
      "INSERT INTO gebruikers (email, naam, bedrijf, wachtwoord, plan, status, proef_tot, stripe_klant, stripe_abonnement, testmodus) VALUES (?, ?, ?, ?, 'start', 'nieuw', NULL, '', '', 0)",
    )
      .bind(data.email, data.naam, data.bedrijf, hash)
      .run();
    const id = Number(res.meta?.last_row_id);
    await seedTeam(DB, id);
    await zorgVoorKanaal(DB, id);
    await verstuurMail(
      VOLGO_INBOX,
      `New account: ${data.bedrijf} (no plan yet)`,
      mailOpmaak(
        `New account: ${esc(data.bedrijf)}`,
        `<p><strong>${esc(data.naam)}</strong> · ${esc(data.email)}</p>
         <p>Created an account. The dashboard stays locked until they start a plan (7 days for €1).</p>
         <p style="color:#64748b">Account #${id} · ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC</p>`,
        { tekst: "Open admin", url: `${origin()}/admin` },
      ),
    ).catch(() => false);
    {
      const { push } = await import("../push.server");
      await push(`👋 New account: ${data.bedrijf}`, `${data.naam} · ${data.email}\nNo plan yet: dashboard locked until they start 7 days for €1.`, { tags: ["wave"], prioriteit: 4, link: `${origin()}/admin` });
    }
    await maakSessie(id);
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
    const b = await DB.prepare("SELECT plan, status, gebruikt, testmodus, stripe_klant, stripe_abonnement FROM betalingen WHERE token = ?")
      .bind(data.token)
      .first<{ plan: string; status: string; gebruikt: number; testmodus: number; stripe_klant: string | null; stripe_abonnement: string | null }>();
    if (!b || b.status !== "betaald" || b.gebruikt || !isPlan(b.plan)) return { ok: false as const, message: "We couldn’t find your payment." };
    const { STRIPE_SECRET_KEY } = bindings();
    if (STRIPE_SECRET_KEY && b.testmodus && (!b.stripe_abonnement || STRIPE_SECRET_KEY.startsWith("sk_live"))) {
      return { ok: false as const, message: "This was a test payment. Please choose your plan again." };
    }
    // With Stripe: the checkout must have been started for this account (no stacking a new free trial).
    if (STRIPE_SECRET_KEY) {
      const sessie = (await stripe(`checkout/sessions/${encodeURIComponent(data.token)}`).catch(() => null)) as { metadata?: Record<string, string> } | null;
      if (!sessie || sessie.metadata?.team_id !== String(g.team_id)) {
        return { ok: false as const, message: "This payment belongs to another checkout. Please choose your plan again from your dashboard." };
      }
    }
    const claim = await DB.prepare("UPDATE betalingen SET gebruikt = 1 WHERE token = ? AND gebruikt = 0").bind(data.token).run();
    if ((claim.meta?.changes ?? 0) !== 1) return { ok: false as const, message: "This payment has already been used." };
    // First plan on an account that was created without one: this checkout started the €1 trial.
    const voor = await DB.prepare("SELECT status, stripe_abonnement FROM gebruikers WHERE id = ?").bind(g.team_id).first<{ status: string; stripe_abonnement: string | null }>();
    const eerstePlan = voor?.status === "nieuw" && !voor.stripe_abonnement;
    const proefDagen = eerstePlan ? PLANS[b.plan].proefDagen : 0;
    // Reactivating after an old subscription: make sure the old one is stopped, so nobody pays twice.
    const oud = await DB.prepare("SELECT stripe_abonnement FROM gebruikers WHERE id = ?").bind(g.team_id).first<{ stripe_abonnement: string | null }>();
    if (STRIPE_SECRET_KEY && oud?.stripe_abonnement && b.stripe_abonnement && oud.stripe_abonnement !== b.stripe_abonnement) {
      const del = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(oud.stripe_abonnement)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      }).catch(() => null);
      // A subscription that was already canceled answers 404/400: that's fine.
      if (del && !del.ok && del.status >= 500) console.error("[reactivate] old subscription not canceled", oud.stripe_abonnement, del.status);
    }
    await DB.batch([
      DB.prepare(
        `UPDATE gebruikers SET plan = ?, status = '${proefDagen ? "proef" : "actief"}', proef_tot = ${proefDagen ? `datetime('now', '+${proefDagen} days')` : "NULL"}, stripe_check = NULL, stripe_klant = COALESCE(NULLIF(?, ''), stripe_klant), stripe_abonnement = COALESCE(NULLIF(?, ''), stripe_abonnement), testmodus = ? WHERE id = ?`,
      ).bind(
        b.plan,
        b.stripe_klant ?? "",
        b.stripe_abonnement ?? "",
        b.testmodus ? 1 : 0,
        g.team_id,
      ),
    ]);
    if (eerstePlan) {
      const { push } = await import("../push.server");
      await push(`🎉 Plan started: ${PLANS[b.plan].naam}`, `Account #${g.team_id} started Volgo ${PLANS[b.plan].naam}${proefDagen ? ` · ${proefDagen}-day trial for €1` : ""}${b.testmodus ? " · TEST" : ""}`, { tags: ["tada"], prioriteit: 5, link: `${origin()}/admin` });
    }
    return { ok: true as const, message: "", plan: b.plan, prijs: proefDagen ? PROEF_PRIJS / 100 : PLANS[b.plan].prijs / 100, test: Boolean(b.testmodus) };
  });

// 4. Inloggen / uitloggen
export const inloggen = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ email: z.string().trim().toLowerCase().max(200), wachtwoord: z.string().max(200) }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = bindings();
    if (!DB) return { ok: false as const, message: "Database unavailable." };
    const ipHash = await hashIp(getRequestHeader("cf-connecting-ip") ?? "onbekend");
    // Own limits for logging in: per network and per email address (separate from chat traffic).
    const { binnenLimiet } = await import("../limiet.server");
    if (!(await binnenLimiet(DB, `login:${ipHash}`, 15, 30)) || !(await binnenLimiet(DB, `login-mail:${data.email}`, 15, 10))) {
      return { ok: false as const, message: "Too many attempts. Please try again in 15 minutes." };
    }
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
  if (!(await heeftToegang(DB, team))) {
    const s = await DB.prepare("SELECT status FROM gebruikers WHERE id = ?").bind(team).first<{ status: string }>();
    return { geblokkeerd: true as const, nieuw: s?.status === "nieuw", naam: g.naam, eigenaar: g.rol === "eigenaar" };
  }
  // Analytics history follows the plan (twice the range, for the "vs previous period" comparison).
  const analyticsDagen = (await (await import("../limieten.server")).planVoorTeam(DB, team)).limieten.analyticsDagen;

  // No sample data: clear any old example rows so the dashboard only shows real customers.
  await wisVoorbeelden(DB, team);
  await zorgVoorKanaal(DB, team);

  const eigenaar =
    g.rol === "eigenaar"
      ? g
      : await DB.prepare("SELECT plan, status, proef_tot, bedrijf, testmodus FROM gebruikers WHERE id = ?").bind(team).first<{ plan: string; status: string; proef_tot: string | null; bedrijf: string; testmodus: number }>();

  const profiel = await DB.prepare("SELECT foto, functie FROM gebruikers WHERE id = ?").bind(g.id).first<{ foto: string | null; functie: string | null }>();
  // The five profile questions: answered once by the owner before the dashboard opens.
  const avaProfiel = await DB.prepare("SELECT profiel, kanalen_gezien FROM ava_instellingen WHERE team_id = ?").bind(team).first<{ profiel: string | null; kanalen_gezien: number }>();
  const profielKlaar = profielCompleet(leesProfiel(avaProfiel?.profiel));
  const [leads, afspraken, gesprekken, leden, kanalen] = await Promise.all([
    DB.prepare(
      `SELECT l.id, l.created_at, l.naam, l.onderwerp, l.kanaal, l.status, l.laatste_actie, l.voorbeeld, l.gearchiveerd,
              COALESCE(s.warmte, 50) AS warmte, s.reden,
              (SELECT m.herkomst FROM ava_gesprek_meta m WHERE m.lead_id = l.id LIMIT 1) AS herkomst,
              COALESCE((SELECT m.contact FROM ava_gesprek_meta m WHERE m.lead_id = l.id AND m.contact IS NOT NULL LIMIT 1),
                       CASE WHEN l.laatste_actie LIKE 'Contact:%' THEN trim(substr(l.laatste_actie, 9)) END) AS contact
       FROM klant_leads l LEFT JOIN lead_scores s ON s.lead_id = l.id
       WHERE l.gebruiker_id = ? AND l.created_at > datetime('now', ?)
       ORDER BY l.created_at DESC LIMIT 1000`,
    )
      .bind(team, `-${analyticsDagen * 2 + 1} days`)
      .all<{ id: number; created_at: string; naam: string; onderwerp: string; kanaal: string; status: string; laatste_actie: string | null; voorbeeld: number; warmte: number; reden: string | null; herkomst: string | null; contact: string | null; gearchiveerd: number }>(),
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
      foto: profiel?.foto ?? "",
      functie: profiel?.functie ?? "",
    },
    profielKlaar,
    kanalenGezien: Boolean(avaProfiel?.kanalen_gezien),
    leads: leads.results.filter((l) => !l.gearchiveerd),
    archief: leads.results.filter((l) => l.gearchiveerd),
    afspraken: afspraken.results,
    gesprekken: gesprekken.results,
    leden: leden.results,
    kanalen: kanalen.results,
    gebruik: { gesprekken: await (await import("../limieten.server")).gesprekkenDezeMaand(DB, team) },
    nu: new Date().toISOString(),
  };
});

const STATUSSEN = ["nieuw", "opvolging", "offerte", "afspraak", "klant", "verloren"] as const;
/** One lead in full: details, contact, your notes and the Volgo conversation it came from. */
export const haalLead = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ id: z.number().int() }).parse(v))
  .handler(async ({ data }) => {
    const g = await actieveGebruiker().catch(() => null);
    const { DB } = bindings();
    if (!g || !DB) return null;
    const lead = await DB.prepare(
      `SELECT l.id, l.created_at, l.naam, l.onderwerp, l.kanaal, l.status, l.laatste_actie, l.voorbeeld, l.notitie,
              COALESCE(s.warmte, 50) AS warmte, s.reden,
              m.gesprek_id, m.contact, m.herkomst
       FROM klant_leads l LEFT JOIN lead_scores s ON s.lead_id = l.id
       LEFT JOIN ava_gesprek_meta m ON m.lead_id = l.id
       WHERE l.id = ? AND l.gebruiker_id = ? LIMIT 1`,
    )
      .bind(data.id, g.team_id)
      .first<{ id: number; created_at: string; naam: string; onderwerp: string; kanaal: string; status: string; laatste_actie: string | null; voorbeeld: number; notitie: string; warmte: number; reden: string | null; gesprek_id: number | null; contact: string | null; herkomst: string | null }>();
    if (!lead) return null;
    const berichten = lead.gesprek_id
      ? (await DB.prepare("SELECT id, rol, tekst, created_at FROM ava_berichten WHERE gesprek_id = ? ORDER BY id LIMIT 200").bind(lead.gesprek_id).all<{ id: number; rol: string; tekst: string; created_at: string }>()).results
      : [];
    const afspraken = (await DB.prepare("SELECT id, titel, start, eind, locatie FROM afspraken WHERE team_id = ? AND lead_id = ? ORDER BY start").bind(g.team_id, lead.id).all<{ id: number; titel: string; start: string; eind: string; locatie: string | null }>()).results;
    return { lead, berichten, afspraken };
  });

export const bewaarLeadNotitie = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int(), notitie: z.string().max(4000) }).parse(v))
  .handler(async ({ data }) => {
    const g = await actieveGebruiker().catch(() => null);
    const { DB } = bindings();
    if (!g || !DB) return { ok: false as const };
    await DB.prepare("UPDATE klant_leads SET notitie = ? WHERE id = ? AND gebruiker_id = ?").bind(data.notitie.trim(), data.id, g.team_id).run();
    return { ok: true as const };
  });

/** Archive (or restore) a request: hidden from the lists, nothing is lost. */
export const archiveerLead = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int(), aan: z.boolean() }).parse(v))
  .handler(async ({ data }) => {
    const g = await actieveGebruiker().catch(() => null);
    const { DB } = bindings();
    if (!g || !DB) return { ok: false };
    await DB.prepare("UPDATE klant_leads SET gearchiveerd = ? WHERE id = ? AND gebruiker_id = ?").bind(data.aan ? 1 : 0, data.id, g.team_id).run();
    return { ok: true };
  });

/** Delete a request for good. The conversation and appointments stay, without the link to this request. */
export const verwijderLead = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int() }).parse(v))
  .handler(async ({ data }) => {
    const g = await actieveGebruiker().catch(() => null);
    const { DB } = bindings();
    if (!g || !DB) return { ok: false };
    const van = await DB.prepare("SELECT id FROM klant_leads WHERE id = ? AND gebruiker_id = ?").bind(data.id, g.team_id).first();
    if (!van) return { ok: false };
    await DB.batch([
      DB.prepare("UPDATE ava_gesprek_meta SET lead_id = NULL WHERE lead_id = ?").bind(data.id),
      DB.prepare("UPDATE afspraken SET lead_id = NULL WHERE lead_id = ? AND team_id = ?").bind(data.id, g.team_id),
      DB.prepare("DELETE FROM lead_scores WHERE lead_id = ?").bind(data.id),
      DB.prepare("DELETE FROM klant_leads WHERE id = ? AND gebruiker_id = ?").bind(data.id, g.team_id),
    ]);
    return { ok: true };
  });

export const zetLeadStatus = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int(), status: z.enum(STATUSSEN) }).parse(v))
  .handler(async ({ data }) => {
    const g = await actieveGebruiker().catch(() => null);
    const { DB } = bindings();
    if (!g || !DB) return { ok: false };
    await DB.prepare("UPDATE klant_leads SET status = ? WHERE id = ? AND gebruiker_id = ?").bind(data.status, data.id, g.team_id).run();
    return { ok: true };
  });

/** Owner removes a team member (e.g. after moving to a smaller plan). */
export const verwijderLid = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int() }).parse(v))
  .handler(async ({ data }) => {
    const g = await actieveGebruiker().catch(() => null);
    const { DB } = bindings();
    if (!g || !DB) return { ok: false as const, message: "You're logged out." };
    if (g.rol !== "eigenaar") return { ok: false as const, message: "Only the account owner can remove people." };
    if (data.id === g.id) return { ok: false as const, message: "You can't remove yourself." };
    const lid = await DB.prepare("SELECT gebruiker_id FROM team_leden WHERE gebruiker_id = ? AND team_id = ?").bind(data.id, g.team_id).first();
    if (!lid) return { ok: false as const, message: "This person isn't on your team." };
    await DB.batch([
      DB.prepare("DELETE FROM team_leden WHERE gebruiker_id = ? AND team_id = ?").bind(data.id, g.team_id),
      DB.prepare("DELETE FROM sessies WHERE gebruiker_id = ?").bind(data.id),
      DB.prepare("UPDATE gebruikers SET status = 'verwijderd' WHERE id = ?").bind(data.id),
    ]);
    return { ok: true as const, message: "" };
  });

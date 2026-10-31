import type { D1Database } from "@cloudflare/workers-types";

import { huidigeGebruiker } from "./auth.server";
import { bindings } from "./bindings.server";

const OK = ["active", "trialing", "past_due"];

/**
 * Mag dit team het dashboard gebruiken? Alleen met een actief abonnement of een lopende proefperiode.
 * Met Stripe: hooguit elke 6 uur de echte status ophalen, zodat opzeggingen en mislukte betalingen worden opgepikt.
 */
export async function heeftToegang(DB: D1Database, teamId: number) {
  const e = await DB.prepare("SELECT status, proef_tot, stripe_abonnement, stripe_check FROM gebruikers WHERE id = ?")
    .bind(teamId)
    .first<{ status: string; proef_tot: string | null; stripe_abonnement: string | null; stripe_check: string | null }>();
  if (!e) return false;

  const { STRIPE_SECRET_KEY } = bindings();
  const metStripe = Boolean(e.stripe_abonnement && STRIPE_SECRET_KEY);
  const proefLoopt = e.status === "proef" && e.proef_tot && Date.parse(e.proef_tot.replace(" ", "T") + "Z") > Date.now();
  const recentGecheckt = e.stripe_check && Date.now() - Date.parse(e.stripe_check.replace(" ", "T") + "Z") < 6 * 3600 * 1000;

  // Zonder Stripe (testaccounts): alleen de eigen status telt.
  if (!metStripe) {
    if (e.status === "actief" || proefLoopt) return true;
    if (e.status !== "verlopen") await DB.prepare("UPDATE gebruikers SET status = 'verlopen' WHERE id = ?").bind(teamId).run();
    return false;
  }

  if (recentGecheckt) return e.status !== "verlopen";

  try {
    const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(e.stripe_abonnement!)}`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    // Stripe hiccup (rate limit, 5xx)? Keep the current status and try again next time.
    if (!r.ok) return e.status !== "verlopen";
    const s = (await r.json()) as { status?: string };
    const goed = Boolean(s.status && OK.includes(s.status));
    const nieuweStatus = goed ? (s.status === "trialing" ? "proef" : "actief") : "verlopen";
    await DB.prepare("UPDATE gebruikers SET status = ?, stripe_check = datetime('now') WHERE id = ?").bind(nieuweStatus, teamId).run();
    return goed;
  } catch (err) {
    console.error("[toegang stripe]", err);
    return e.status !== "verlopen"; // Stripe even onbereikbaar: klant niet buitensluiten.
  }
}

/** Logged in AND an active subscription or trial. Use for every dashboard action. */
export async function actieveGebruiker() {
  const g = await huidigeGebruiker();
  const { DB } = bindings();
  if (!g || !DB) throw new Error("You're logged out. Please log in again.");
  if (!(await heeftToegang(DB, g.team_id))) throw new Error("Your subscription has ended. Choose a plan to continue.");
  return g;
}

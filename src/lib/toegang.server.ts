import type { D1Database } from "@cloudflare/workers-types";

import { bindings } from "./bindings.server";

/**
 * Mag dit team het dashboard gebruiken? Alleen met een actief abonnement of een lopende proefperiode.
 * Loopt de proef af terwijl Stripe het abonnement gewoon doorzet, dan zetten we het hier op actief.
 */
export async function heeftToegang(DB: D1Database, teamId: number) {
  const e = await DB.prepare("SELECT status, proef_tot, stripe_abonnement FROM gebruikers WHERE id = ?")
    .bind(teamId)
    .first<{ status: string; proef_tot: string | null; stripe_abonnement: string | null }>();
  if (!e) return false;
  if (e.status === "actief") return true;
  if (e.status === "proef" && e.proef_tot && Date.parse(e.proef_tot.replace(" ", "T") + "Z") > Date.now()) return true;

  const { STRIPE_SECRET_KEY } = bindings();
  if (e.stripe_abonnement && STRIPE_SECRET_KEY) {
    try {
      const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(e.stripe_abonnement)}`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      });
      const s = (await r.json()) as { status?: string };
      if (s.status && ["active", "trialing", "past_due"].includes(s.status)) {
        await DB.prepare("UPDATE gebruikers SET status = 'actief' WHERE id = ?").bind(teamId).run();
        return true;
      }
    } catch (err) {
      console.error("[toegang stripe]", err);
      return true; // Stripe even onbereikbaar: klant niet buitensluiten.
    }
  }
  if (e.status !== "verlopen") await DB.prepare("UPDATE gebruikers SET status = 'verlopen' WHERE id = ?").bind(teamId).run();
  return false;
}

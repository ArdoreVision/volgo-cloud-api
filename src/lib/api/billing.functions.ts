import { createServerFn } from "@tanstack/react-start";

import { huidigeGebruiker } from "../auth.server";
import { bindings } from "../bindings.server";
import { SITE_URL } from "../mail.server";

async function stripe(key: string, path: string, body?: URLSearchParams) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body,
  });
  const j = (await r.json()) as Record<string, unknown>;
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

/** Finds (or creates once) a customer-portal configuration: update card, invoices, cancel at period end. */
async function portalConfig(key: string) {
  const list = (await stripe(key, "billing_portal/configurations?active=true&limit=10")) as { data?: { id: string; metadata?: Record<string, string> }[] };
  const eigen = list.data?.find((c) => c.metadata?.app === "volgo");
  if (eigen) return eigen.id;
  const b = new URLSearchParams();
  b.set("business_profile[headline]", "Volgo: manage your subscription");
  b.set("business_profile[privacy_policy_url]", "https://thevolgo.app/privacy");
  b.set("business_profile[terms_of_service_url]", "https://thevolgo.app/terms");
  b.set("features[invoice_history][enabled]", "true");
  b.set("features[payment_method_update][enabled]", "true");
  b.set("features[customer_update][enabled]", "true");
  b.append("features[customer_update][allowed_updates][]", "email");
  b.append("features[customer_update][allowed_updates][]", "address");
  b.append("features[customer_update][allowed_updates][]", "tax_id");
  b.set("features[subscription_cancel][enabled]", "true");
  b.set("features[subscription_cancel][mode]", "at_period_end");
  b.set("metadata[app]", "volgo");
  const c = (await stripe(key, "billing_portal/configurations", b)) as { id: string };
  return c.id;
}

/** Opens the Stripe customer portal for the team owner. */
export const openBillingPortal = createServerFn({ method: "POST" }).handler(async () => {
  const g = await huidigeGebruiker();
  const { DB, STRIPE_SECRET_KEY } = bindings();
  if (!g || !DB) return { ok: false as const, message: "You're logged out. Please log in again." };
  if (g.rol !== "eigenaar") return { ok: false as const, message: "Only the account owner can manage the subscription." };
  const e = await DB.prepare("SELECT stripe_klant FROM gebruikers WHERE id = ?").bind(g.team_id).first<{ stripe_klant: string | null }>();
  if (!STRIPE_SECRET_KEY || !e?.stripe_klant) {
    return { ok: false as const, message: "This is a test account without a card on file. Email volgo.app@outlook.com to change or cancel." };
  }
  try {
    const b = new URLSearchParams();
    b.set("customer", e.stripe_klant);
    b.set("return_url", `${SITE_URL}/dashboard?tab=instellingen&sub=abonnement`);
    b.set("configuration", await portalConfig(STRIPE_SECRET_KEY));
    b.set("locale", "en");
    const s = (await stripe(STRIPE_SECRET_KEY, "billing_portal/sessions", b)) as { url: string };
    return { ok: true as const, url: s.url };
  } catch (err) {
    console.error("[billing portal]", err);
    return { ok: false as const, message: "The billing page is unavailable right now. Please try again in a minute." };
  }
});

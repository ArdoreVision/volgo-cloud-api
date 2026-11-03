// Stripe webhooks: subscription changes reach Volgo within seconds instead of at the next 6-hourly check.
// Every event is verified (signature + timestamp) and processed at most once (stripe_events table).
import type { D1Database } from "@cloudflare/workers-types";

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

/** Statuses that keep the dashboard open. Everything else closes it (until the customer picks a plan again). */
const OPEN = ["active", "trialing", "past_due"];

export async function verifieerHandtekening(body: string, header: string | null, secret: string, nu = Date.now(), tolerantieSec = 300) {
  if (!header) return false;
  const delen = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  const t = Number(delen.t);
  const v1 = delen.v1;
  if (!t || !v1) return false;
  if (Math.abs(nu / 1000 - t) > tolerantieSec) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const verwacht = hex(await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${body}`)));
  if (verwacht.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < verwacht.length; i++) diff |= verwacht.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

type Sub = { id: string; status?: string; customer?: string; metadata?: Record<string, string>; items?: { data?: { price?: { recurring?: { interval?: string } } }[] } };
type Event = { id: string; type: string; livemode?: boolean; data?: { object?: Record<string, unknown> } };

/** What a subscription status means for the account. */
export function statusVoor(subStatus: string | undefined) {
  if (!subStatus) return null;
  if (!OPEN.includes(subStatus)) return "verlopen";
  return subStatus === "trialing" ? "proef" : "actief";
}

/**
 * Applies one event. Returns what happened, for the log. Safe to call twice with the same event: the second
 * call sees the id in stripe_events and does nothing.
 */
export async function verwerkStripeEvent(DB: D1Database, event: Event): Promise<string> {
  if (!event?.id || !event.type) return "ignored: no id";
  if (await DB.prepare("SELECT id FROM stripe_events WHERE id = ?").bind(event.id).first()) return "duplicate";
  const uitkomst = await pasToe(DB, event);
  // Recorded only after the change went through, so a failed attempt is retried by Stripe and not skipped as "done".
  await DB.prepare("INSERT OR IGNORE INTO stripe_events (id, type) VALUES (?, ?)").bind(event.id, event.type).run();
  return uitkomst;
}

async function pasToe(DB: D1Database, event: Event): Promise<string> {
  const obj = (event.data?.object ?? {}) as Record<string, unknown>;
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted" || event.type === "customer.subscription.created") {
    const sub = obj as unknown as Sub;
    const status = event.type === "customer.subscription.deleted" ? "verlopen" : statusVoor(sub.status);
    if (!status) return "ignored: no status";
    const plan = sub.metadata?.plan && ["start", "pro", "premium"].includes(sub.metadata.plan) ? sub.metadata.plan : null;
    const r = await DB.prepare(
      `UPDATE gebruikers SET status = ?, stripe_check = datetime('now'), proef_tot = NULL${plan ? ", plan = ?" : ""}
       WHERE stripe_abonnement = ? AND stripe_abonnement != ''`,
    )
      .bind(...(plan ? [status, plan, sub.id] : [status, sub.id]))
      .run();
    return `${event.type}: ${r.meta?.changes ?? 0} account(s) → ${status}`;
  }
  if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
    const subId = typeof obj.subscription === "string" ? obj.subscription : (obj.subscription as { id?: string } | undefined)?.id;
    if (!subId) return "ignored: no subscription";
    // A failed payment does not close the account by itself (Stripe retries, status becomes past_due); a paid invoice reopens it.
    if (event.type === "invoice.paid") {
      const r = await DB.prepare("UPDATE gebruikers SET status = 'actief', stripe_check = datetime('now') WHERE stripe_abonnement = ? AND status = 'verlopen'").bind(subId).run();
      return `invoice.paid: ${r.meta?.changes ?? 0} account(s) reopened`;
    }
    await DB.prepare("UPDATE gebruikers SET stripe_check = NULL WHERE stripe_abonnement = ?").bind(subId).run();
    return "invoice.payment_failed: status will be re-checked with Stripe on the next visit";
  }
  return `ignored: ${event.type}`;
}

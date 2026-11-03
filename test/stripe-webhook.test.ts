import { describe, expect, it } from "vitest";

import { statusVoor, verifieerHandtekening, verwerkStripeEvent } from "@/lib/stripe-webhook.server";

import { maakDb, maakTeam } from "./d1";

const SECRET = "whsec_test_123";
async function teken(body: string, t = Math.floor(Date.now() / 1000), secret = SECRET) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`)))].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `t=${t},v1=${sig}`;
}

describe("Stripe webhook", () => {
  it("accepts a correctly signed, fresh event and nothing else", async () => {
    const body = JSON.stringify({ id: "evt_1", type: "x" });
    expect(await verifieerHandtekening(body, await teken(body), SECRET)).toBe(true);
    expect(await verifieerHandtekening(body, await teken(body, undefined, "other"), SECRET)).toBe(false);
    expect(await verifieerHandtekening(body + " ", await teken(body), SECRET)).toBe(false);
    expect(await verifieerHandtekening(body, await teken(body, Math.floor(Date.now() / 1000) - 600), SECRET)).toBe(false); // older than 5 minutes
    expect(await verifieerHandtekening(body, null, SECRET)).toBe(false);
    expect(await verifieerHandtekening(body, "t=abc,v1=", SECRET)).toBe(false);
  });

  it("maps subscription statuses to account statuses", () => {
    expect(statusVoor("active")).toBe("actief");
    expect(statusVoor("past_due")).toBe("actief");
    expect(statusVoor("trialing")).toBe("proef");
    expect(statusVoor("canceled")).toBe("verlopen");
    expect(statusVoor("unpaid")).toBe("verlopen");
    expect(statusVoor(undefined)).toBeNull();
  });

  it("closes the account on cancellation, reopens on payment, changes the plan, and handles every event once", async () => {
    const DB = maakDb();
    const team = await maakTeam(DB);
    await DB.prepare("UPDATE gebruikers SET stripe_abonnement = 'sub_1', stripe_klant = 'cus_1' WHERE id = ?").bind(team).run();
    const status = async () => (await DB.prepare("SELECT status, plan FROM gebruikers WHERE id = ?").bind(team).first<{ status: string; plan: string }>())!;

    expect(await verwerkStripeEvent(DB, { id: "evt_a", type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "canceled" } } })).toMatch(/1 account/);
    expect((await status()).status).toBe("verlopen");
    // Same event delivered again: nothing happens, no error.
    expect(await verwerkStripeEvent(DB, { id: "evt_a", type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "canceled" } } })).toBe("duplicate");

    expect(await verwerkStripeEvent(DB, { id: "evt_b", type: "invoice.paid", data: { object: { subscription: "sub_1" } } })).toMatch(/1 account/);
    expect((await status()).status).toBe("actief");

    await verwerkStripeEvent(DB, { id: "evt_c", type: "customer.subscription.updated", data: { object: { id: "sub_1", status: "active", metadata: { plan: "pro" } } } });
    expect(await status()).toEqual({ status: "actief", plan: "pro" });
    // Unknown plan in metadata is ignored, status still applied.
    await verwerkStripeEvent(DB, { id: "evt_d", type: "customer.subscription.updated", data: { object: { id: "sub_1", status: "unpaid", metadata: { plan: "gold" } } } });
    expect(await status()).toEqual({ status: "verlopen", plan: "pro" });
    // Events for a subscription Volgo doesn't know touch nothing.
    expect(await verwerkStripeEvent(DB, { id: "evt_e", type: "customer.subscription.deleted", data: { object: { id: "sub_other", status: "canceled" } } })).toMatch(/0 account/);
    expect(await verwerkStripeEvent(DB, { id: "evt_f", type: "charge.succeeded", data: { object: {} } })).toMatch(/ignored/);
  });
});

import { createFileRoute } from "@tanstack/react-router";

import { bindings } from "@/lib/bindings.server";
import { verifieerHandtekening, verwerkStripeEvent } from "@/lib/stripe-webhook.server";

/**
 * Stripe → Volgo. Configure in Stripe: endpoint https://thevolgo.app/api/stripe with the events
 * customer.subscription.created/updated/deleted, invoice.paid and invoice.payment_failed; put the signing
 * secret in STRIPE_WEBHOOK_SECRET. Without that secret this endpoint refuses everything (the 6-hourly check keeps working).
 */
export const Route = createFileRoute("/api/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { DB, STRIPE_WEBHOOK_SECRET } = bindings();
        if (!DB) return new Response("Unavailable", { status: 503 });
        if (!STRIPE_WEBHOOK_SECRET) return new Response("Webhook not configured", { status: 503 });
        const body = await request.text();
        if (!(await verifieerHandtekening(body, request.headers.get("stripe-signature"), STRIPE_WEBHOOK_SECRET))) {
          return new Response("Bad signature", { status: 400 });
        }
        let event: Parameters<typeof verwerkStripeEvent>[1];
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        try {
          const uitkomst = await verwerkStripeEvent(DB, event);
          console.log("[stripe webhook]", event.type, uitkomst);
          return new Response(JSON.stringify({ ok: true, uitkomst }), { status: 200, headers: { "content-type": "application/json" } });
        } catch (err) {
          // 500 makes Stripe retry later; the event id was not recorded as processed in that case only if the insert itself failed.
          console.error("[stripe webhook]", err);
          return new Response("Error", { status: 500 });
        }
      },
    },
  },
});

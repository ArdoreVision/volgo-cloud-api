import { createFileRoute } from "@tanstack/react-router";

import { betaalPagina, controleerBetaald, haalVerzoek, startCheckout } from "@/lib/betaal.server";
import { bindings } from "@/lib/bindings.server";

const CSP = "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self' https://checkout.stripe.com; frame-ancestors 'none'; base-uri 'none'";
const html = (h: string, status = 200) => new Response(h, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "x-volgo-csp": CSP } });
const niet = () => html("<!doctype html><meta charset=utf-8><body style='font-family:system-ui;padding:48px;text-align:center'><h1>Not found</h1>", 404);

export const Route = createFileRoute("/api/betaal/$token")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { DB } = bindings();
        if (!DB) return niet();
        const r = await haalVerzoek(DB, params.token.slice(0, 64));
        if (!r) return niet();
        const s = new URL(request.url).searchParams.get("s");
        if (s && (await controleerBetaald(DB, r.v, r.b, s))) r.v.status = "betaald";
        return html(betaalPagina(r.v, r.b));
      },
      POST: async ({ request, params }) => {
        const { DB } = bindings();
        if (!DB) return niet();
        const r = await haalVerzoek(DB, params.token.slice(0, 64));
        if (!r) return niet();
        if (r.v.status !== "open" || !r.b.stripe_sleutel) return html(betaalPagina(r.v, r.b));
        const url = await startCheckout(DB, r.v, r.b, new URL(request.url).origin).catch(() => null);
        if (!url) return html(betaalPagina(r.v, r.b, r.b.taal === "en" ? "Paying online isn't possible right now. Please try again later." : "Online betalen lukt nu even niet. Probeer het later nog eens."));
        return Response.redirect(url, 303);
      },
    },
  },
});

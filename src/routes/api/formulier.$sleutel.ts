import { createFileRoute } from "@tanstack/react-router";

import { hashIp } from "@/lib/aanvraag.server";
import { instellingenViaSleutel } from "@/lib/ava.server";
import { bindings } from "@/lib/bindings.server";

// Contact form on a customer's website → a conversation in the Volgo inbox.
// Works as a plain HTML form (redirects back) and with fetch/JSON.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };

function terug(request: Request, ok: boolean, json: boolean) {
  if (json) return new Response(JSON.stringify({ ok }), { status: ok ? 200 : 400, headers: { "Content-Type": "application/json", ...CORS } });
  const ref = request.headers.get("referer");
  if (ref && /^https?:\/\//.test(ref)) {
    const u = new URL(ref);
    u.searchParams.set("volgo", ok ? "verzonden" : "fout");
    return Response.redirect(u.toString(), 303);
  }
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;padding:40px;text-align:center"><h1>${ok ? "Thanks, your message was sent." : "Please fill in your name, contact details and message."}</h1></body>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/formulier/$sleutel")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request, params }) => {
        const { DB } = bindings();
        const isJson = (request.headers.get("content-type") ?? "").includes("json");
        if (!DB) return terug(request, false, isJson);
        let v: Record<string, string> = {};
        try {
          if (isJson) v = (await request.json()) as Record<string, string>;
          else v = Object.fromEntries([...(await request.formData()).entries()].map(([k, x]) => [k, String(x)]));
        } catch {
          return terug(request, false, isJson);
        }
        // Honeypot: bots fill in every field.
        if (v.website || v._gotcha) return terug(request, true, isJson);
        const inst = await instellingenViaSleutel(DB, params.sleutel);
        if (!inst) return terug(request, false, isJson);
        const s = (k: string[]) => k.map((x) => String(v[x] ?? "").trim()).find(Boolean) ?? "";
        const naam = s(["naam", "name", "voornaam", "firstname"]).slice(0, 100);
        const contact = [s(["email", "e-mail", "mail"]), s(["telefoon", "phone", "tel", "telefoonnummer"])].filter(Boolean).join(" · ").slice(0, 160) || s(["contact"]).slice(0, 160);
        const bericht = s(["bericht", "message", "vraag", "opmerking", "tekst"]).slice(0, 4000);
        const extra = Object.entries(v)
          .filter(([k, x]) => x && !["naam", "name", "voornaam", "firstname", "email", "e-mail", "mail", "telefoon", "phone", "tel", "telefoonnummer", "contact", "bericht", "message", "vraag", "opmerking", "tekst", "website", "_gotcha"].includes(k))
          .slice(0, 10)
          .map(([k, x]) => `${k}: ${String(x).slice(0, 200)}`)
          .join("\n");
        if (!contact || (!bericht && !extra)) return terug(request, false, isJson);
        const { binnenLimiet } = await import("@/lib/limiet.server");
        const ip = await hashIp(request.headers.get("cf-connecting-ip") ?? "x");
        if (!(await binnenLimiet(DB, `f:${inst.team_id}:${ip}`, 60, 5)) || !(await binnenLimiet(DB, `ft:${inst.team_id}`, 60, 60))) return terug(request, false, isJson);
        const { nieuwBinnen } = await import("@/lib/inbox.server");
        await nieuwBinnen(DB, inst.team_id, { kanaal: "Contactformulier", naam, contact, tekst: [bericht, extra].filter(Boolean).join("\n\n") });
        return terug(request, true, isJson);
      },
    },
  },
});

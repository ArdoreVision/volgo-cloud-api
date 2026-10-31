import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { hashIp } from "@/lib/aanvraag.server";
import { agendaVoorChat, boekViaChat, instellingenViaSleutel, pollGesprek, verwerkBericht } from "@/lib/ava.server";
import { bindings } from "@/lib/bindings.server";

// Openbare API voor de AVA-chat op websites van klanten (aangeroepen door /ava.js).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS } });

const schema = z.discriminatedUnion("actie", [
  z.object({ actie: z.literal("config"), sleutel: z.string().max(64) }),
  z.object({ actie: z.literal("poll"), sleutel: z.string().max(64), token: z.string().max(64), na_id: z.number().int().min(0) }),
  z.object({ actie: z.literal("bericht"), sleutel: z.string().max(64), token: z.string().max(64).optional(), tekst: z.string().trim().min(1).max(1500) }),
  z.object({ actie: z.literal("agenda"), sleutel: z.string().max(64), token: z.string().max(64).optional() }),
  z.object({
    actie: z.literal("boek"),
    sleutel: z.string().max(64),
    token: z.string().max(64).optional(),
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    soort: z.string().max(20),
    naam: z.string().trim().min(2).max(100),
    contact: z.string().trim().min(5).max(120),
    adres: z.string().trim().max(160).optional(),
  }),
]);

export const Route = createFileRoute("/api/ava")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const { DB } = bindings();
        if (!DB) return json({ fout: "Unavailable" }, 503);
        let body: z.infer<typeof schema>;
        try {
          body = schema.parse(await request.json());
        } catch {
          return json({ fout: "Invalid request" }, 400);
        }
        const inst = await instellingenViaSleutel(DB, body.sleutel);
        if (!inst) return json({ fout: "Unknown key" }, 404);
        // No active subscription or trial? Then the chat is switched off on the website.
        const { heeftToegang } = await import("@/lib/toegang.server");
        const actief = await heeftToegang(DB, inst.team_id);
        if (!actief) {
          if (body.actie === "config") return json({ uit: true });
          if (body.actie === "poll") return json({ berichten: [], mens: null, laatste_id: body.na_id });
          if (body.actie === "agenda" || body.actie === "boek") return json({ ok: false, reden: "Booking is not available right now. Please contact the business directly.", dagen: [] });
          return json({ antwoord: "Sorry, this chat is not available right now. Please contact the business directly." });
        }
        if (body.actie === "config") {
          const { actieveStijl } = await import("@/lib/stijl.server");
          const stijl = await actieveStijl(DB, inst.team_id);
          return json({ naam: inst.naam, begroeting: inst.begroeting, kleur: inst.kleur, bedrijf: inst.bedrijf, boeken: Boolean(inst.boeken), ...stijl });
        }
        if (body.actie === "poll") {
          return json(await pollGesprek(DB, inst.team_id, body.token, body.na_id));
        }
        if (body.actie === "agenda") {
          if (!inst.boeken) return json({ dagen: [], soorten: [] });
          return json(await agendaVoorChat(DB, inst, body.token));
        }
        const ipHash = await hashIp(request.headers.get("cf-connecting-ip") ?? "onbekend");
        const { binnenLimiet } = await import("@/lib/limiet.server");
        // Anti-spam: messages per visitor, and new conversations per visitor per business.
        if (!(await binnenLimiet(DB, `w:${ipHash}`, 60, 80))) return json({ antwoord: "You've sent a lot of messages. Please try again in a little while." });
        if (!body.token && !(await binnenLimiet(DB, `wn:${inst.team_id}:${ipHash}`, 60, 6))) {
          return json({ antwoord: "You've started several chats in a short time. Please continue in your earlier chat or try again later." });
        }
        if (body.actie === "boek") {
          if (!inst.boeken) return json({ ok: false, reden: "Booking is switched off for this business." });
          if (!(await binnenLimiet(DB, `wb:${inst.team_id}:${ipHash}`, 60, 3))) return json({ ok: false, reden: "You've booked several appointments already. Please contact the business directly." });
          return json(await boekViaChat(DB, inst, body.token, body));
        }
        const res = await verwerkBericht(DB, inst, body.token, body.tekst);
        return json(res);
      },
    },
  },
});

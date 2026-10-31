import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { hashIp, recentCount } from "@/lib/aanvraag.server";
import { instellingenViaSleutel, verwerkBericht } from "@/lib/ava.server";
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
  z.object({ actie: z.literal("bericht"), sleutel: z.string().max(64), token: z.string().max(64).optional(), tekst: z.string().trim().min(1).max(1500) }),
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
        if (body.actie === "config") {
          return json({ naam: inst.naam, begroeting: inst.begroeting, kleur: inst.kleur, bedrijf: inst.bedrijf });
        }
        const ipHash = await hashIp(request.headers.get("cf-connecting-ip") ?? "onbekend");
        if ((await recentCount("chat_log", ipHash, 60)) >= 80) return json({ antwoord: "You've sent a lot of messages. Please try again in a little while." });
        await DB.prepare("INSERT INTO chat_log (ip_hash) VALUES (?)").bind(ipHash).run();
        const res = await verwerkBericht(DB, inst, body.token, body.tekst);
        return json(res);
      },
    },
  },
});

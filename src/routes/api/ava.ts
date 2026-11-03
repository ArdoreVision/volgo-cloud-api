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
  z.object({
    actie: z.literal("bericht"),
    sleutel: z.string().max(64),
    token: z.string().max(64).optional(),
    tekst: z.string().trim().min(1).max(1500),
    sessie: z.string().max(40).optional(),
    toestemming: z.boolean().optional(),
  }),
  z.object({ actie: z.literal("agenda"), sleutel: z.string().max(64), token: z.string().max(64).optional() }),
  // Website analytics (no cookies): a page view, its time on page / scroll depth, and chat events.
  z.object({
    actie: z.literal("view"),
    sleutel: z.string().max(64),
    sessie: z.string().min(6).max(40),
    pad: z.string().max(500),
    titel: z.string().max(300).optional(),
    ref: z.string().max(500).optional(),
    utm: z.string().max(80).optional(),
    ad: z
      .object({
        bron: z.string().max(120).optional(),
        medium: z.string().max(120).optional(),
        campagne: z.string().max(120).optional(),
        adset: z.string().max(120).optional(),
        advertentie: z.string().max(120).optional(),
        plaatsing: z.string().max(120).optional(),
        klik: z.string().max(200).optional(),
      })
      .optional(),
    host: z.string().max(200).optional(),
    breedte: z.number().int().min(0).max(10000).optional(),
    toestemming: z.boolean().optional(),
    vast: z.string().max(40).optional(),
    taal: z.string().max(20).optional(),
  }),
  z.object({ actie: z.literal("ping"), sleutel: z.string().max(64), sessie: z.string().min(6).max(40), id: z.number().int().min(1), duur: z.number().min(0).max(100000), scroll: z.number().min(0).max(100) }),
  z.object({ actie: z.literal("event"), sleutel: z.string().max(64), sessie: z.string().min(6).max(40), soort: z.enum(["chat_open", "chat_bericht", "agenda_open", "geboekt", "lead"]) }),
  z.object({
    actie: z.literal("boek"),
    sleutel: z.string().max(64),
    token: z.string().max(64).optional(),
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    soort: z.string().max(20),
    naam: z.string().trim().min(2).max(100),
    contact: z.string().trim().min(5).max(120),
    adres: z.string().trim().max(160).optional(),
    sessie: z.string().max(40).optional(),
    toestemming: z.boolean().optional(),
  }),
]);

/** Links a chat to the visit it came from (pages viewed), and with permission: where the visitor is and on what device. */
async function koppel(DB: NonNullable<ReturnType<typeof bindings>["DB"]>, request: Request, token: string | undefined, sessie?: string, toestemming?: boolean) {
  if (!token || !sessie) return;
  const v = await import("@/lib/verkeer.server");
  const herkomst = toestemming ? v.herkomstTekst(request.headers, request.headers.get("user-agent") ?? "") : null;
  const ad = await v.advertentieVanSessie(DB, sessie);
  await DB.prepare("UPDATE ava_gesprek_meta SET sessie = COALESCE(sessie, ?), herkomst = COALESCE(herkomst, ?), advertentie = COALESCE(advertentie, ?) WHERE token = ?").bind(sessie, herkomst, ad, token).run();
}

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
          if (body.actie === "view" || body.actie === "ping" || body.actie === "event") return json({ ok: false });
          return json({ antwoord: "Sorry, this chat is not available right now. Please contact the business directly." });
        }
        if (body.actie === "config") {
          const { actieveStijl } = await import("@/lib/stijl.server");
          const stijl = await actieveStijl(DB, inst.team_id);
          return json({ naam: inst.naam, begroeting: inst.begroeting, kleur: inst.kleur, bedrijf: inst.bedrijf, boeken: Boolean(inst.boeken), toestemming: Boolean(inst.toestemming), ...stijl });
        }
        if (body.actie === "poll") {
          return json(await pollGesprek(DB, inst.team_id, body.token, body.na_id));
        }
        if (body.actie === "view" || body.actie === "ping" || body.actie === "event") {
          const v = await import("@/lib/verkeer.server");
          if (body.actie === "ping") {
            await v.updateView(DB, inst.team_id, body.id, body.sessie, body.duur, body.scroll);
            return json({ ok: true });
          }
          if (body.actie === "event") {
            await v.slaEventOp(DB, inst.team_id, body.sessie, body.soort);
            return json({ ok: true });
          }
          const ip = request.headers.get("cf-connecting-ip") ?? "onbekend";
          const ua = request.headers.get("user-agent") ?? "";
          if (/bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(ua)) return json({ ok: false });
          const { binnenLimiet } = await import("@/lib/limiet.server");
          if (!(await binnenLimiet(DB, `sv:${await hashIp(ip)}`, 60, 400))) return json({ ok: false });
          const { ANTHROPIC_API_KEY } = bindings();
          const plek = v.locatieVan(request.headers);
          const id = await v.slaViewOp(DB, {
            toestemming: body.toestemming,
            vast: body.vast,
            stad: plek.stad,
            regio: plek.regio,
            browser: v.browserVan(ua),
            os: v.osVan(ua),
            taal: body.taal,
            team: inst.team_id,
            bezoeker: await v.bezoekerId(ip, ua, inst.team_id, (ANTHROPIC_API_KEY ?? "volgo").slice(-24)),
            sessie: body.sessie,
            pad: body.pad || "/",
            titel: body.titel ?? "",
            bron: v.bronVan(body.ref, body.utm, body.host ?? ""),
            apparaat: v.apparaatVan(ua, body.breedte),
            land: request.headers.get("cf-ipcountry") ?? "",
            ad: body.ad ? { ...body.ad, klik: body.toestemming ? body.ad.klik : undefined } : undefined,
          });
          return json({ ok: true, id });
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
          const geboekt = await boekViaChat(DB, inst, body.token, body);
          await koppel(DB, request, geboekt.token, body.sessie, body.toestemming);
          return json(geboekt);
        }
        const res = await verwerkBericht(DB, inst, body.token, body.tekst);
        await koppel(DB, request, res.token, body.sessie, body.toestemming);
        return json(res);
      },
    },
  },
});

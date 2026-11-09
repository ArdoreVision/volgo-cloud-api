import { createFileRoute } from "@tanstack/react-router";

import { bindings } from "@/lib/bindings.server";

/**
 * WhatsApp Business Platform webhook (Meta Cloud API).
 * GET: Meta verifies the webhook with hub.verify_token.
 * POST: incoming messages, signed with the app secret (X-Hub-Signature-256). Unsigned calls are refused.
 * The business is found by the phone number ID Meta sends (metadata.phone_number_id = ava_instellingen.wa_phone_id).
 */
type WaBericht = {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string; filename?: string };
  button?: { text: string };
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
};
type WaWebhook = {
  entry?: { changes?: { value?: { metadata?: { phone_number_id?: string }; contacts?: { wa_id: string; profile?: { name?: string } }[]; messages?: WaBericht[] } }[] }[];
};

function tekstVan(m: WaBericht) {
  switch (m.type) {
    case "text":
      return m.text?.body ?? "";
    case "image":
      return `[Foto]${m.image?.caption ? ` ${m.image.caption}` : ""} (bekijk de foto in WhatsApp)`;
    case "video":
      return `[Video]${m.video?.caption ? ` ${m.video.caption}` : ""} (bekijk de video in WhatsApp)`;
    case "audio":
      return "[Spraakbericht] (luister het af in WhatsApp)";
    case "document":
      return `[Document] ${m.document?.filename ?? ""}${m.document?.caption ? ` ${m.document.caption}` : ""}`.trim();
    case "location":
      return `[Locatie] ${[m.location?.name, m.location?.address].filter(Boolean).join(", ") || `${m.location?.latitude}, ${m.location?.longitude}`}`;
    case "button":
      return m.button?.text ?? "";
    case "interactive":
      return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
    default:
      return `[${m.type}]`;
  }
}

export const Route = createFileRoute("/api/whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const q = new URL(request.url).searchParams;
        const { WHATSAPP_VERIFY_TOKEN } = bindings();
        if (WHATSAPP_VERIFY_TOKEN && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === WHATSAPP_VERIFY_TOKEN)
          return new Response(q.get("hub.challenge") ?? "", { headers: { "Content-Type": "text/plain" } });
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const ruw = await request.text();
        const { metaHandtekeningKlopt } = await import("@/lib/kanalen.server");
        if (!(await metaHandtekeningKlopt(ruw, request.headers.get("x-hub-signature-256")))) return new Response("Forbidden", { status: 403 });
        const { DB } = bindings();
        if (!DB) return new Response("ok");
        let body: WaWebhook;
        try {
          body = JSON.parse(ruw) as WaWebhook;
        } catch {
          return new Response("ok");
        }
        const { berichtBinnen } = await import("@/lib/inbox.server");
        const { normNummer } = await import("@/lib/kanalen.server");
        for (const e of body.entry ?? [])
          for (const c of e.changes ?? []) {
            const v = c.value;
            const phoneId = v?.metadata?.phone_number_id;
            if (!phoneId || !v?.messages?.length) continue; // status updates (sent/delivered/read) are ignored
            const t = await DB.prepare("SELECT team_id FROM ava_instellingen WHERE wa_phone_id = ?").bind(phoneId).first<{ team_id: number }>();
            if (!t) continue;
            for (const m of v.messages) {
              if (await DB.prepare("SELECT 1 FROM whatsapp_ontvangen WHERE wamid = ?").bind(m.id).first()) continue; // Meta retried this one
              const naam = v.contacts?.find((x) => x.wa_id === m.from)?.profile?.name ?? "";
              const van = normNummer(`+${m.from}`) || `+${m.from}`;
              const tekst = tekstVan(m).trim();
              // Claim it first; if saving fails, release it so Meta's retry is processed.
              const claim = await DB.prepare("INSERT OR IGNORE INTO whatsapp_ontvangen (wamid) VALUES (?)").bind(m.id).run();
              if (!claim.meta?.changes) continue;
              try {
                if (tekst) await berichtBinnen(DB, t.team_id, { kanaal: "WhatsApp", van, naam, tekst });
              } catch (err) {
                await DB.prepare("DELETE FROM whatsapp_ontvangen WHERE wamid = ?").bind(m.id).run();
                throw err;
              }
            }
          }
        // Meta expects a fast 200; anything else makes it retry.
        return new Response("ok");
      },
    },
  },
});

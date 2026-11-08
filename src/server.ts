import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { applySecurityHeaders } from "./lib/security-headers.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  // Dagelijkse taak (zie "triggers" in wrangler.jsonc): ochtendsamenvatting per mail.
  /**
   * Incoming email (Cloudflare Email Routing → this worker):
   * - r-<token>@thevolgo.app: a visitor replied to a Volgo message → added to their conversation
   * - inbox-<key>@thevolgo.app: a business forwards its mail to Volgo → a new conversation in its inbox
   */
  async email(message: { from: string; to: string; raw: ReadableStream; setReject: (r: string) => void }) {
    try {
      const [{ default: PostalMime }, b, inbox] = await Promise.all([import("postal-mime"), import("./lib/bindings.server"), import("./lib/inbox.server")]);
      const { DB } = b.bindings();
      if (!DB) return;
      const mail = await PostalMime.parse(message.raw);
      const tekst = inbox.schoonAntwoord(mail.text || (mail.html ?? "").replace(/<[^>]+>/g, " ")).slice(0, 4000);
      const aan = message.to.toLowerCase();
      const r = aan.match(/^r-([a-f0-9]{16,64})@/);
      if (r) {
        if (tekst) await inbox.antwoordBinnen(DB, r[1], tekst);
        return;
      }
      const k = aan.match(/^inbox-([a-z0-9]{8,64})@/);
      if (k) {
        const t = await DB.prepare("SELECT team_id FROM ava_instellingen WHERE sleutel = ?").bind(k[1]).first<{ team_id: number }>();
        if (!t) return message.setReject("Unknown address");
        const van = mail.replyTo?.[0]?.address || mail.from?.address || message.from;
        await inbox.nieuwBinnen(DB, t.team_id, { kanaal: "E-mail", naam: mail.from?.name || "", contact: van, tekst: tekst || "(empty email)", onderwerp: mail.subject || "" });
        return;
      }
      message.setReject("Unknown address");
    } catch (e) {
      console.error("[email]", e);
    }
  },
  async scheduled(_event: unknown, _env: unknown, ctx: { waitUntil: (p: Promise<unknown>) => void }) {
    // Every hour: reminders, review requests, follow-ups and seasonal messages.
    ctx.waitUntil(
      Promise.all([import("./lib/automatisch.server"), import("./lib/bindings.server")])
        .then(([a, b]) => {
          const { DB } = b.bindings();
          return DB ? a.draaiAutomatisch(DB) : undefined;
        })
        .catch((e) => console.error("[automatisch]", e)),
    );
    // Once a day (06:00 UTC): morning summary and cleanup.
    if (new Date().getUTCHours() !== 6) return;
    ctx.waitUntil(
      import("./lib/samenvatting.server").then((m) => m.stuurOchtendSamenvattingen()).catch((e) => console.error("[samenvatting]", e)),
    );
    // Website analytics are kept for 13 months at most.
    ctx.waitUntil(
      Promise.all([import("./lib/verkeer.server"), import("./lib/bindings.server")])
        .then(([v, b]) => {
          const { DB } = b.bindings();
          return DB ? v.ruimVerkeerOp(DB) : undefined;
        })
        .catch((e) => console.error("[verkeer opruimen]", e)),
    );
  },
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Eén officieel adres: www en workers.dev sturen door naar thevolgo.app (API en widget blijven overal werken).
    const url = new URL(request.url);
    // Altijd https (behalve lokaal).
    if (url.protocol === "http:" && url.hostname.endsWith("thevolgo.app") && request.method === "GET") {
      return Response.redirect(`https://thevolgo.app${url.pathname}${url.search}`, 301);
    }
    if ((url.hostname === "www.thevolgo.app" || url.hostname.endsWith(".workers.dev")) && request.method === "GET" && !url.pathname.startsWith("/api/") && url.pathname !== "/ava.js") {
      return Response.redirect(`https://thevolgo.app${url.pathname}${url.search}`, 301);
    }
    // Oude Nederlandse adressen blijven werken.
    const oud: Record<string, string> = {
      "/abonnement": "/pricing", "/betalen": "/checkout", "/aanmelden": "/signup", "/inloggen": "/login",
      "/wachtwoord-vergeten": "/forgot-password", "/wachtwoord-herstellen": "/reset-password", "/uitnodiging": "/invite",
      "/voorwaarden": "/terms", "/verwerkersovereenkomst": "/dpa",
    };
    if (oud[url.pathname]) return Response.redirect(`${url.origin}${oud[url.pathname]}${url.search}`, 301);
    // The Volgo chat API gets the visitor's approximate location from Cloudflare (city level, never the exact address).
    // It is only stored when the visitor gave permission in the consent screen.
    if (url.pathname === "/api/ava" && request.method === "POST") {
      const cf = (request as unknown as { cf?: { city?: string; region?: string; country?: string; timezone?: string } }).cf;
      if (cf) {
        const h = new Headers(request.headers);
        const zet = (k: string, v?: string) => v && h.set(k, encodeURIComponent(v).slice(0, 120));
        zet("x-volgo-stad", cf.city);
        zet("x-volgo-regio", cf.region);
        zet("x-volgo-land", cf.country);
        zet("x-volgo-tz", cf.timezone);
        request = new Request(request, { headers: h });
      }
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return applySecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return applySecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};

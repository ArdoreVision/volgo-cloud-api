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
  async scheduled(_event: unknown, _env: unknown, ctx: { waitUntil: (p: Promise<unknown>) => void }) {
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
    // The AVA chat API gets the visitor's approximate location from Cloudflare (city level, never the exact address).
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

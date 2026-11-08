import { createFileRoute } from "@tanstack/react-router";

import { bindings } from "@/lib/bindings.server";

/**
 * Preview of the customer's own website with the Volgo chat on it, shown in the dashboard.
 * The page is fetched server-side, gets a <base> so its images and styles load from the real site,
 * and runs in a sandbox without access to thevolgo.app (opaque origin).
 */
const CSP = "sandbox allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox; default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self'";

const leeg = (tekst: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><body style="margin:0;display:grid;place-items:center;height:100vh;font-family:system-ui;color:#64748b;background:#f5f7fa;text-align:center;padding:20px"><div><p style="font-size:15px;max-width:340px">${tekst}</p></div></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "x-volgo-csp": CSP, "Cache-Control": "no-store" } },
  );

export const Route = createFileRoute("/api/voorbeeld/$sleutel")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { DB } = bindings();
        if (!DB) return leeg("Unavailable.");
        const r = await DB.prepare("SELECT sleutel, site_url FROM ava_instellingen WHERE sleutel = ?").bind(params.sleutel.slice(0, 64)).first<{ sleutel: string; site_url: string }>();
        if (!r) return leeg("Not found.");
        const pad = new URL(request.url).searchParams.get("pad") ?? "";
        if (!/^https?:\/\//.test(r.site_url)) return leeg("Add your website address above to see your website with the chat on it.");
        let doel: URL;
        try {
          doel = new URL(pad && pad.startsWith("/") ? pad : "/", r.site_url);
          if (doel.host !== new URL(r.site_url).host) doel = new URL(r.site_url);
        } catch {
          return leeg("This website address doesn't look right.");
        }
        let html = "";
        try {
          const res = await fetch(doel.toString(), { headers: { "User-Agent": "Mozilla/5.0 (compatible; VolgoPreview/1.0; +https://thevolgo.app)", Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
          if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return leeg(`We couldn't open ${doel.host} (status ${res.status}). Check the address.`);
          html = (await res.text()).slice(0, 3_000_000);
          doel = new URL(res.url || doel.toString());
        } catch {
          return leeg(`We couldn't reach ${doel.host}. Check the address, or try again in a minute.`);
        }
        const origin = new URL(request.url).origin;
        html = html
          .replace(/<meta[^>]+http-equiv=["']?content-security-policy[^>]*>/gi, "")
          .replace(/<base\b[^>]*>/gi, "")
          .replace(/<script\b[^>]*ava\.js[^>]*>\s*<\/script>/gi, "");
        const base = `<base href="${doel.toString().replace(/"/g, "&quot;")}">`;
        const chat = `<script src="${origin}/ava.js" data-key="${r.sleutel}" data-preview="1" defer></script>`;
        html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}${base}`) : `${base}${html}`;
        html = /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${chat}</body>`) : `${html}${chat}`;
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "x-volgo-csp": CSP, "Cache-Control": "no-store" } });
      },
    },
  },
});

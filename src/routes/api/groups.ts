import { createFileRoute } from "@tanstack/react-router";

import { bindings } from "@/lib/bindings.server";

/**
 * Groups: the Discord link is only handed out after the right password.
 * Only a SHA-256 hash of the password is in the code, and the link never reaches the browser before it is correct.
 * Max 10 tries per IP per 15 minutes.
 */
const WACHTWOORD_HASH = "68243d62f28d2ddce393abd05ca5a65d74a1562db25ab63b7780ea9345c5ae73";
const DISCORD = "https://discord.com/channels/1569366921629929583/1569368447031447722";

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function sha256(t: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/groups")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let ww = "";
        try {
          ww = String(((await request.json()) as { wachtwoord?: unknown }).wachtwoord ?? "").slice(0, 100);
        } catch {
          return json({ ok: false }, 400);
        }
        const { DB } = bindings();
        if (DB) {
          const { binnenLimiet } = await import("@/lib/limiet.server");
          const { hashIp } = await import("@/lib/aanvraag.server");
          const ip = await hashIp(request.headers.get("cf-connecting-ip") ?? "x");
          if (!(await binnenLimiet(DB, `groups:${ip}`, 15, 10))) return json({ ok: false, te_vaak: true }, 429);
        }
        if ((await sha256(ww.trim())) !== WACHTWOORD_HASH) return json({ ok: false });
        return json({ ok: true, link: DISCORD });
      },
    },
  },
});

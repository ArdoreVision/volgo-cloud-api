import { createFileRoute } from "@tanstack/react-router";

import { bindings } from "@/lib/bindings.server";

/**
 * Groups login: email + personal password (mailed after Damien approves the application).
 * The Discord link only reaches the browser after a correct login. Max 10 tries per IP per 15 minutes.
 */
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/groups")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let b: { email?: unknown; wachtwoord?: unknown };
        try {
          b = (await request.json()) as typeof b;
        } catch {
          return json({ ok: false }, 400);
        }
        const email = String(b.email ?? "").slice(0, 160);
        const ww = String(b.wachtwoord ?? "").trim().slice(0, 100);
        const { DB } = bindings();
        if (!DB || !email || !ww) return json({ ok: false });
        const { binnenLimiet } = await import("@/lib/limiet.server");
        const { hashIp } = await import("@/lib/aanvraag.server");
        const ip = await hashIp(request.headers.get("cf-connecting-ip") ?? "x");
        if (!(await binnenLimiet(DB, `groups:${ip}`, 15, 10))) return json({ ok: false, te_vaak: true }, 429);
        const { logIn } = await import("@/lib/groepen.server");
        const r = await logIn(DB, email, ww);
        return r ? json({ ok: true, ...r }) : json({ ok: false });
      },
    },
  },
});

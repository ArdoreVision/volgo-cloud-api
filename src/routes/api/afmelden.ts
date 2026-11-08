import { createFileRoute } from "@tanstack/react-router";

import { bindings } from "@/lib/bindings.server";

// "Stop these messages" link in automatic visitor emails.
const pagina = (t: string) =>
  new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${t}</title><body style="font-family:system-ui;padding:48px 20px;text-align:center;color:#0b1220"><h1 style="font-size:22px">${t}</h1></body>`, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

export const Route = createFileRoute("/api/afmelden")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const t = new URL(request.url).searchParams.get("t") ?? "";
        const { DB } = bindings();
        if (DB && t) await DB.prepare("UPDATE ava_gesprek_meta SET afgemeld = 1 WHERE token = ?").bind(t.slice(0, 64)).run();
        return pagina("Done. You won't receive these messages anymore. / Gelukt, je ontvangt deze berichten niet meer.");
      },
    },
  },
});

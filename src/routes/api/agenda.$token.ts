import { createFileRoute } from "@tanstack/react-router";

import { bindings } from "@/lib/bindings.server";

// The private iCal feed of a business's Volgo appointments: /api/agenda/<token>.ics
// The business adds this address to Google, Outlook or Apple Calendar, so every Volgo booking shows up there too.
export const Route = createFileRoute("/api/agenda/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token.replace(/\.ics$/, "");
        const { DB } = bindings();
        if (!DB || !/^[a-f0-9]{24,64}$/.test(token)) return new Response("Not found", { status: 404 });
        const inst = await DB.prepare("SELECT a.team_id, a.tijdzone, g.bedrijf FROM ava_instellingen a JOIN gebruikers g ON g.id = a.team_id WHERE a.agenda_token = ?")
          .bind(token)
          .first<{ team_id: number; tijdzone: string; bedrijf: string }>();
        if (!inst) return new Response("Not found", { status: 404 });
        const { heeftToegang } = await import("@/lib/toegang.server");
        if (!(await heeftToegang(DB, inst.team_id))) return new Response("Not found", { status: 404 });
        const rijen = await DB.prepare(
          "SELECT id, titel, start, eind, locatie, notitie FROM afspraken WHERE team_id = ? AND voorbeeld = 0 AND start > datetime('now', '-60 days') ORDER BY start LIMIT 2000",
        )
          .bind(inst.team_id)
          .all<{ id: number; titel: string; start: string; eind: string; locatie: string | null; notitie: string | null }>();
        const { maakIcs } = await import("@/lib/ical.server");
        return new Response(maakIcs(inst.bedrijf, inst.tijdzone || "Europe/Amsterdam", rijen.results), {
          headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300", "X-Robots-Tag": "noindex" },
        });
      },
    },
  },
});

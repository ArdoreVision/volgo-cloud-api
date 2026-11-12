import { createFileRoute } from "@tanstack/react-router";

import { huidigeGebruiker } from "@/lib/auth.server";
import { bindings } from "@/lib/bindings.server";
import { haalSite, legePagina, paginaAntwoord } from "@/lib/bouwer.server";

/** The draft of your own website, for the preview in the dashboard. Only for the logged-in team. */
export const Route = createFileRoute("/api/site-concept")({
  server: {
    handlers: {
      GET: async () => {
        const { DB } = bindings();
        const g = await huidigeGebruiker().catch(() => null);
        if (!DB || !g) return legePagina("Log in om je website te zien.", 401);
        const site = await haalSite(DB, g.team_id);
        if (!site?.html) return legePagina("Hier verschijnt je website. Vertel links in de chat wat voor website je wilt.");
        return paginaAntwoord(site.html, "no-store");
      },
    },
  },
});

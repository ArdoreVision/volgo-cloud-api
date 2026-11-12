import { createFileRoute } from "@tanstack/react-router";

import { bindings } from "@/lib/bindings.server";
import { legePagina, leesSite, paginaAntwoord } from "@/lib/bouwer.server";

/** A published website built in Volgo. Served in a sandbox, so the page can never touch thevolgo.app accounts. */
export const Route = createFileRoute("/s/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { DB } = bindings();
        if (!DB) return legePagina("Niet beschikbaar.", 503);
        const r = await DB.prepare("SELECT data, gepubliceerd FROM sites WHERE slug = ?").bind(params.slug.slice(0, 64)).first<{ data: string; gepubliceerd: number }>();
        const html = r?.gepubliceerd ? leesSite(r.data).html : "";
        if (!html) return legePagina("Deze website staat niet online.", 404);
        return paginaAntwoord(html, "public, max-age=60");
      },
    },
  },
});

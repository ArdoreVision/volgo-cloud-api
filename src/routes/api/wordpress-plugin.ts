import { createFileRoute } from "@tanstack/react-router";

import { instellingenVoorTeam } from "@/lib/ava.server";
import { huidigeGebruiker } from "@/lib/auth.server";
import { bindings } from "@/lib/bindings.server";
import { volgoPluginZip } from "@/lib/wordpress-plugin.server";

/** Download of the WordPress plugin with the logged-in business's own code inside. Upload, activate, done. */
export const Route = createFileRoute("/api/wordpress-plugin")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { DB } = bindings();
        const g = await huidigeGebruiker().catch(() => null);
        if (!DB || !g) return new Response("Log in to download your plugin.", { status: 401 });
        const inst = await instellingenVoorTeam(DB, g.team_id);
        // Local and preview addresses would put a line in the plugin that only works there.
        const eigen = new URL(request.url).origin;
        const origin = /^https:\/\/(www\.)?thevolgo\.app$/.test(eigen) ? eigen : "https://thevolgo.app";
        const zip = volgoPluginZip(origin, inst.sleutel);
        if (!zip) return new Response("The plugin could not be made. Contact Volgo.", { status: 500 });
        return new Response(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer, {
          headers: { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="volgo.zip"', "Cache-Control": "private, no-store" },
        });
      },
    },
  },
});

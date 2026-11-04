import { createFileRoute, notFound } from "@tanstack/react-router";

import { VsPagina } from "@/components/volgo/vs-pagina";
import { isIngelogd } from "@/lib/api/assistent.functions";
import { vergelijking } from "@/lib/vergelijkingen";
import "@/volgo.css";

/** /vs/podium, /vs/birdeye, /vs/tidio — one page per competitor, content in lib/vergelijkingen.ts. */
export const Route = createFileRoute("/vs/$slug")({
  loader: async ({ params }) => {
    const v = vergelijking(params.slug.toLowerCase());
    if (!v) throw notFound();
    return { v, ingelogd: await isIngelogd().catch(() => false) };
  },
  head: ({ loaderData }) => {
    const v = loaderData?.v;
    if (!v) return { meta: [{ title: "Not found · Volgo" }, { name: "robots", content: "noindex" }] };
    return {
      meta: [
        { title: v.metaTitel },
        { name: "description", content: v.metaBeschrijving },
        { property: "og:url", content: `https://thevolgo.app/vs/${v.slug}` },
      ],
      links: [{ rel: "canonical", href: `https://thevolgo.app/vs/${v.slug}` }],
    };
  },
  component: Vs,
});

function Vs() {
  const { v, ingelogd } = Route.useLoaderData();
  return <VsPagina ingelogd={ingelogd} v={v} />;
}

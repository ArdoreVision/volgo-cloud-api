import { createFileRoute } from "@tanstack/react-router";

import { LandingPagina } from "@/components/volgo/landing-pagina";
import { isIngelogd } from "@/lib/api/assistent.functions";
import "@/volgo.css";

const TITEL = "Volgo · AI-assistent die je website-aanvragen 24/7 beantwoordt";
const OMSCHRIJVING =
  "AVA beantwoordt vragen op je website, noteert aanvragen, plant afspraken en laat zien wie je het eerst moet terugbellen. Probeer de live demo zonder aanmelden.";

/** Dutch landing page, for Dutch ads: thevolgo.app/nl. Same page, Dutch copy and a Dutch sample business in the demo. */
export const Route = createFileRoute("/nl")({
  loader: async () => ({ ingelogd: await isIngelogd().catch(() => false) }),
  head: () => ({
    meta: [
      { title: TITEL },
      { name: "description", content: OMSCHRIJVING },
      { property: "og:title", content: TITEL },
      { property: "og:description", content: OMSCHRIJVING },
      { property: "og:url", content: "https://thevolgo.app/nl" },
      { property: "og:locale", content: "nl_NL" },
    ],
    links: [
      { rel: "canonical", href: "https://thevolgo.app/nl" },
      { rel: "alternate", hrefLang: "en", href: "https://thevolgo.app/" },
      { rel: "alternate", hrefLang: "nl", href: "https://thevolgo.app/nl" },
      { rel: "alternate", hrefLang: "x-default", href: "https://thevolgo.app/" },
    ],
  }),
  component: Nederlands,
});

function Nederlands() {
  return <LandingPagina ingelogd={Route.useLoaderData().ingelogd} vast="nl" />;
}

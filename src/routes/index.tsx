import { createFileRoute } from "@tanstack/react-router";

import { LandingPagina } from "@/components/volgo/landing-pagina";
import { isIngelogd } from "@/lib/api/assistent.functions";
import "@/volgo.css";

const TITEL = "Volgo · Al je warme klanten in één app";
const OMSCHRIJVING = "Een nieuwe website met een chatassistent erin die elke bezoeker antwoordt, jouw vragen stelt en de afspraak plant. Al je warme klanten in één app. Voor elk bedrijf.";

export const Route = createFileRoute("/")({
  loader: async () => ({ ingelogd: await isIngelogd().catch(() => false) }),
  head: () => ({
    meta: [
      { title: TITEL },
      { name: "description", content: OMSCHRIJVING },
      { property: "og:title", content: TITEL },
      { property: "og:description", content: OMSCHRIJVING },
      { property: "og:locale", content: "nl_NL" },
    ],
    links: [
      { rel: "canonical", href: "https://thevolgo.app/" },
      { rel: "alternate", hrefLang: "en", href: "https://thevolgo.app/" },
      { rel: "alternate", hrefLang: "nl", href: "https://thevolgo.app/nl" },
      { rel: "alternate", hrefLang: "x-default", href: "https://thevolgo.app/" },
    ],
  }),
  component: Index,
});

function Index() {
  return <LandingPagina ingelogd={Route.useLoaderData().ingelogd} />;
}

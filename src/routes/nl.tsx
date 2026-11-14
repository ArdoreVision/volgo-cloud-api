import { createFileRoute } from "@tanstack/react-router";

import { LandingPagina } from "@/components/volgo/landing-pagina";
import { accountStatus } from "@/lib/api/assistent.functions";
import "@/volgo.css";

const TITEL = "Volgo · The appointment setter for your website";
const OMSCHRIJVING = "Volgo is the appointment setter for your website. Visitors book an appointment themselves, everything lands in one inbox and Volgo follows up automatically. Installed by yourself in about 10 minutes. From €149 per month.";

/** Dutch landing page, for Dutch ads: thevolgo.app/nl. Same page, Dutch copy and a Dutch sample business in the demo. */
export const Route = createFileRoute("/nl")({
  loader: async () => accountStatus().catch(() => ({ ingelogd: false, toegang: false, email: "", plan: "", eigenaar: false })),
  head: () => ({
    meta: [
      { title: TITEL },
      { name: "description", content: OMSCHRIJVING },
      { property: "og:title", content: TITEL },
      { property: "og:description", content: OMSCHRIJVING },
      { property: "og:url", content: "https://thevolgo.app/nl" },
      { property: "og:locale", content: "en_US" },
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
  return <LandingPagina kijker={Route.useLoaderData()} vast="nl" />;
}

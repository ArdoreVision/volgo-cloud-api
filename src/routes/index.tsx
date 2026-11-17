import { createFileRoute } from "@tanstack/react-router";

import { LandingPagina } from "@/components/volgo/landing-pagina";
import { Pauze } from "@/components/volgo/pauze";
import { accountStatus } from "@/lib/api/assistent.functions";
import { PAUZE } from "@/lib/pauze";
import "@/volgo.css";

const TITEL = "Volgo · The appointment setter for your website";
const OMSCHRIJVING = "Volgo builds your website with an appointment setter inside. Visitors book an appointment themselves, everything lands in one inbox and Volgo follows up automatically. A complete professional website built for you with every plan. From €149 per month.";

export const Route = createFileRoute("/")({
  loader: async () => accountStatus().catch(() => ({ ingelogd: false, toegang: false, email: "", plan: "", eigenaar: false })),
  head: () => ({
    meta: [
      ...(PAUZE ? [{ name: "robots", content: "noindex" }] : []),
      { title: PAUZE ? "Volgo" : TITEL },
      { name: "description", content: OMSCHRIJVING },
      { property: "og:title", content: TITEL },
      { property: "og:description", content: OMSCHRIJVING },
      { property: "og:locale", content: "en_US" },
    ],
    links: [
      { rel: "canonical", href: "https://thevolgo.app/" },
      { rel: "alternate", hrefLang: "en", href: "https://thevolgo.app/" },
      { rel: "alternate", hrefLang: "x-default", href: "https://thevolgo.app/" },
    ],
  }),
  component: Index,
});

function Index() {
  const kijker = Route.useLoaderData();
  if (PAUZE) return <Pauze />;
  return <LandingPagina kijker={kijker} />;
}

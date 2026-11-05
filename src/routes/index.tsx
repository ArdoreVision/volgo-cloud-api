import { createFileRoute } from "@tanstack/react-router";

import { FAQS } from "@/components/volgo/faq";
import { LandingPagina } from "@/components/volgo/landing-pagina";
import { isIngelogd } from "@/lib/api/assistent.functions";
import "@/volgo.css";

/** The FAQ as structured data, so search engines can show the answers directly. */
const LD_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export const Route = createFileRoute("/")({
  loader: async () => ({ ingelogd: await isIngelogd().catch(() => false) }),
  head: () => ({
    links: [
      { rel: "canonical", href: "https://thevolgo.app/" },
      { rel: "alternate", hrefLang: "en", href: "https://thevolgo.app/" },
      { rel: "alternate", hrefLang: "nl", href: "https://thevolgo.app/nl" },
      { rel: "alternate", hrefLang: "x-default", href: "https://thevolgo.app/" },
    ],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(LD_FAQ) }],
  }),
  component: Index,
});

function Index() {
  return <LandingPagina ingelogd={Route.useLoaderData().ingelogd} />;
}

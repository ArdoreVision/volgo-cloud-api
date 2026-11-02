import { createFileRoute } from "@tanstack/react-router";

import { AvaChat } from "@/components/volgo/ava-chat";
import { FAQS, Faq } from "@/components/volgo/faq";
import { Footer } from "@/components/volgo/footer";
import { Hero } from "@/components/volgo/hero";
import { Nav } from "@/components/volgo/nav";
import { Inside } from "@/components/volgo/inside";
import { DemoVideo, Feiten, LiveDemo, Marquee, Ranking, Rekenhulp, ScrollProgress, Tijdlijn, Voordelen, Voorbeelden, VoorNa, useReveal } from "@/components/volgo/landing";
import { FinalCta, PricingPreview } from "@/components/volgo/pricing-preview";
import { Founder, Moat, Vergelijk, Vertrouwen, Waarom } from "@/components/volgo/verhaal";
import { Reviews } from "@/components/volgo/reviews";
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
  head: () => ({ links: [{ rel: "canonical", href: "https://thevolgo.app/" }], scripts: [{ type: "application/ld+json", children: JSON.stringify(LD_FAQ) }] }),
  component: Index,
});

function Index() {
  useReveal();
  return (
    <div className="volgo">
      <ScrollProgress />
      <Nav ingelogd={Route.useLoaderData().ingelogd} />
      <main>
        <Hero />
        <Feiten />
        <DemoVideo />
        <Marquee />
        <VoorNa />
        <Waarom />
        <Voordelen />
        <Voorbeelden />
        <LiveDemo />
        <Ranking />
        <Moat />
        <Vergelijk />
        <Rekenhulp />
        <Tijdlijn />
        <Inside />
        <Reviews />
        <PricingPreview />
        <Vertrouwen />
        <Faq />
        <Founder />
        <FinalCta />
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}

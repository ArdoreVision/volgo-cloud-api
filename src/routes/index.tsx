import { createFileRoute } from "@tanstack/react-router";

import { AvaChat } from "@/components/volgo/ava-chat";
import { Faq } from "@/components/volgo/faq";
import { Footer } from "@/components/volgo/footer";
import { Hero } from "@/components/volgo/hero";
import { Nav } from "@/components/volgo/nav";
import { Inside } from "@/components/volgo/inside";
import { Feiten, LiveDemo, Marquee, Ranking, Rekenhulp, ScrollProgress, Tijdlijn, Voordelen, Voorbeelden, VoorNa, useReveal } from "@/components/volgo/landing";
import { FinalCta, PricingPreview } from "@/components/volgo/pricing-preview";
import { isIngelogd } from "@/lib/api/assistent.functions";
import "@/volgo.css";

export const Route = createFileRoute("/")({
  loader: async () => ({ ingelogd: await isIngelogd().catch(() => false) }),
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
        <Marquee />
        <VoorNa />
        <Voordelen />
        <Voorbeelden />
        <LiveDemo />
        <Ranking />
        <Rekenhulp />
        <Tijdlijn />
        <Inside />
        <PricingPreview />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}

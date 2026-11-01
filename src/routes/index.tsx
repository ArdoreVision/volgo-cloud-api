import { createFileRoute } from "@tanstack/react-router";

import { AvaChat } from "@/components/volgo/ava-chat";
import { Faq } from "@/components/volgo/faq";
import { Footer } from "@/components/volgo/footer";
import { Hero } from "@/components/volgo/hero";
import { Nav } from "@/components/volgo/nav";
import { Inside } from "@/components/volgo/inside";
import { DemoVideo, Feiten, LiveDemo, Marquee, Ranking, Rekenhulp, ScrollProgress, Tijdlijn, Voordelen, Voorbeelden, VoorNa, useReveal } from "@/components/volgo/landing";
import { FinalCta, PricingPreview } from "@/components/volgo/pricing-preview";
import { Founder, Moat, Vertrouwen, Waarom } from "@/components/volgo/verhaal";
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
        <DemoVideo />
        <Marquee />
        <VoorNa />
        <Waarom />
        <Voordelen />
        <Voorbeelden />
        <LiveDemo />
        <Ranking />
        <Moat />
        <Rekenhulp />
        <Tijdlijn />
        <Inside />
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

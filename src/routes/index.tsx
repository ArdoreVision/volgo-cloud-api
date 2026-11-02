import { createFileRoute } from "@tanstack/react-router";

import { AvaChat } from "@/components/volgo/ava-chat";
import { FAQS, Faq } from "@/components/volgo/faq";
import { Footer } from "@/components/volgo/footer";
import { Hero, Stappen } from "@/components/volgo/hero";
import { Nav } from "@/components/volgo/nav";
import { DemoVideo, LiveDemo, ScrollProgress, VoorNa, useReveal } from "@/components/volgo/landing";
import { FinalCta, PricingPreview } from "@/components/volgo/pricing-preview";
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

/** Short and clear, like a quiz-style ad landing page: one message, one Start button, then proof. */
function Index() {
  useReveal();
  return (
    <div className="volgo volgo--simpel">
      <ScrollProgress />
      <Nav ingelogd={Route.useLoaderData().ingelogd} />
      <main>
        <Hero />
        <Stappen />
        <DemoVideo />
        <VoorNa />
        <LiveDemo />
        <PricingPreview />
        <Reviews />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}

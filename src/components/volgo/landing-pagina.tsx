import { useEffect, useState } from "react";

import { AvaChat } from "./ava-chat";
import { Faq } from "./faq";
import { Footer } from "./footer";
import { Hero, Stappen } from "./hero";
import { DemoVideo, LiveDemo, ScrollProgress, VoorNa, useReveal } from "./landing";
import { Nav } from "./nav";
import { FinalCta, PricingPreview } from "./pricing-preview";
import { Reviews } from "./reviews";
import { TEKST, type RouteTaal } from "./route-teksten";
import { huidigeTaal, kiesTaal } from "./taal";

/**
 * The ad landing page: who it is for and what it does, try AVA live on this page, then the plans.
 * vast = the language is fixed by the URL (/nl for Dutch ads). Without it, Dutch visitors (browser or language picker)
 * get the hand-written Dutch copy; every other language keeps the English source and the site translator.
 */
export function LandingPagina({ ingelogd, vast }: { ingelogd: boolean; vast?: RouteTaal }) {
  useReveal();
  const [taal, setTaal] = useState<RouteTaal>(vast ?? "en");
  const [laadDemo, setLaadDemo] = useState(false);

  useEffect(() => {
    if (vast) {
      document.documentElement.lang = vast;
      if (huidigeTaal() !== vast) kiesTaal(vast);
    } else setTaal(huidigeTaal() === "nl" ? "nl" : "en");
    const op = (e: Event) => setTaal((e as CustomEvent<string>).detail === "nl" ? "nl" : "en");
    window.addEventListener("volgo-taal", op);
    return () => window.removeEventListener("volgo-taal", op);
  }, [vast]);

  const probeer = () => setLaadDemo(true);
  return (
    <div className="volgo volgo--simpel">
      <ScrollProgress />
      <Nav ingelogd={ingelogd} probeer={{ tekst: TEKST[taal].navProbeer, kort: TEKST[taal].navKort, handgeschreven: taal === "nl", onKlik: probeer }} />
      <main>
        <Hero onProbeer={probeer} taal={taal} />
        <LiveDemo laadNu={laadDemo} taal={taal} />
        <Stappen />
        <DemoVideo />
        <VoorNa />
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

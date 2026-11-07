import { useEffect, useState } from "react";

import { Footer } from "./footer";
import { VolgoMark } from "./logo";
import { PricingPreview } from "./pricing-preview";
import { type RouteTaal } from "./route-teksten";
import { huidigeTaal, kiesTaal } from "./taal";
import { meet } from "./tracking";
import "@/volgo-dialed.css";

/**
 * The landing page, kept as simple as possible: one Start button to the dashboard and the three plans. Nothing else.
 * vast = the language is fixed by the URL (/nl for Dutch ads).
 */
export function LandingPagina({ ingelogd, vast }: { ingelogd: boolean; vast?: RouteTaal }) {
  const [taal, setTaal] = useState<RouteTaal>(vast ?? "en");

  useEffect(() => {
    if (vast) {
      document.documentElement.lang = vast;
      if (huidigeTaal() !== vast) kiesTaal(vast);
    } else setTaal(huidigeTaal() === "nl" ? "nl" : "en");
    const op = (e: Event) => setTaal((e as CustomEvent<string>).detail === "nl" ? "nl" : "en");
    window.addEventListener("volgo-taal", op);
    return () => window.removeEventListener("volgo-taal", op);
  }, [vast]);

  const nl = taal === "nl";
  const naar = ingelogd ? "/dashboard" : "/signup";
  return (
    <div className="volgo volgo--simpel volgo--dialed" id="vd">
      <main>
        <section aria-labelledby="hero-title" className="vs-hero" id="top" style={{ minHeight: "auto", paddingBottom: 24 }}>
          <div className="vs-hero__copy" style={{ textAlign: "center", marginInline: "auto" }}>
            <p className="vs-hero__voor" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <VolgoMark size={22} /> Volgo
            </p>
            <h1 className="vs-hero__title" id="hero-title">
              {nl ? "Jouw assistent online. 24/7." : "Your assistant online. 24/7."}
            </h1>
            <p className="vs-hero__sub">
              {nl
                ? "Jij doet het werk. Volgo beantwoordt je websitebezoekers, stelt de juiste vragen en zet elke afspraak met naam en adres in je agenda."
                : "You do the work. Volgo answers your website visitors, asks the right questions and puts every appointment, with name and address, in your calendar."}
            </p>
            <div className="vs-hero__acties" style={{ justifyContent: "center" }}>
              <a className="vs-start vs-start--groot" href={naar} onClick={() => meet("abo_klik")}>
                {ingelogd ? (nl ? "Naar dashboard →" : "Go to dashboard →") : nl ? "Start →" : "Start →"}
              </a>
            </div>
            {!ingelogd ? (
              <p className="vs-hero__sub" style={{ marginTop: 16 }}>
                {nl ? "Al een account?" : "Already have an account?"} <a href="/login">{nl ? "Inloggen" : "Log in"}</a>
              </p>
            ) : null}
          </div>
        </section>
        <PricingPreview />
      </main>
      <Footer />
    </div>
  );
}

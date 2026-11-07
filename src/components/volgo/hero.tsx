import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { TEKST, handgeschreven, type RouteTaal } from "./route-teksten";
import { meet } from "./tracking";

/**
 * Ad landing hero: who it is for, what it does, then one primary action (try the live demo on this page)
 * and one secondary action (the plans further down this page).
 */
export function Hero({ taal = "en", onProbeer }: { taal?: RouteTaal; onProbeer?: () => void }) {
  const t = TEKST[taal];
  return (
    <section aria-labelledby="hero-title" className="vs-hero" id="top">
      <div aria-hidden="true" className="vd-stralen">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="vs-hero__copy" {...handgeschreven(taal)}>
        <p className="vs-hero__voor">{t.voorWie}</p>
        <h1 className="vs-hero__title" id="hero-title">
          {t.titel}
        </h1>
        <p className="vs-hero__sub">{t.sub}</p>
        <div className="vs-hero__acties">
          <a className="vs-start vs-start--groot" href="#pricing" onClick={() => meet("abo_klik")}>
            {t.probeer}
          </a>
          <a
            className="vs-hero__tweede"
            href="#demo"
            onClick={() => {
              meet("demo_klik");
              onProbeer?.();
            }}
          >
            {t.abos}
          </a>
        </div>
        <ul aria-label={taal === "nl" ? "Waar je op kunt rekenen" : "What you can count on"} className="vs-hero__proof">
          {t.proof.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <HeroVideo taal={taal} />
    </section>
  );
}

/* Three big sentences that light up while you scroll, Soro-style. */

function IcoChat() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16A2.5 2.5 0 0 1 4 13.5z" />
      <path d="M8 9h8M8 12.5h5" />
    </svg>
  );
}
function IcoAgenda() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="15" rx="3" width="16" x="4" y="5" />
      <path d="M4 10h16M8 3v4M16 3v4M9 14.5l2 2 4-4" />
    </svg>
  );
}
function IcoTelefoon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6.5 3.5h3l1.6 4-2 1.3a10 10 0 0 0 6.1 6.1l1.3-2 4 1.6v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" />
    </svg>
  );
}

const STAPPEN = [
  { ico: <IcoChat />, voor: "Volgo", na: "answers every visitor on your website within seconds." },
  { ico: <IcoAgenda />, voor: "Then it", na: "books the appointment and collects their details for you." },
  { ico: <IcoTelefoon />, voor: "You", na: "open your dashboard and call the hottest leads first." },
];

export function Stappen() {
  return (
    <section aria-label="How Volgo works" className="vs-stappen" id="how">
      {STAPPEN.map((s, i) => (
        <p data-reveal="" key={s.na} style={{ "--d": `${i * 120}ms` } as CSSProperties}>
          <span className="vs-stappen__voor">{s.voor}</span>
          <span className="vs-stappen__ico">{s.ico}</span>
          <span>{s.na}</span>
        </p>
      ))}
    </section>
  );
}

/** The product film right under the headline, in a dark frame, like a showreel. Plays muted; captions are in the video. */
function HeroVideo({ taal }: { taal: RouteTaal }) {
  const v = useRef<HTMLVideoElement>(null);
  const [speelt, setSpeelt] = useState(true);
  useEffect(() => {
    const el = v.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSpeelt(false);
      return;
    }
    el.play().catch(() => setSpeelt(false));
  }, []);
  const wissel = () => {
    const el = v.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(() => setSpeelt(true)).catch(() => {});
    } else {
      el.pause();
      setSpeelt(false);
    }
  };
  return (
    <figure className="vd-reel">
      <div className="vd-reel__kader">
        <video
          aria-label={taal === "nl" ? "Demo: Volgo beantwoordt 's avonds een offerteaanvraag en de lead verschijnt in het Volgo-dashboard" : "Demo: Volgo answers a quote request at night and the lead appears in the Volgo dashboard"}
          loop
          muted
          playsInline
          poster="/assets/volgo/demo-poster.jpg"
          preload="metadata"
          ref={v}
        >
          <source src="/assets/volgo/demo.mp4" type="video/mp4" />
        </video>
        <button aria-label={speelt ? (taal === "nl" ? "Pauzeer video" : "Pause video") : taal === "nl" ? "Speel video af" : "Play video"} className="vd-reel__knop" onClick={wissel} type="button">
          {speelt ? (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M8 5v14M16 5v14" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M8 5l11 7-11 7z" />
            </svg>
          )}
        </button>
      </div>
      <figcaption>{taal === "nl" ? "48 seconden: Volgo vangt om 21:00 een lead op voor een dakdekker." : "48 seconds: Volgo catches a 9 PM lead for a roofing contractor."}</figcaption>
    </figure>
  );
}

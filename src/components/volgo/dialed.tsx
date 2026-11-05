// Extra sections for the dark landing page: what AVA does for your business (a small node diagram),
// three plain numbers, and a big closing line that lights up word by word while you scroll.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import { PLANS } from "@/lib/plans";

import { type RouteTaal, handgeschreven } from "./route-teksten";

const T = {
  en: {
    dienstenLabel: "What AVA does",
    dienstenTitel: "Your front desk, always on.",
    dienstenSub: "One assistant on your website that handles the first contact, so you only pick up the phone for customers who are ready.",
    knopen: ["Answers", "Leads", "Bookings", "Call list"],
    jouw: "Your business",
    cijfersLabel: "In numbers",
    cijfersTitel: "Numbers that just make sense.",
    cijfersSub: "No setup project, no long contract.",
    cijfers: [
      { groot: "24/7", klein: "answers", tekst: "AVA replies to visitors at night, at weekends and while you are on a job." },
      { groot: "5 min", klein: "to go live", tekst: "Paste one line of code into your website and AVA is on it." },
      { groot: `€${PLANS.start.prijsTekst}`, klein: "a month", tekst: "Billed monthly. Cancel any time, no long-term contract." },
    ],
    slot: "Answer first. Win the job. Let AVA handle the rest.",
  },
  nl: {
    dienstenLabel: "Wat AVA doet",
    dienstenTitel: "Je receptie, altijd open.",
    dienstenSub: "Eén assistent op je website die het eerste contact doet, zodat jij alleen belt met klanten die er klaar voor zijn.",
    knopen: ["Antwoorden", "Leads", "Afspraken", "Belijst"],
    jouw: "Jouw bedrijf",
    cijfersLabel: "In cijfers",
    cijfersTitel: "Cijfers die gewoon kloppen.",
    cijfersSub: "Geen installatieproject, geen lang contract.",
    cijfers: [
      { groot: "24/7", klein: "antwoorden", tekst: "AVA reageert op bezoekers in de avond, in het weekend en terwijl jij aan het werk bent." },
      { groot: "5 min", klein: "tot je live bent", tekst: "Plak één regel code in je website en AVA staat erop." },
      { groot: `€${PLANS.start.prijsTekst}`, klein: "per maand", tekst: "Maandelijks betaald en opzegbaar, zonder lang contract." },
    ],
    slot: "Eerst antwoorden. De klus winnen. AVA doet de rest.",
  },
} as const;

function Label({ children }: { children: string }) {
  return (
    <p className="vd-label">
      <i aria-hidden="true" />
      {children}
    </p>
  );
}

const ICONEN = [
  <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16A2.5 2.5 0 0 1 4 13.5z" key="a" />,
  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" key="b" />,
  <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 3v4M16 3v4" key="c" />,
  <path d="M6.5 3.5h3l1.6 4-2 1.3a10 10 0 0 0 6.1 6.1l1.3-2 4 1.6v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" key="d" />,
];

/** Four tiles wired into "your business", like a little system diagram. */
export function Diensten({ taal = "en" }: { taal?: RouteTaal }) {
  const t = T[taal];
  return (
    <section aria-labelledby="vd-diensten" className="vd-sectie" id="what" {...handgeschreven(taal)}>
      <header className="vd-kop" data-reveal="">
        <Label>{t.dienstenLabel}</Label>
        <h2 className="vd-h2" id="vd-diensten">
          {t.dienstenTitel}
        </h2>
        <p className="vd-sub">{t.dienstenSub}</p>
      </header>
      <div className="vd-schema" data-reveal="">
        <ul className="vd-schema__knopen">
          {t.knopen.map((k, i) => (
            <li key={k} style={{ "--d": `${i * 120}ms` } as CSSProperties}>
              <span className="vd-schema__tegel">
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  {ICONEN[i]}
                </svg>
              </span>
              <b>{k}</b>
            </li>
          ))}
        </ul>
        <svg aria-hidden="true" className="vd-schema__lijnen" preserveAspectRatio="none" viewBox="0 0 400 60">
          <path d="M50 0v22a10 10 0 0 0 10 10h130a10 10 0 0 1 10 10v18M150 0v22a10 10 0 0 0 10 10h30a10 10 0 0 1 10 10M250 0v22a10 10 0 0 1-10 10h-30a10 10 0 0 0-10 10M350 0v22a10 10 0 0 1-10 10H210a10 10 0 0 0-10 10" />
        </svg>
        <p className="vd-schema__jij">
          <i aria-hidden="true" />
          {t.jouw}
        </p>
      </div>
    </section>
  );
}

export function Cijfers({ taal = "en" }: { taal?: RouteTaal }) {
  const t = T[taal];
  return (
    <section aria-labelledby="vd-cijfers" className="vd-sectie" {...handgeschreven(taal)}>
      <header className="vd-kop" data-reveal="">
        <Label>{t.cijfersLabel}</Label>
        <h2 className="vd-h2" id="vd-cijfers">
          {t.cijfersTitel}
        </h2>
        <p className="vd-sub">{t.cijfersSub}</p>
      </header>
      <div className="vd-cijfers">
        {t.cijfers.map((c, i) => (
          <article data-reveal="" key={c.groot} style={{ "--d": `${i * 120}ms` } as CSSProperties}>
            <p className="vd-cijfers__groot">
              {c.groot} <span>{c.klein}</span>
            </p>
            <p>{c.tekst}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/** A big closing line; each word goes from grey to white as it scrolls into the middle of the screen. */
export function Slotzin({ taal = "en" }: { taal?: RouteTaal }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const woorden = T[taal].slot.split(" ");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = Array.from(el.querySelectorAll("span"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const s of spans) s.classList.add("is-aan");
      return;
    }
    let raf = 0;
    const zet = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.85 - r.top) / (r.height + window.innerHeight * 0.35)));
      const n = Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle("is-aan", i < n));
    };
    const op = () => {
      if (!raf) raf = requestAnimationFrame(zet);
    };
    zet();
    window.addEventListener("scroll", op, { passive: true });
    window.addEventListener("resize", op);
    return () => {
      window.removeEventListener("scroll", op);
      window.removeEventListener("resize", op);
    };
  }, [taal]);
  return (
    <section aria-label={T[taal].slot} className="vd-sectie vd-slot" {...handgeschreven(taal)}>
      <p aria-hidden="true" ref={ref}>
        {woorden.map((w, i) => (
          <span key={`${w}-${i}`}>{w} </span>
        ))}
      </p>
    </section>
  );
}

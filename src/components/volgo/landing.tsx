import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { PLANS, type PlanId, ZICHTBAAR } from "@/lib/plans";

import { TryAvaButton } from "./ava-chat";
import { DEMO, TEKST, handgeschreven, type RouteTaal } from "./route-teksten";
import { meet } from "./tracking";

/* ------------------------------------------------------------------ */
/* Scroll helpers                                                      */
/* ------------------------------------------------------------------ */

const rustig = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fades and lifts every [data-reveal] element into view while you scroll. Content stays visible without JavaScript. */
export function useReveal() {
  useEffect(() => {
    if (rustig()) return;
    const root = document.documentElement;
    root.classList.add("v-js");
    const io = new IntersectionObserver(
      (items) => {
        for (const it of items) {
          if (it.isIntersecting) {
            it.target.classList.add("is-in");
            io.unobserve(it.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    const kijk = () => document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    kijk();
    const mo = new MutationObserver(kijk);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove("v-js");
    };
  }, []);
}

/** True once the element has scrolled into view (stays true). */
function useInView<T extends Element>(marge = "-15% 0px") {
  const ref = useRef<T>(null);
  const [zichtbaar, setZichtbaar] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (rustig() || typeof IntersectionObserver === "undefined") return setZichtbaar(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setZichtbaar(true);
          io.disconnect();
        }
      },
      { rootMargin: marge },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [marge]);
  return [ref, zichtbaar] as const;
}

/** Thin progress bar at the top of the page. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const zet = () => {
      raf = 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      ref.current?.style.setProperty("--p", String(h > 0 ? window.scrollY / h : 0));
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
  }, []);
  return <div aria-hidden="true" className="vx-progress" ref={ref} />;
}

/* ------------------------------------------------------------------ */
/* Facts strip                                                         */
/* ------------------------------------------------------------------ */

const FEITEN = [
  { groot: "24/7", klein: "Volgo answers every visitor, also at night and on weekends" },
  { groot: "Seconds", klein: "to reply, instead of hours or the next morning" },
  { groot: "0–100", klein: "warmth score on every lead, buyers on top" },
  { groot: "5 min", klein: "to go live: one line of code, or we add it for you" },
];

export function Feiten() {
  return (
    <section aria-label="Volgo in short" className="vx-feiten">
      {FEITEN.map((f, i) => (
        <div data-reveal="" key={f.groot} style={{ "--d": `${i * 90}ms` } as CSSProperties}>
          <strong>{f.groot}</strong>
          <span>{f.klein}</span>
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Demo video: 48 seconds, Volgo catches a roofing lead at 9 PM          */
/* ------------------------------------------------------------------ */

export function DemoVideo() {
  const [ref, zichtbaar] = useInView<HTMLDivElement>("-10% 0px");
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current;
    if (!v || !zichtbaar || rustig()) return;
    v.play().catch(() => {});
  }, [zichtbaar]);

  return (
    <section aria-labelledby="dv-titel" className="vx-sectie vx-video" id="video">
      <header className="vx-kop vx-kop--midden" data-reveal="">
        <p className="vx-label">48-second demo</p>
        <h2 className="v-h2" id="dv-titel">
          Watch Volgo catch a lead at 9 PM.
        </h2>
        <p className="v-lede">
          A homeowner asks a roofing contractor for a quote after closing time. Volgo answers, qualifies, takes the phone number, and the owner finds a hot
          lead waiting in the morning.
        </p>
      </header>
      <div className="vx-video__kader" data-reveal="" ref={ref}>
        <div aria-hidden="true" className="vx-live__chrome">
          <i />
          <i />
          <i />
          <span>ridgelineroofing.example · 9:14 PM</span>
        </div>
        <video
          aria-label="Demo: Volgo answers a roofing quote request at night and the lead appears in the Volgo dashboard"
          controls
          loop
          muted
          playsInline
          poster="/assets/volgo/demo-poster.jpg"
          preload="metadata"
          ref={video}
        >
          <source src="/assets/volgo/demo.mp4" type="video/mp4" />
        </video>
      </div>
      <p className="vx-video__noot" data-reveal="">
        Captions are built in, so it plays without sound. Example business, real product.{" "}
        <a href="#demo">Want to try it yourself? Jump to the live demo.</a>
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sectors marquee                                                     */
/* ------------------------------------------------------------------ */

const SECTOREN = ["Bathrooms", "Kitchens", "Heating & cooling", "Roofing", "Solar", "Contractors", "Landscaping", "Pools", "Painters", "Windows & doors", "Flooring", "Electricians", "Plumbers", "Hotels & B&Bs", "Real estate", "Dentists", "Clinics"];

export function Marquee() {
  const rij = (dubbel: boolean) => (
    <ul aria-hidden={dubbel || undefined} className="vx-marquee__rij">
      {SECTOREN.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Made for businesses that live from quotes" className="vx-marquee">
      <p>Made for businesses that live from quotes</p>
      <div className="vx-marquee__baan">
        {rij(false)}
        {rij(true)}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Without vs with Volgo: the same inquiry, two outcomes               */
/* ------------------------------------------------------------------ */

const ZONDER = [
  { t: "9:14 PM", s: "Sarah fills in your contact form: “What does a walk-in shower cost?”" },
  { t: "9:14 PM", s: "Your inbox is closed. Sarah keeps browsing and contacts two other companies." },
  { t: "9:40 AM", s: "Next morning you read the email between two calls, and call back at lunch." },
  { t: "12:30 PM", s: "“Thanks, but we already booked someone.” The job is gone.", slecht: true },
];
const MET = [
  { t: "9:14 PM", s: "Sarah asks Volgo on your website: “What does a walk-in shower cost?”" },
  { t: "9:14 PM", s: "Volgo answers in seconds with your price range and asks her town and timing." },
  { t: "9:16 PM", s: "Sarah leaves her name and number. Warmth 92: she wants to start in January." },
  { t: "Morning", s: "Your summary says: call Sarah first. You send the quote before 9.", goed: true },
];

export function VoorNa() {
  return (
    <section aria-labelledby="vn-titel" className="vx-sectie vx-voorna" id="why">
      <header className="vx-kop" data-reveal="">
        <p className="vx-label">Why Volgo</p>
        <h2 className="v-h2" id="vn-titel">
          The same inquiry. Two very different endings.
        </h2>
        <p className="v-lede">Most people look for a contractor in the evening, after work. Whoever answers first usually gets the job.</p>
      </header>
      <div className="vx-voorna__grid">
        {[
          { naam: "Without Volgo", lijst: ZONDER, klas: "zonder" },
          { naam: "With Volgo on your website", lijst: MET, klas: "met" },
        ].map((k, ki) => (
          <article className={`vx-voorna__kol vx-voorna__kol--${k.klas}`} data-reveal="" key={k.naam} style={{ "--d": `${ki * 120}ms` } as CSSProperties}>
            <h3>{k.naam}</h3>
            <ol>
              {k.lijst.map((r, i) => (
                <li className={"slecht" in r && r.slecht ? "is-slecht" : "goed" in r && r.goed ? "is-goed" : ""} data-reveal="" key={i} style={{ "--d": `${ki * 120 + 150 + i * 140}ms` } as CSSProperties}>
                  <time>{r.t}</time>
                  <p>{r.s}</p>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Four benefits                                                       */
/* ------------------------------------------------------------------ */

const VOORDELEN = [
  {
    t: "More leads",
    d: "Every visitor who has a question gets an answer, also at 23:00 or on Sunday. Fewer people leave your website without a word.",
    i: "M4 17l5-5 4 4 7-8M15 8h5v5",
  },
  {
    t: "More customers and revenue",
    d: "You reply first, so you quote first. One extra job per month often pays for Volgo many times over.",
    i: "M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.8 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3",
  },
  {
    t: "Less time on emails and calls",
    d: "Volgo answers the same questions about prices, planning and service area for you, and collects the details. You only step in when it matters.",
    i: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
  {
    t: "Buyers on top",
    d: "Every lead gets a warmth score with the reason. The people ready to buy are always at the top of your list, so you call them first.",
    i: "M4 6h16M4 12h10M4 18h6M18 14l3 3-3 3",
  },
];

export function Voordelen() {
  return (
    <section aria-labelledby="vd-titel" className="vx-sectie">
      <header className="vx-kop vx-kop--midden" data-reveal="">
        <p className="vx-label">What you get</p>
        <h2 className="v-h2" id="vd-titel">
          Four reasons businesses add Volgo.
        </h2>
      </header>
      <div className="vx-voordelen">
        {VOORDELEN.map((v, i) => (
          <article data-reveal="" key={v.t} style={{ "--d": `${i * 100}ms` } as CSSProperties}>
            <span aria-hidden="true" className="vx-voordelen__ico">
              <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24" width="24">
                <path d={v.i} />
              </svg>
            </span>
            <h3>{v.t}</h3>
            <p>{v.d}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Hot leads float to the top                                          */
/* ------------------------------------------------------------------ */

const LEADS = [
  { naam: "Mark J.", wat: "Just asking about prices", w: 34, reden: "Browsing, no timing" },
  { naam: "Sarah Mitchell", wat: "Walk-in shower, start January", w: 92, reden: "Wants a visit this week" },
  { naam: "Peter V.", wat: "Kitchen, maybe next year", w: 48, reden: "Interested, no rush" },
  { naam: "Laura B.", wat: "Complete bathroom, 90 sq ft", w: 86, reden: "Asked for a quote" },
  { naam: "Tom K.", wat: "Half-bath remodel", w: 71, reden: "Wants to plan soon" },
];

export function Ranking() {
  const [ref, zichtbaar] = useInView<HTMLDivElement>("-25% 0px");
  const [gesorteerd, setGesorteerd] = useState(false);
  useEffect(() => {
    if (!zichtbaar) return;
    const t = window.setTimeout(() => setGesorteerd(true), rustig() ? 0 : 900);
    return () => window.clearTimeout(t);
  }, [zichtbaar]);
  const volgorde = gesorteerd ? [...LEADS].sort((a, b) => b.w - a.w) : LEADS;
  const kleur = (w: number) => (w >= 75 ? "heet" : w >= 55 ? "warm" : "lauw");

  return (
    <section aria-labelledby="rk-titel" className="vx-sectie vx-rank">
      <div className="vx-rank__tekst" data-reveal="">
        <p className="vx-label">Warmth score</p>
        <h2 className="v-h2" id="rk-titel">
          The buyers float to the top. Automatically.
        </h2>
        <p className="v-lede">
          Volgo reads every conversation and scores how ready someone is to buy, from 0 to 100, with the reason why. Your list sorts itself, so the first call
          you make is to the person most likely to say yes.
        </p>
        <ul className="vx-legenda">
          <li className="is-heet">75+ Hot: wants it soon, asks about price or planning</li>
          <li className="is-warm">55–74 Warm: serious interest</li>
          <li className="is-lauw">Below 55: still exploring</li>
        </ul>
      </div>
      <div aria-label="Example lead list sorted by warmth" className="vx-rank__lijst" data-reveal="" ref={ref} role="img">
        <div className="vx-rank__kop">
          <strong>Requests</strong>
          <span>{gesorteerd ? "Sorted by warmth" : "New today"}</span>
        </div>
        <div className="vx-rank__rijen" style={{ height: LEADS.length * 72 }}>
          {LEADS.map((l) => {
            const pos = volgorde.indexOf(l);
            return (
              <div className={`vx-rank__rij is-${kleur(l.w)}`} key={l.naam} style={{ transform: `translateY(${pos * 72}px)` }}>
                <span className="vx-rank__score">{l.w}</span>
                <div>
                  <strong>{l.naam}</strong>
                  <small>{l.wat}</small>
                </div>
                <em>{l.reden}</em>
                <i aria-hidden="true" style={{ width: gesorteerd ? `${l.w}%` : "0%" }} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Example conversations                                               */
/* ------------------------------------------------------------------ */

type Msg = { van: "klant" | "ava" | "systeem"; tekst: string; tijd: string };
const VOORBEELDEN: { id: string; label: string; bedrijf: string; script: Msg[] }[] = [
  {
    id: "bad",
    label: "Bathroom",
    bedrijf: "Coastline Bathrooms",
    script: [
      { van: "klant", tekst: "Hi! What does a walk-in shower cost? We want the tub out.", tijd: "9:14 PM" },
      { van: "ava", tekst: "Good choice! A walk-in shower instead of a tub starts at about $4,500, including the glass panel and tiling. What city are you in?", tijd: "9:14 PM" },
      { van: "klant", tekst: "Round Rock. Could you start in January?", tijd: "9:15 PM" },
      { van: "ava", tekst: "January works. Shall I set up a free measuring visit? Then I only need your name and phone number.", tijd: "9:15 PM" },
      { van: "klant", tekst: "Sarah Mitchell, (512) 555-0147. Call me tomorrow!", tijd: "9:16 PM" },
      { van: "systeem", tekst: "Hot lead · warmth 92 · you got an email", tijd: "9:16 PM" },
    ],
  },
  {
    id: "cv",
    label: "Heating",
    bedrijf: "Northside Heating",
    script: [
      { van: "klant", tekst: "My furnace stopped working. Can someone come this week?", tijd: "10:03 PM" },
      { van: "ava", tekst: "That's no fun, especially now. The team can usually come within 2 days. What's your zip code?", tijd: "10:03 PM" },
      { van: "klant", tekst: "78664", tijd: "10:04 PM" },
      { van: "ava", tekst: "You're in our service area. What's your name and number, and may we call you about it?", tijd: "10:04 PM" },
      { van: "klant", tekst: "Mark, (512) 555-0198. Yes please.", tijd: "10:05 PM" },
      { van: "systeem", tekst: "Hot lead · warmth 95 · on top of your list", tijd: "10:05 PM" },
    ],
  },
  {
    id: "dak",
    label: "Roofing",
    bedrijf: "Summit Roofing",
    script: [
      { van: "klant", tekst: "Do you also do flat roofs? Ours is leaking a bit.", tijd: "Sun 10:12" },
      { van: "ava", tekst: "Yes, flat roofs are one of our specialties. How big is the roof roughly, and since when is it leaking?", tijd: "Sun 10:12" },
      { van: "klant", tekst: "About 400 sq ft. Since the storm last week.", tijd: "Sun 10:13" },
      { van: "ava", tekst: "Then it's best to have it checked soon. Can I take your name and email for an inspection appointment?", tijd: "Sun 10:13" },
      { van: "klant", tekst: "Laura, laura@example.com", tijd: "Sun 10:14" },
      { van: "systeem", tekst: "Hot lead · warmth 84 · in your morning summary", tijd: "Sun 10:14" },
    ],
  },
];

export function Voorbeelden() {
  const [actief, setActief] = useState(0);
  const [stap, setStap] = useState(VOORBEELDEN[0]!.script.length);
  const [ref, zichtbaar] = useInView<HTMLDivElement>("-20% 0px");
  const vb = VOORBEELDEN[actief]!;

  useEffect(() => {
    if (!zichtbaar || rustig()) {
      setStap(vb.script.length);
      return;
    }
    setStap(1);
    let i = 1;
    const id = window.setInterval(() => {
      i += 1;
      setStap(i);
      if (i >= vb.script.length) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [zichtbaar, actief, vb.script.length]);

  return (
    <section aria-labelledby="vb-titel" className="vx-sectie vx-vb" id="examples">
      <div className="vx-vb__tekst" data-reveal="">
        <p className="vx-label">Examples</p>
        <h2 className="v-h2" id="vb-titel">
          See Volgo at work.
        </h2>
        <p className="v-lede">
          Volgo knows your services, prices and service area, asks one question at a time and always asks permission before passing someone on. Pick an
          example:
        </p>
        <div className="vx-tabs" role="tablist">
          {VOORBEELDEN.map((v, i) => (
            <button aria-selected={i === actief} key={v.id} onClick={() => setActief(i)} role="tab" type="button">
              {v.label}
            </button>
          ))}
        </div>
        <ul className="vx-vb__punten">
          <li>Answers in the visitor&apos;s own language</li>
          <li>Never makes up prices: only what you tell it</li>
          <li>You can take over any chat yourself</li>
        </ul>
        <div className="vx-vb__acties">
          <TryAvaButton />
          <a className="v-cta-ghost" href="#demo">
            Try it on a website below
          </a>
        </div>
      </div>
      <div aria-label={`Example conversation for ${vb.bedrijf}`} className="v-phone vx-vb__tel" data-reveal="" ref={ref} role="img">
        <div className="v-phone__screen">
          <div className="v-phone__bar">
            <span aria-hidden="true" className="v-phone__avatar" />
            <div>
              <strong>Volgo</strong>
              <small>Assistant at {vb.bedrijf}</small>
            </div>
          </div>
          <ul className="v-chat" key={vb.id}>
            {vb.script.map((m, i) => (
              <li className={`v-msg v-msg--${m.van}`} data-on={i < stap ? "1" : "0"} key={i}>
                <p>{m.tekst}</p>
                <time>{m.tijd}</time>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* What is one extra job worth?                                        */
/* ------------------------------------------------------------------ */

const euro = (n: number) => `€${Math.round(n).toLocaleString("en-GB")}`;

export function Rekenhulp() {
  const [waarde, setWaarde] = useState(6000);
  const [extra, setExtra] = useState(2);
  const [plan, setPlan] = useState<PlanId>("pro");
  const kosten = PLANS[plan].prijs / 100;
  const omzet = waarde * extra;
  const keer = omzet / kosten;

  return (
    <section aria-labelledby="rh-titel" className="vx-sectie vx-reken">
      <div className="vx-reken__kaart" data-reveal="">
        <div className="vx-reken__invoer">
          <p className="vx-label">Your numbers</p>
          <h2 className="v-h2" id="rh-titel">
            What is one extra job worth to you?
          </h2>
          <label className="vx-schuif">
            <span>
              Average job value <b>{euro(waarde)}</b>
            </span>
            <input max={50000} min={500} onChange={(e) => setWaarde(Number(e.target.value))} step={500} type="range" value={waarde} />
          </label>
          <label className="vx-schuif">
            <span>
              Extra jobs per month thanks to faster replies <b>{extra}</b>
            </span>
            <input max={10} min={1} onChange={(e) => setExtra(Number(e.target.value))} step={1} type="range" value={extra} />
          </label>
          <div className="vx-reken__plan" role="radiogroup" aria-label="Plan">
            {ZICHTBAAR.map((id) => (
              <button aria-checked={plan === id} key={id} onClick={() => setPlan(id)} role="radio" type="button">
                {PLANS[id].naam} · €{PLANS[id].prijsTekst}
              </button>
            ))}
          </div>
        </div>
        <div className="vx-reken__uit" aria-live="polite">
          <span>Extra revenue per month</span>
          <strong>{euro(omzet)}</strong>
          <span>
            Volgo {PLANS[plan].naam} costs {euro(kosten)} per month
          </span>
          <p className="vx-reken__keer">
            {keer >= 1 ? (
              <>
                Pays for itself <b>{keer >= 10 ? Math.round(keer) : keer.toFixed(1)}×</b>
              </>
            ) : (
              <>Covers {Math.round(keer * 100)}% of the cost</>
            )}
          </p>
          <small>An example with your own numbers, not a promise. Prices excl. VAT.</small>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* When do you get what                                                */
/* ------------------------------------------------------------------ */

const TIJDLIJN = [
  { wanneer: "Today", titel: "Choose your plan", tekst: "Pick a plan and start your 7-day trial for €1. You land in your own dashboard right away." },
  { wanneer: "Within 5 minutes", titel: "Volgo is live on your website", tekst: "Paste one line of code (there's a guide for WordPress, Wix, Shopify, Squarespace and Webflow), or we add it for you. Tell Volgo about your services and prices in about two minutes." },
  { wanneer: "From the first visitor", titel: "Leads come in, sorted for you", tekst: "Volgo answers every visitor, collects name and phone or email with permission, and scores each lead. Hot leads reach your inbox right away, plus a summary in your inbox every morning." },
  { wanneer: "Complete: within 1 working day", titel: "We plan your new website with you", tekst: "Tell us what you want in the Website tab, by chat or in a call. We build it with photos, video and Volgo inside, you review it, and it goes live on your own domain." },
  { wanneer: "Every month", titel: "You stay because it works", tekst: "Your plan renews monthly. Not for you? Cancel in your dashboard and it stops at the end of the paid month. Your domain name stays yours." },
];

export function Tijdlijn() {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || rustig()) {
      el?.style.setProperty("--p", "1");
      return;
    }
    let raf = 0;
    const zet = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.65 - r.top) / r.height));
      el.style.setProperty("--p", p.toFixed(3));
      el.querySelectorAll<HTMLElement>("li").forEach((li) => {
        const lr = li.getBoundingClientRect();
        li.classList.toggle("is-aan", lr.top < window.innerHeight * 0.65);
      });
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
  }, []);

  return (
    <section aria-labelledby="tl-titel" className="vx-sectie vx-tijd" id="how">
      <header className="vx-kop vx-kop--midden" data-reveal="">
        <p className="vx-label">How and when</p>
        <h2 className="v-h2" id="tl-titel">
          From sign-up to your first lead.
        </h2>
        <p className="v-lede">No setup fees, no long contracts. This is exactly what happens, and when.</p>
      </header>
      <ol className="vx-tijd__lijst" ref={ref}>
        {TIJDLIJN.map((s, i) => (
          <li key={s.titel}>
            <span aria-hidden="true" className="vx-tijd__nr">
              {i + 1}
            </span>
            <div>
              <time>{s.wanneer}</time>
              <h3>{s.titel}</h3>
              <p>{s.tekst}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Live demo: the real sample website with the real Volgo, inside a frame */
/* ------------------------------------------------------------------ */

type AvaVenster = Window & { VolgoAva?: { open: () => void; afspraak: () => void; vraag: (t: string) => void } };

/**
 * The real sample website with the real Volgo, inside a frame. No sign-up and no payment.
 * Desktop: scaled browser window that scrolls along with the page. Phones: the sample site at its real size
 * (readable, no tiny inputs), scrollable on its own, with a full-screen mode.
 */
export function LiveDemo({ taal = "en", laadNu = false }: { taal?: RouteTaal; laadNu?: boolean }) {
  const t = TEKST[taal];
  const demo = DEMO[taal];
  const [modus, setModus] = useState<"desktop" | "mobiel">("desktop");
  const [klein, setKlein] = useState(false);
  const [vol, setVol] = useState(false);
  const [ref, inBeeld] = useInView<HTMLDivElement>("300px 0px");
  const zichtbaar = inBeeld || laadNu;
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [schaal, setSchaal] = useState(0.8);
  const BREED = modus === "desktop" ? 1280 : 390;
  const HOOG = modus === "desktop" ? 780 : 800;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 759px)");
    const zet = () => {
      setKlein(mq.matches);
      if (mq.matches) setModus("mobiel");
      else setVol(false);
    };
    zet();
    mq.addEventListener("change", zet);
    return () => mq.removeEventListener("change", zet);
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el || klein) return;
    const zet = () => setSchaal(Math.min(1, el.clientWidth / BREED));
    zet();
    const ro = new ResizeObserver(zet);
    ro.observe(el);
    return () => ro.disconnect();
  }, [BREED, klein]);

  // Full screen on phones: lock the page behind it, Escape closes.
  useEffect(() => {
    if (!vol) return;
    const html = document.documentElement;
    const oud = html.style.overflow;
    html.style.overflow = "hidden";
    const toets = (e: KeyboardEvent) => e.key === "Escape" && setVol(false);
    window.addEventListener("keydown", toets);
    return () => {
      html.style.overflow = oud;
      window.removeEventListener("keydown", toets);
    };
  }, [vol]);

  // Volgo's own chat bubble (bottom right of this page) hides while the demo is on screen, so there is only one Volgo to talk to.
  const sectie = useRef<HTMLElement>(null);
  const [demoInBeeld, setDemoInBeeld] = useState(false);
  useEffect(() => {
    const el = sectie.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setDemoInBeeld(Boolean(e?.isIntersecting)), { rootMargin: "-35% 0px -35% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const eigen = document.getElementById("volgo-ava");
    if (!eigen) return;
    // Never hide it while its consent card is open: the visitor has to be able to make that choice.
    const keuzeOpen = Boolean((eigen.shadowRoot ?? eigen).querySelector(".ok-laag"));
    eigen.style.visibility = (demoInBeeld || vol) && !keuzeOpen ? "hidden" : "";
    return () => {
      eigen.style.visibility = "";
    };
  }, [demoInBeeld, vol]);

  // The first message a visitor sends in the demo (typed or via an example question). Only the fact, never the text.
  useEffect(() => {
    const op = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if ((e.data as { volgo?: string } | null)?.volgo === "demo-bericht") meet("demo_bericht");
    };
    window.addEventListener("message", op);
    return () => window.removeEventListener("message", op);
  }, []);

  // Desktop: while you scroll the page, the sample website scrolls along inside the frame.
  const baan = useRef<HTMLDivElement>(null);
  const [afstand, setAfstand] = useState(0);
  const meetHoogte = () => {
    if (klein) return setAfstand(0);
    const doc = frame.current?.contentDocument?.documentElement;
    if (doc) setAfstand(Math.max(0, (doc.scrollHeight - HOOG) * schaal));
  };
  useEffect(meetHoogte, [schaal, HOOG, klein]);
  useEffect(() => {
    if (klein) return;
    let raf = 0;
    const zet = () => {
      raf = 0;
      const b = baan.current;
      const w = frame.current?.contentWindow;
      const doc = frame.current?.contentDocument?.documentElement;
      if (!b || !w || !doc) return;
      const r = b.getBoundingClientRect();
      const ruimte = r.height - window.innerHeight * 0.92;
      const p = ruimte > 0 ? Math.min(1, Math.max(0, (90 - r.top) / ruimte)) : 0;
      w.scrollTo(0, p * Math.max(0, doc.scrollHeight - HOOG));
    };
    const op = () => {
      if (!raf) raf = requestAnimationFrame(zet);
    };
    window.addEventListener("scroll", op, { passive: true });
    return () => window.removeEventListener("scroll", op);
  }, [HOOG, klein]);

  /** Talk to Volgo inside the frame; the script there may still be starting, so retry for a few seconds. */
  const ava = (actie: "open" | "afspraak" | "vraag", tekst?: string) => {
    let pogingen = 0;
    const probeer = () => {
      const w = frame.current?.contentWindow as AvaVenster | null | undefined;
      const api = w?.VolgoAva;
      if (api) {
        if (actie === "vraag" && tekst) api.vraag(tekst);
        else if (actie === "afspraak") api.afspraak();
        else api.open();
        return;
      }
      if (++pogingen < 30) window.setTimeout(probeer, 300);
    };
    probeer();
  };

  const src = klein ? demo.src : `${demo.src}?embed=1`;
  const naarAbos = () => {
    meet("abo_klik");
    setVol(false);
  };

  return (
    <section aria-labelledby="live-titel" className="vx-sectie vx-live" id="demo" ref={sectie}>
      <header className="vx-kop vx-kop--midden" data-reveal="" {...handgeschreven(taal)}>
        <p className="vx-label">{t.demoLabel}</p>
        <h2 className="v-h2" id="live-titel">
          {t.demoTitel}
        </h2>
        <p className="v-lede">{t.demoIntro(demo.bedrijf)}</p>
      </header>

      <div className="vx-live__vragen" {...handgeschreven(taal)}>
        <p>{t.voorbeeldKop}</p>
        <div>
          {t.vragen.map((v) => (
            <button
              key={v}
              onClick={() => {
                ava("vraag", v);
                // Bring the sample website (where the answer appears) into view.
                ref.current?.scrollIntoView({ behavior: rustig() ? "auto" : "smooth", block: klein ? "center" : "start" });
              }}
              type="button"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="vx-live__bediening" {...handgeschreven(taal)}>
        {klein ? (
          <span />
        ) : (
          <div className="vx-tabs" role="tablist" aria-label={t.schermKeuze}>
            <button aria-selected={modus === "desktop"} onClick={() => setModus("desktop")} role="tab" type="button">
              Desktop
            </button>
            <button aria-selected={modus === "mobiel"} onClick={() => setModus("mobiel")} role="tab" type="button">
              {taal === "nl" ? "Mobiel" : "Mobile"}
            </button>
          </div>
        )}
        <div className="vx-live__knoppen">
          <button onClick={() => ava("open")} type="button">
            {t.openChat}
          </button>
          {demo.boeken ? (
            <button onClick={() => ava("afspraak")} type="button">
              {t.afspraak}
            </button>
          ) : null}
          {klein ? (
            <button className="is-hoofd" onClick={() => setVol(true)} type="button">
              {t.volScherm}
            </button>
          ) : null}
        </div>
      </div>

      <div className="vx-live__baan" ref={baan} style={klein ? undefined : { height: HOOG * schaal + (modus === "desktop" ? 90 : 120) + afstand }}>
        <div className={klein ? undefined : "vx-live__plak"}>
          <div className={`vx-live__toestel vx-live__toestel--${klein ? "native" : modus}${vol ? " is-vol" : ""}`} ref={ref}>
            {klein ? (
              <div className="vx-live__volbalk" {...handgeschreven(taal)}>
                <span>
                  <b>{demo.bedrijf}</b>
                  <small>{t.demoLabel}</small>
                </span>
                {vol ? (
                  <>
                    <a href="#pricing" onClick={naarAbos}>
                      {t.balkAbos}
                    </a>
                    <button onClick={() => setVol(false)} type="button">
                      {t.sluiten}
                    </button>
                  </>
                ) : null}
              </div>
            ) : modus === "desktop" ? (
              <div aria-hidden="true" className="vx-live__chrome">
                <i />
                <i />
                <i />
                <span>{demo.domein}</span>
              </div>
            ) : (
              <div aria-hidden="true" className="vx-live__notch" />
            )}
            <div className="vx-live__scherm" ref={box} style={klein ? undefined : { height: HOOG * schaal }}>
              {zichtbaar ? (
                <iframe
                  key={src}
                  onLoad={() => {
                    meetHoogte();
                    window.setTimeout(meetHoogte, 1500);
                  }}
                  ref={frame}
                  src={src}
                  style={klein ? undefined : { width: BREED, height: HOOG, transform: `scale(${schaal})` }}
                  title={t.frameTitel(demo.bedrijf)}
                />
              ) : (
                <p className="vx-live__laden">{t.laden}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="vx-live__privacy" {...handgeschreven(taal)}>
        {t.privacy}
      </p>

      <aside aria-labelledby="live-vervolg" className="vx-live__vervolg" {...handgeschreven(taal)}>
        <div>
          <h3 id="live-vervolg">{t.vervolgKop}</h3>
          <p>{t.vervolgTekst}</p>
        </div>
        <a className="vs-start" href="#pricing" onClick={naarAbos}>
          {t.vervolgKnop}
        </a>
      </aside>
    </section>
  );
}

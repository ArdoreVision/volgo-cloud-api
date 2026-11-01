import type { CSSProperties } from "react";

import { INSTAGRAM_PROFIEL, VOLGO_X } from "@/lib/contact";

/* ------------------------------------------------------------------ */
/* The "why": the problem Volgo exists for, in numbers people feel     */
/* ------------------------------------------------------------------ */

export function Waarom() {
  const punten = [
    { groot: "After 6 PM", klein: "is when most homeowners finally sit down to compare contractors. Your office is closed. Theirs isn't." },
    { groot: "First reply wins", klein: "Whoever answers first usually gets the visit, the quote and the job. Speed beats price more often than you'd think." },
    { groot: "One lost job", klein: "a month costs more than a year of Volgo. Not because leads are rare, but because they go cold while you're on the job site." },
  ];
  return (
    <section aria-labelledby="wr-titel" className="vx-sectie vx-waarom" id="why-volgo">
      <header className="vx-kop" data-reveal="">
        <p className="vx-label">Why Volgo exists</p>
        <h2 className="v-h2" id="wr-titel">
          Great businesses lose jobs for one dumb reason: nobody answered.
        </h2>
        <p className="v-lede">
          Contractors, installers and studios are brilliant at the work and terrible at the follow-up, because they are doing the work. Volgo was built to close
          that gap: an assistant that answers every visitor in seconds and tells you who is actually ready to buy.
        </p>
      </header>
      <div className="vx-waarom__grid">
        {punten.map((p, i) => (
          <article data-reveal="" key={p.groot} style={{ "--d": `${i * 110}ms` } as CSSProperties}>
            <strong>{p.groot}</strong>
            <p>{p.klein}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Why this isn't "just a chatbot": the parts that are hard to copy     */
/* ------------------------------------------------------------------ */

const MOAT = [
  {
    t: "Trained on your business, not the internet",
    d: "Five questions at sign-up plus your own prices, area and services. AVA talks like your best employee, never invents prices, and passes the hard questions to you.",
    i: "M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7z",
  },
  {
    t: "Warmth score on every lead",
    d: "AVA reads the whole conversation and scores 0–100 how ready someone is, with the reason. Your list sorts itself; you only chase buyers.",
    i: "M4 17l5-5 4 4 7-8M15 8h5v5",
  },
  {
    t: "Books the appointment inside the chat",
    d: "Visitors see only your free slots and book on the spot. No back-and-forth, no form that waits until Monday.",
    i: "M3.5 5.5h17v15h-17zM3.5 9.5h17M8 3v4M16 3v4",
  },
  {
    t: "Done for you, including the website",
    d: "On Pro and Premium we build and host your website with AVA inside. One partner for the whole front door of your business.",
    i: "M3 5h18v13H3zM3 9h18M7 7h.01M10 7h.01",
  },
];

export function Moat() {
  return (
    <section aria-labelledby="mt-titel" className="vx-sectie" id="not-a-chatbot">
      <header className="vx-kop vx-kop--midden" data-reveal="">
        <p className="vx-label">Not another chatbot</p>
        <h2 className="v-h2" id="mt-titel">
          Four things a plug-in chat widget can’t do.
        </h2>
        <p className="v-lede">Most website chats collect an email and stop. Volgo is built end-to-end for businesses that sell on quotes.</p>
      </header>
      <div className="vx-voordelen">
        {MOAT.map((v, i) => (
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
/* Trust: who is behind it, where data lives, what you can rely on     */
/* ------------------------------------------------------------------ */

export function Vertrouwen() {
  const feiten = [
    { k: "Company", v: "Volgo is a service by Hanssens Cornerstone Capital, Vlissingen (NL), KvK 98133438." },
    { k: "Your data", v: "Visitor details are used only to follow up on their request. We are the processor, you stay in control. Data Processing Agreement included." },
    { k: "Hosting", v: "Runs on Cloudflare’s global network; email is sent from EU infrastructure. AVA is powered by Claude, the model from Anthropic." },
    { k: "No lock-in", v: "Monthly plans, cancel from your dashboard, your domain name stays yours. Invoices and card changes without emailing anyone." },
  ];
  return (
    <section aria-labelledby="vt-titel" className="vx-sectie vx-trust">
      <header className="vx-kop" data-reveal="">
        <p className="vx-label">Built to be trusted</p>
        <h2 className="v-h2" id="vt-titel">
          Serious software, run by a real company.
        </h2>
      </header>
      <dl className="vx-trust__lijst">
        {feiten.map((f, i) => (
          <div data-reveal="" key={f.k} style={{ "--d": `${i * 90}ms` } as CSSProperties}>
            <dt>{f.k}</dt>
            <dd>{f.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* From the founder + follow the build                                 */
/* ------------------------------------------------------------------ */

export function Founder() {
  return (
    <section aria-labelledby="fo-titel" className="vx-sectie vx-founder">
      <div className="vx-founder__kaart" data-reveal="">
        <p className="vx-label">From the founder</p>
        <h2 className="v-h2" id="fo-titel">
          “Every missed evening message is a job you never knew you lost.”
        </h2>
        <p className="v-lede">
          I started Volgo after watching good businesses lose work to whoever replied first. Not better companies, faster ones. AVA gives you that speed without
          hiring anyone, and tells you honestly which leads deserve your morning. We build it in the open: follow along, ask hard questions, and tell me what
          would make it indispensable for your trade.
        </p>
        <p className="vx-founder__naam">
          <strong>Damien Hanssens</strong> · Founder, Volgo
        </p>
        <div className="vx-founder__links">
          <a href={INSTAGRAM_PROFIEL} rel="noopener noreferrer" target="_blank">
            Follow the build on Instagram
          </a>
          <a href={VOLGO_X} rel="noopener noreferrer" target="_blank">
            Updates on X
          </a>
          <a href="mailto:volgo.app@outlook.com?subject=Volgo%20partnership">Partners &amp; investors: talk to the founder</a>
        </div>
      </div>
    </section>
  );
}

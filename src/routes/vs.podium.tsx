import { createFileRoute } from "@tanstack/react-router";

import { AvaChat } from "@/components/volgo/ava-chat";
import { Footer } from "@/components/volgo/footer";
import { Nav } from "@/components/volgo/nav";
import { Rekenhulp, useReveal } from "@/components/volgo/landing";
import { isIngelogd } from "@/lib/api/assistent.functions";
import { PLANS, PROEF_DAGEN } from "@/lib/plans";
import "@/volgo.css";

/**
 * Comparison page for the "podium alternative" search and ad traffic.
 * Facts about Podium are what their site and public reviews show in 2026: no public pricing
 * (quote via sales since late 2025), reported $399–$599 per month, demo call before you can start.
 */
const RIJEN: { wat: string; volgo: string; podium: string; win?: boolean }[] = [
  { wat: "Price", volgo: `From €${PLANS.start.prijsTekst}/month, shown on the site`, podium: "Not published — quote via sales (reported $399–$599/mo)", win: true },
  { wat: "Getting started", volgo: `Pick a plan, ${PROEF_DAGEN} days free, live in 5 minutes`, podium: "Book a demo call with a sales rep first", win: true },
  { wat: "Contract", volgo: "Monthly, cancel any time in your dashboard", podium: "Typically an annual contract", win: true },
  { wat: "AI on your website", volgo: "AVA answers every visitor in seconds, day and night", podium: "Webchat with AI employee" },
  { wat: "Books the appointment", volgo: "In the chat, on your calendar", podium: "Yes, via AI scheduler" },
  { wat: "Tells you who to call first", volgo: "Every lead scored 0–100 + morning summary", podium: "Lead inbox" },
  { wat: "Custom website included", volgo: "Pro and Premium: we build it, AVA inside", podium: "No", win: true },
  { wat: "Languages", volgo: "AVA replies in the visitor's language", podium: "English-first" },
  { wat: "Reviews, texting, payments", volgo: "Not yet — we do leads and bookings only", podium: "Yes, big all-in-one suite" },
  { wat: "Built for", volgo: "Owner-run businesses: contractors, dentists, hotels, salons", podium: "Multi-location businesses and franchises" },
];

export const Route = createFileRoute("/vs/podium")({
  loader: async () => ({ ingelogd: await isIngelogd().catch(() => false) }),
  head: () => ({
    meta: [
      { title: "Volgo vs Podium · The Podium alternative from €147 a month, no sales call" },
      {
        name: "description",
        content: `Looking for a Podium alternative? Volgo answers every website visitor, books the appointment and scores your leads — from €${PLANS.start.prijsTekst} a month, monthly, no demo call, live in 5 minutes.`,
      },
      { property: "og:url", content: "https://thevolgo.app/vs/podium" },
    ],
    links: [{ rel: "canonical", href: "https://thevolgo.app/vs/podium" }],
  }),
  component: VsPodium,
});

function VsPodium() {
  useReveal();
  return (
    <div className="volgo volgo--simpel">
      <Nav ingelogd={Route.useLoaderData().ingelogd} />
      <main>
        <section aria-labelledby="vs-title" className="vs-hero vs-hero--vs" id="top">
          <div className="vs-hero__copy">
            <p className="vx-label">Volgo vs Podium</p>
            <h1 className="vs-hero__title" id="vs-title">
              Same job. No sales call. A fraction of the price.
            </h1>
            <p className="vs-hero__sub">
              Podium is a great all-in-one suite for big, multi-location businesses — with a demo call, a quote and usually a yearly contract. Volgo does the one
              thing that makes you money: answer every lead, book the appointment, tell you who to call first. From €{PLANS.start.prijsTekst} a month, live today.
            </p>
            <a className="vs-start vs-start--groot" href="/pricing#plans">
              Try Volgo {PROEF_DAGEN} days free
            </a>
            <ul aria-label="What you can count on" className="vs-hero__proof">
              <li>€0 today, cancel any time</li>
              <li>Live on your website in 5 minutes</li>
              <li>No demo call, no contract</li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="tabel-title" className="vx-sectie v-vs">
          <header className="vx-kop vx-kop--midden" data-reveal="">
            <h2 className="v-h2" id="tabel-title">
              Side by side.
            </h2>
            <p className="v-lede">Honest comparison. Podium does more things; Volgo does the lead-to-booking part simpler, faster and cheaper.</p>
          </header>
          <div className="v-vs__tabel" data-reveal="" role="table">
            <div className="v-vs__rij v-vs__rij--kop" role="row">
              <span role="columnheader" />
              <span className="v-vs__volgo" role="columnheader">
                Volgo
              </span>
              <span role="columnheader">Podium</span>
            </div>
            {RIJEN.map((r) => (
              <div className={`v-vs__rij${r.win ? " v-vs__rij--win" : ""}`} key={r.wat} role="row">
                <span className="v-vs__wat" role="rowheader">
                  {r.wat}
                </span>
                <span className="v-vs__volgo" role="cell">
                  {r.win ? <b aria-hidden="true">✓ </b> : null}
                  {r.volgo}
                </span>
                <span role="cell">{r.podium}</span>
              </div>
            ))}
          </div>
          <p className="v-vs__noot">
            Podium details from podium.com and public reviews, November 2026. Podium publishes no prices; the range shown is what reviewers report. Podium is a
            trademark of Podium Corporation; Volgo is not affiliated with Podium.
          </p>
        </section>

        <section aria-labelledby="wie-title" className="vx-sectie v-vs__wie">
          <header className="vx-kop vx-kop--midden" data-reveal="">
            <h2 className="v-h2" id="wie-title">
              Which one is for you?
            </h2>
          </header>
          <div className="v-na__regels" data-reveal="">
            <p>
              <strong>Pick Podium</strong> if you run many locations, want reviews, texting, payments and phones in one suite, and have a team to run it.
            </p>
            <p>
              <strong>Pick Volgo</strong> if you run your own business, lose leads after hours or while you work, and want them answered and booked without you.
            </p>
            <p>
              <strong>Switching?</strong> Nothing to migrate. Add one line of code to your site, or let us build your site on Pro. Your Podium contract can run
              out on its own.
            </p>
          </div>
        </section>

        <Rekenhulp />

        <section aria-labelledby="cta-title" className="v-final" data-reveal="">
          <h2 className="v-h2 v-center" id="cta-title">
            See it on your own website today.
          </h2>
          <p className="v-lede v-center">
            {PROEF_DAGEN} days free, €0 today. If it doesn’t book you a single extra appointment, cancel before day {PROEF_DAGEN} and pay nothing.
          </p>
          <div className="v-final__actions">
            <a className="v-cta-primary" href="/pricing#plans">
              Try Volgo {PROEF_DAGEN} days free
            </a>
            <a className="v-cta-ghost" href="/#demo">
              Watch AVA answer a lead
            </a>
          </div>
        </section>
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}

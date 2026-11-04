import { AvaChat } from "@/components/volgo/ava-chat";
import { Footer } from "@/components/volgo/footer";
import { Nav } from "@/components/volgo/nav";
import { Rekenhulp, useReveal } from "@/components/volgo/landing";
import { PROEF_DAGEN } from "@/lib/plans";
import { VERGELIJKINGEN, type Vergelijking } from "@/lib/vergelijkingen";

/** Shared "Volgo vs <competitor>" page. Content comes from lib/vergelijkingen.ts. */
export function VsPagina({ v, ingelogd }: { v: Vergelijking; ingelogd: boolean }) {
  useReveal();
  const anderen = Object.values(VERGELIJKINGEN).filter((x) => x.slug !== v.slug);
  return (
    <div className="volgo volgo--simpel">
      <Nav ingelogd={ingelogd} />
      <main>
        <section aria-labelledby="vs-title" className="vs-hero vs-hero--vs" id="top">
          <div className="vs-hero__copy">
            <p className="vx-label">Volgo vs {v.naam}</p>
            <h1 className="vs-hero__title" id="vs-title">
              {v.titel}
            </h1>
            <p className="vs-hero__sub">{v.intro}</p>
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
            <p className="v-lede">Honest comparison. {v.naam} does some things Volgo doesn’t; Volgo does the lead-to-booking part simpler, faster and without you.</p>
          </header>
          <div className="v-vs__tabel" data-reveal="" role="table">
            <div className="v-vs__rij v-vs__rij--kop" role="row">
              <span role="columnheader" />
              <span className="v-vs__volgo" role="columnheader">
                Volgo
              </span>
              <span role="columnheader">{v.naam}</span>
            </div>
            {v.rijen.map((r) => (
              <div className={`v-vs__rij${r.win ? " v-vs__rij--win" : ""}`} key={r.wat} role="row">
                <span className="v-vs__wat" role="rowheader">
                  {r.wat}
                </span>
                <span className="v-vs__volgo" role="cell">
                  {r.win ? <b aria-hidden="true">✓ </b> : null}
                  {r.volgo}
                </span>
                <span className="v-vs__ander" data-naam={v.naam} role="cell">
                  {r.ander}
                </span>
              </div>
            ))}
          </div>
          <p className="v-vs__noot">
            {v.naam} details from their own website and public reviews, {v.peildatum}. {v.noot} {v.naam} is a trademark of {v.eigenaar}; Volgo is not
            affiliated with {v.naam}.
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
              <strong>Pick {v.naam}</strong> {v.kiesAnder.replace(/^Pick \S+ /, "")}
            </p>
            <p>
              <strong>Pick Volgo</strong> {v.kiesVolgo.replace(/^Pick Volgo /, "")}
            </p>
            <p>
              <strong>Switching?</strong> {v.overstappen}
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
          {anderen.length ? (
            <p className="v-vs__meer">
              Also compare:{" "}
              {anderen.map((a, i) => (
                <span key={a.slug}>
                  {i > 0 ? " · " : ""}
                  <a href={`/vs/${a.slug}`}>Volgo vs {a.naam}</a>
                </span>
              ))}
            </p>
          ) : null}
        </section>
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}

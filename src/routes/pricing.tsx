import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AvaChat } from "@/components/volgo/ava-chat";
import { BookCall } from "@/components/volgo/book-call";
import { Footer } from "@/components/volgo/footer";
import { Nav } from "@/components/volgo/nav";
import { accountStatus } from "@/lib/api/assistent.functions";
import { startBetaling, uitloggen } from "@/lib/api/account.functions";
import { InstallGuides } from "@/components/volgo/install-guides";
import { PLANS, START_STAPPEN, VERGELIJKING, type PlanId, ZICHTBAAR, planTitel } from "@/lib/plans";
import "@/volgo.css";
import "@/volgo-donker.css";

export const Route = createFileRoute("/pricing")({
  validateSearch: (s: Record<string, unknown>): { expired?: number } => ({ expired: s.expired === "1" || s.expired === 1 ? 1 : undefined }),
  loader: async () => accountStatus().catch(() => ({ ingelogd: false, toegang: false, email: "", plan: "", eigenaar: false })),
  head: () => ({
    meta: [
      { title: "Pricing · Volgo · The appointment setter for your own website, €49,99 a month" },
      { name: "description", content: "Volgo pricing: €49,99 per month for the appointment setter in your own website. It answers every visitor, asks your questions and books the appointment. Install with one line of code. No website needed, no setup costs. Excl. VAT, cancel any time." },
      { property: "og:url", content: "https://thevolgo.app/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://thevolgo.app/pricing" }],
  }),
  component: Abonnement,
});

/** One plan: a single centred card instead of a row of cards. */
const EEN = ZICHTBAAR.length === 1 ? { gridTemplateColumns: "minmax(0, 520px)", justifyContent: "center" } : undefined;

function Abonnement() {
  const { expired: verlopen } = Route.useSearch();
  const { ingelogd, toegang, email, plan: huidig, eigenaar } = Route.useLoaderData();
  const wisselen = ingelogd && toegang;
  // On one of the earlier website packages: it stays as it is, the button below is not a switch.
  const ouderPakket = wisselen && !ZICHTBAAR.includes(huidig as PlanId);
  const [bezig, setBezig] = useState<PlanId | null>(null);
  const [fout, setFout] = useState("");

  async function kies(plan: PlanId) {
    setFout("");
    setBezig(plan);
    try {
      const res = await startBetaling({ data: { plan } });
      if (res.ok) window.location.href = res.url;
      else {
        setFout(res.message);
        setBezig(null);
      }
    } catch {
      setFout("Something went wrong. Please try again.");
      setBezig(null);
    }
  }

  return (
    <div className="volgo volgo--donker">
      <Nav ingelogd={ingelogd && !verlopen} />
      <main className="v-pricing">
        <header className="v-pricing__head">
          {ingelogd && toegang ? (
            <div className="v-al-account">
              <p>
                You’re logged in as <strong>{email}</strong> on <strong>{PLANS[huidig as PlanId] ? planTitel(PLANS[huidig as PlanId]) : "Volgo"}</strong>.
                {eigenaar ? "" : " Only the account owner can change the plan."}
              </p>
              <div>
                <a className="v-btn-blauw" href="/dashboard">
                  Go to my dashboard
                </a>
                <button
                  className="v-dash__logout"
                  onClick={() => void uitloggen().then(() => window.location.reload())}
                  type="button"
                >
                  Log out
                </button>
              </div>
            </div>
          ) : null}
          {verlopen ? (
            <p className="v-melding">Your trial or subscription has ended. Choose a plan to continue — all your data is still here.</p>
          ) : null}
          <h1 className="v-h2 v-center">{wisselen ? "Your plan." : "One plan. Everything in it."}</h1>
          <p className="v-lede v-center">Volgo is the appointment setter you put in your own website. €{PLANS.start.prijsTekst} per month. No website needed, no setup costs. Cancel any time.</p>
        </header>
        <div className="v-plans" id="plans" style={EEN}>
          {ZICHTBAAR.map((id) => {
            const p = PLANS[id];
            return (
              <article className={`v-plan v-plan--${id}`} key={id}>
                {wisselen && huidig === id ? <p className="v-plan__badge">Your plan</p> : p.badge ? <p className="v-plan__badge">{p.badge}</p> : null}
                <h2 className="v-plan__name">{p.naam}</h2>
                <p className="v-plan__tag">{p.tagline}</p>
                <p className="v-plan__price">
                  {p.opstart ? (
                    <>
                      <span>€{p.opstart / 100}</span> one-time
                    </>
                  ) : (
                    <>
                      <span>€{!wisselen && p.intro ? p.intro.prijsTekst : p.prijsTekst}</span> per month
                    </>
                  )}
                </p>
                {!wisselen && p.intro ? (
                  <p className="v-plan__kaart">
                    First {p.intro.maanden} months · then €{p.prijsTekst} per month · the discount is applied automatically at checkout
                  </p>
                ) : null}
                {!wisselen && p.proefDagen ? <p className="v-plan__kaart">First {p.proefDagen} days for €1 · cancel within {p.proefDagen} days and pay nothing more</p> : null}
                {p.opstart ? <p className="v-plan__kaart">Volgo included · €{p.prijsTekst} per month</p> : null}
                <button
                  className={`v-plan__cta v-plan__cta--${id}`}
                  disabled={bezig !== null || ouderPakket || (wisselen && (huidig === id || !eigenaar))}
                  onClick={() => void kies(id)}
                  type="button"
                >
                  {bezig === id
                    ? "One moment…"
                    : ouderPakket
                      ? "Included in your package"
                      : wisselen
                      ? huidig === id
                        ? "Current plan"
                        : `Switch to ${planTitel(p)}`
                      : p.proefDagen
                        ? `Start ${p.proefDagen} days for €1`
                        : "Start now · pay securely"}
                </button>
                <p className="v-plan__kaart">{ouderPakket ? "Your website package already has Volgo inside" : wisselen ? "Billed monthly · Cancel any time" : p.opstart ? `Today €${((p.prijs + p.opstart) / 100).toFixed(2).replace(".", ",")}: your website + the first month of Volgo` : "Billed monthly · Cancel any time"}</p>
                <ul className="v-plan__kern">
                  {p.kern.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="v-plan__hoe">{START_STAPPEN[id].titel}</p>
                <ul className="v-plan__list">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
        {fout ? <p className="v-err v-err--c" role="alert">{fout}</p> : null}
        <section aria-labelledby="after-title" className="v-na">
          <h2 className="v-h2 v-center" id="after-title">
            What happens after you subscribe.
          </h2>
          <p className="v-lede v-center">Here is exactly how you get going.</p>
          <div className="v-na__grid" style={EEN}>
            {ZICHTBAAR.map((id) => (
              <article className={`v-na__kaart v-na__kaart--${id}`} key={id}>
                <p className="v-na__plan">
                  {PLANS[id].naam} · {PLANS[id].opstart ? `€${PLANS[id].opstart / 100} one-time + ` : ""}€{PLANS[id].intro ? `${PLANS[id].intro.prijsTekst}/mo for ${PLANS[id].intro.maanden} months, then €${PLANS[id].prijsTekst}/mo` : `${PLANS[id].prijsTekst}/mo`}
                </p>
                <h3>{START_STAPPEN[id].titel}</h3>
                <ol>
                  {START_STAPPEN[id].stappen.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <p className="v-na__noot">Not technical? Email us your line from the dashboard and we put it on your website for you.</p>
              </article>
            ))}
          </div>

          <div className="v-na__install">
            <div>
              <h3>Install Volgo on your own website</h3>
              <p>
                After signing up you'll find your personal line of code in your dashboard under <strong>Installeren</strong>, with a step-by-step guide and a button that checks it is live. Paste it once
                and Volgo appears on every page. Pick your platform:
              </p>
            </div>
            <InstallGuides />
          </div>

          <div className="v-na__regels">
            <p>
<strong>One price:</strong> €{PLANS.start.prijsTekst} per month for Volgo in your own website. No setup costs and no website to buy. Today you pay the first month, by card, on Stripe's secure payment page.
            </p>
            <p>
              <strong>Cancel any time.</strong> In your dashboard under Subscription. Volgo and your dashboard stop at the end of your paid period.
              Your own website stays exactly as it is.
            </p>
          </div>
        </section>

        {/* A comparison only makes sense with more than one plan; with one plan the card above already lists everything. */}
        {ZICHTBAAR.length > 1 ? (
        <section aria-labelledby="compare-title" className="v-compare">
          <h2 className="v-h2 v-center" id="compare-title">
            Compare plans.
          </h2>
          <div className="v-compare__scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="v-sr">Feature</span>
                  </th>
                  {ZICHTBAAR.map((id) => (
                    <th key={id} scope="col">
                      {PLANS[id].naam}
                      <small>{PLANS[id].opstart ? `€${PLANS[id].opstart / 100} + ` : ""}€{PLANS[id].prijsTekst}/mo</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VERGELIJKING.map((rij) => (
                  <tr key={rij.label}>
                    <th scope="row">{rij.label}</th>
                    {ZICHTBAAR.map((id) => {
                      const v = rij[id];
                      return (
                        <td key={id}>
                          {v === true ? <span aria-label="Included" className="v-yes">✓</span> : v === false ? <span aria-label="Not included" className="v-no">–</span> : v}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        ) : null}
        <section className="v-pricing__boek" aria-label="Book a call">
          <h2 className="v-h2 v-center">Rather talk it through first?</h2>
          <BookCall />
        </section>
        <p className="v-pricing__note">Prices per month, excluding VAT. Already have an account? <a href="/login">Log in</a>.</p>
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}

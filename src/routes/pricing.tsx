import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AvaChat } from "@/components/volgo/ava-chat";
import { Footer } from "@/components/volgo/footer";
import { Nav } from "@/components/volgo/nav";
import { accountStatus } from "@/lib/api/assistent.functions";
import { startBetaling, uitloggen } from "@/lib/api/account.functions";
import { InstallGuides } from "@/components/volgo/install-guides";
import { PLANS, START_STAPPEN, VERGELIJKING, type PlanId } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/pricing")({
  validateSearch: (s: Record<string, unknown>): { expired?: number } => ({ expired: s.expired === "1" || s.expired === 1 ? 1 : undefined }),
  loader: async () => accountStatus().catch(() => ({ ingelogd: false, toegang: false, email: "", plan: "", eigenaar: false })),
  head: () => ({ meta: [{ title: "Pricing · Volgo" }] }),
  component: Abonnement,
});

function Abonnement() {
  const { expired: verlopen } = Route.useSearch();
  const { ingelogd, toegang, email, plan: huidig, eigenaar } = Route.useLoaderData();
  const wisselen = ingelogd && toegang;
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
    <div className="volgo">
      <Nav ingelogd={ingelogd && !verlopen} />
      <main className="v-pricing">
        <header className="v-pricing__head">
          {ingelogd && toegang ? (
            <div className="v-al-account">
              <p>
                You’re logged in as <strong>{email}</strong> on <strong>Volgo {PLANS[huidig as PlanId]?.naam ?? "Start"}</strong>.
                {eigenaar ? " Pick another plan below to switch. Your data stays." : " Only the account owner can change the plan."}
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
          <h1 className="v-h2 v-center">{wisselen ? "Switch plans." : "Choose your plan."}</h1>
          <p className="v-lede v-center">Every plan starts with 7 days free. Switch or cancel any time.</p>
        </header>
        <div className="v-plans">
          {(Object.keys(PLANS) as PlanId[]).map((id) => {
            const p = PLANS[id];
            return (
              <article className={`v-plan v-plan--${id}`} key={id}>
                {wisselen && huidig === id ? <p className="v-plan__badge">Your plan</p> : p.badge ? <p className="v-plan__badge">{p.badge}</p> : null}
                <h2 className="v-plan__name">{p.naam}</h2>
                <p className="v-plan__tag">{p.tagline}</p>
                <p className="v-plan__price">
                  <span>€{p.prijsTekst}</span> per month
                </p>
                <button
                  className={`v-plan__cta v-plan__cta--${id}`}
                  disabled={bezig !== null || (wisselen && (huidig === id || !eigenaar))}
                  onClick={() => void kies(id)}
                  type="button"
                >
                  {bezig === id
                    ? "One moment…"
                    : wisselen
                      ? huidig === id
                        ? "Current plan"
                        : `Switch to ${p.naam}`
                      : "Start free trial"}
                </button>
                <p className="v-plan__kaart">{wisselen ? "Switches right away" : "7 days free · Payment card required"}</p>
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
          <p className="v-lede v-center">Every plan starts with 7 days free. Here is exactly how you get going.</p>
          <div className="v-na__grid">
            {(Object.keys(PLANS) as PlanId[]).map((id) => (
              <article className={`v-na__kaart v-na__kaart--${id}`} key={id}>
                <p className="v-na__plan">
                  {PLANS[id].naam} · €{PLANS[id].prijsTekst}/mo
                </p>
                <h3>{START_STAPPEN[id].titel}</h3>
                <ol>
                  {START_STAPPEN[id].stappen.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                {id === "start" ? (
                  <p className="v-na__slot">Custom website, photo and video tools: available on Pro and Premium.</p>
                ) : (
                  <p className="v-na__noot">Website included. Your domain name (about €10–20 a year) is not included; we help you register or connect it.</p>
                )}
              </article>
            ))}
          </div>

          <div className="v-na__install">
            <div>
              <h3>Install AVA on your own website</h3>
              <p>
                After signing up you'll find your personal line of code in your dashboard under <strong>AVA → On your website</strong>. Paste it once
                and AVA appears on every page. Pick your platform:
              </p>
            </div>
            <InstallGuides />
          </div>

          <div className="v-na__regels">
            <p>
              <strong>Free for 7 days.</strong> A payment card is required. Nothing is charged until the trial ends; then your plan renews monthly.
            </p>
            <p>
              <strong>Cancel any time.</strong> In your dashboard under Subscription. AVA, your dashboard and the website we built (if you have one)
              stop at the end of your paid period.
            </p>
            <p>
              <strong>Switch any time.</strong> Upgrade from Start to Pro to get your custom website; your leads and settings stay.
            </p>
          </div>
        </section>

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
                  {(Object.keys(PLANS) as PlanId[]).map((id) => (
                    <th key={id} scope="col">
                      {PLANS[id].naam}
                      <small>€{PLANS[id].prijsTekst}/mo</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VERGELIJKING.map((rij) => (
                  <tr key={rij.label}>
                    <th scope="row">{rij.label}</th>
                    {(["start", "pro", "premium"] as const).map((id) => {
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
        <p className="v-pricing__note">Prices per month, excluding VAT. Already have an account? <a href="/login">Log in</a>.</p>
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AvaChat } from "@/components/volgo/ava-chat";
import { Footer } from "@/components/volgo/footer";
import { Nav } from "@/components/volgo/nav";
import { accountStatus } from "@/lib/api/assistent.functions";
import { startBetaling, uitloggen } from "@/lib/api/account.functions";
import { PLANS, type PlanId } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/pricing")({
  validateSearch: (s: Record<string, unknown>): { expired?: string } => ({ expired: s.expired === "1" || s.expired === 1 ? "1" : undefined }),
  loader: async () => accountStatus().catch(() => ({ ingelogd: false, toegang: false, email: "" })),
  head: () => ({ meta: [{ title: "Pricing · Volgo" }] }),
  component: Abonnement,
});

function Abonnement() {
  const { expired: verlopen } = Route.useSearch();
  const { ingelogd, toegang, email } = Route.useLoaderData();
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
                You’re logged in as <strong>{email}</strong> and already have a subscription.
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
          <h1 className="v-h2 v-center">Choose your plan.</h1>
          <p className="v-lede v-center">Start with 7 days free. Then pay monthly.</p>
        </header>
        <div className="v-plans">
          {(Object.keys(PLANS) as PlanId[]).map((id) => {
            const p = PLANS[id];
            return (
              <article className={`v-plan v-plan--${id}`} key={id}>
                {id === "pro" ? <p className="v-plan__badge">Recommended</p> : null}
                <h2 className="v-plan__name">{p.naam}</h2>
                <p className="v-plan__tag">{p.tagline}</p>
                <p className="v-plan__price">
                  <span>€{p.prijsTekst}</span> per month
                </p>
                <p className="v-plan__trial">{p.proefDagen ? `First ${p.proefDagen} days free` : "Start right away"}</p>
                <button className={`v-plan__cta v-plan__cta--${id}`} disabled={bezig !== null} onClick={() => void kies(id)} type="button">
                  {bezig === id ? "One moment…" : p.proefDagen ? "Try 7 days free" : `Choose ${p.naam}`}
                </button>
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
        <p className="v-pricing__note">Prices per month, excluding VAT. Already have an account? <a href="/login">Log in</a>.</p>
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}

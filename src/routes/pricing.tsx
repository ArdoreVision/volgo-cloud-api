import { createFileRoute } from "@tanstack/react-router";

import { AvaChat } from "@/components/volgo/ava-chat";
import { Footer } from "@/components/volgo/footer";
import { Vertaler } from "@/components/volgo/taal";
import { Tracking } from "@/components/volgo/tracking";
import { InstallUitleg, Kop, Prijzen, useOnthul } from "@/components/volgo/wit";
import { uitloggen } from "@/lib/api/account.functions";
import { accountStatus } from "@/lib/api/assistent.functions";
import { PLANS, START_STAPPEN, VERGELIJKING, type PlanId, ZICHTBAAR, planTitel } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/pricing")({
  validateSearch: (s: Record<string, unknown>): { expired?: number } => ({ expired: s.expired === "1" || s.expired === 1 ? 1 : undefined }),
  loader: async () => accountStatus().catch(() => ({ ingelogd: false, toegang: false, email: "", plan: "", eigenaar: false })),
  head: () => ({
    meta: [
      { title: "Pricing · Volgo · The appointment setter for your website" },
      {
        name: "description",
        content:
          "Volgo pricing: Starter €149, Growth €249 and Pro €449 per month for the appointment setter in the website you already have. Or Complete: we build your website with Volgo inside and your domain included, €2499 one-time plus €249.99 per month. Excl. VAT, cancel any month.",
      },
      { property: "og:url", content: "https://thevolgo.app/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://thevolgo.app/pricing" }],
  }),
  component: Abonnement,
});

const prijsRegel = (id: PlanId) => {
  const p = PLANS[id];
  return `${p.opstart ? `€${p.opstart / 100} + ` : ""}€${p.prijsTekst}/mo`;
};

function Abonnement() {
  const { expired: verlopen } = Route.useSearch();
  const status = Route.useLoaderData();
  const { ingelogd, toegang, email, plan: huidig, eigenaar } = status;
  const klant = ingelogd && toegang;
  // After the trial or subscription ended the visitor is still logged in, but has to choose a plan again.
  const kijker = { ...status, ingelogd: ingelogd && !verlopen };
  useOnthul("volgo-prijzen");

  return (
    <div className="volgo vn" id="volgo-prijzen">
      <Kop kijker={kijker} links={false} />
      <Vertaler />
      <Tracking />
      <main>
        <header className="vn-pricing-kop">
          {klant ? (
            <div className="vn-account">
              <p>
                You’re logged in as <strong>{email}</strong> on <strong>{PLANS[huidig as PlanId] ? planTitel(PLANS[huidig as PlanId]) : "Volgo"}</strong>.{eigenaar ? "" : " Only the account owner can change the plan."}
              </p>
              <div>
                <a className="vn-knop vn-knop--klein" href="/dashboard">
                  Go to my dashboard
                </a>
                <button className="vn-knop vn-knop--klein vn-knop--licht" onClick={() => void uitloggen().then(() => window.location.reload())} type="button">
                  Log out
                </button>
              </div>
            </div>
          ) : null}
          {verlopen ? <p className="vn-melding">Your subscription has ended. Choose a plan to continue. All your data is still here.</p> : null}
          <p className="vn-oog">Pricing</p>
          <h1 className="vn-h1">{klant ? "Your plan." : "Pick what fits your business."}</h1>
          <p className="vn-sub">Three plans for the website you already have. Or let us build your complete website, with Volgo inside and your domain included.</p>
        </header>

        <div className="vn-prijzen--los">
          <Prijzen kijker={status} kop={false} />
        </div>

        <section aria-labelledby="compare-title" className="vn-sectie">
          <header className="vn-sectie__kop" data-rv="">
            <p className="vn-oog">Compare</p>
            <h2 className="vn-h2" id="compare-title">
              Everything in each plan.
            </h2>
          </header>
          <div className="vn-tabel" data-rv="">
            <table>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="vn-sr">Feature</span>
                  </th>
                  {ZICHTBAAR.map((id) => (
                    <th key={id} scope="col">
                      {PLANS[id].naam}
                      <small>{prijsRegel(id)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VERGELIJKING.map((rij) => (
                  <tr key={rij.label}>
                    <th scope="row">{rij.label}</th>
                    {ZICHTBAAR.map((id) => {
                      const v = rij[id as "starter" | "groei" | "max" | "compleet"];
                      return (
                        <td key={id}>
                          {v === true ? (
                            <span aria-label="Included" className="is-ja">
                              ✓
                            </span>
                          ) : v === false ? (
                            <span aria-label="Not included" className="is-nee">
                              –
                            </span>
                          ) : (
                            v
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="after-title" className="vn-sectie">
          <header className="vn-sectie__kop" data-rv="">
            <p className="vn-oog">After you subscribe</p>
            <h2 className="vn-h2" id="after-title">
              Here is exactly how you get going.
            </h2>
          </header>
          <div className="vn-na">
            {ZICHTBAAR.map((id) => (
              <article data-rv="" key={id}>
                <p>
                  {PLANS[id].naam} · {prijsRegel(id)}
                </p>
                <h3>{START_STAPPEN[id].titel}</h3>
                <ol>
                  {START_STAPPEN[id].stappen.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>

        <InstallUitleg />

        <section className="vn-slot">
          <h2 className="vn-h2">Questions first?</h2>
          <p className="vn-sub" style={{ marginInline: "auto" }}>
            Open the chat in the corner. That is Volgo itself: ask anything, or book a call with us right there.
          </p>
          <p className="vn-klein">
            Already have an account? <a href="/login">Log in</a>
          </p>
        </section>
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}

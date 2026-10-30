import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AvaChat } from "@/components/volgo/ava-chat";
import { Footer } from "@/components/volgo/footer";
import { Nav } from "@/components/volgo/nav";
import { startBetaling } from "@/lib/api/account.functions";
import { PLANS, type PlanId } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/abonnement")({
  head: () => ({ meta: [{ title: "Abonnementen · Volgo" }] }),
  component: Abonnement,
});

function Abonnement() {
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
      setFout("Er ging iets mis. Probeer het opnieuw.");
      setBezig(null);
    }
  }

  return (
    <div className="volgo">
      <Nav />
      <main className="v-pricing">
        <header className="v-pricing__head">
          <h1 className="v-h2 v-center">Kies je abonnement.</h1>
          <p className="v-lede v-center">Begin met 7 dagen gratis. Daarna betaal je per maand.</p>
        </header>
        <div className="v-plans">
          {(Object.keys(PLANS) as PlanId[]).map((id) => {
            const p = PLANS[id];
            return (
              <article className={`v-plan v-plan--${id}`} key={id}>
                {id === "pro" ? <p className="v-plan__badge">Aanbevolen</p> : null}
                <h2 className="v-plan__name">{p.naam}</h2>
                <p className="v-plan__tag">{p.tagline}</p>
                <p className="v-plan__price">
                  <span>€ {p.prijsTekst}</span> per maand
                </p>
                <p className="v-plan__trial">{p.proefDagen ? `Eerste ${p.proefDagen} dagen gratis` : "Direct starten"}</p>
                <button className={`v-plan__cta v-plan__cta--${id}`} disabled={bezig !== null} onClick={() => void kies(id)} type="button">
                  {bezig === id ? "Even geduld" : p.proefDagen ? "Probeer 7 dagen gratis" : `Kies ${p.naam}`}
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
        <p className="v-pricing__note">Prijzen per maand, exclusief btw. Al een account? <a href="/inloggen">Log in</a>.</p>
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}

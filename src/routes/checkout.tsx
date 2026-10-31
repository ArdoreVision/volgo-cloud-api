import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AuthShell, Steps } from "@/components/volgo/auth-shell";
import { bekijkTestBetaling, rondTestBetalingAf } from "@/lib/api/account.functions";
import { PLANS, isPlan } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>): { token?: string } => ({ token: typeof s.token === "string" && s.token ? s.token : undefined }),
  loaderDeps: ({ search }) => ({ token: search.token ?? "" }),
  loader: ({ deps }) => (deps.token ? bekijkTestBetaling({ data: { token: deps.token } }) : null),
  head: () => ({ meta: [{ title: "Betalen · Volgo" }] }),
  component: Betalen,
});

function Betalen() {
  const info = Route.useLoaderData();
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [bezig, setBezig] = useState(false);

  if (!info || !isPlan(info.plan)) {
    return (
      <AuthShell>
        <h1 className="v-auth__title">Deze betaling bestaat niet meer.</h1>
        <p className="v-auth__sub">Kies opnieuw een abonnement om verder te gaan.</p>
        <a className="v-auth__btn" href="/pricing">Naar abonnementen</a>
      </AuthShell>
    );
  }
  const p = PLANS[info.plan];

  async function rondAf() {
    setBezig(true);
    const res = await rondTestBetalingAf({ data: { token: token ?? "" } });
    if (res.ok || info?.status === "betaald") void navigate({ to: "/signup", search: { token } });
    else setBezig(false);
  }

  return (
    <AuthShell>
      <Steps actief={2} />
      <p className="v-testbadge">Testmodus · er wordt niets afgeschreven</p>
      <h1 className="v-auth__title">Volgo {p.naam}</h1>
      <div className="v-summary">
        <div>
          <span>Abonnement</span>
          <strong>Volgo {p.naam}</strong>
        </div>
        <div>
          <span>Prijs</span>
          <strong>€ {p.prijsTekst} per maand</strong>
        </div>
        {p.proefDagen ? (
          <div>
            <span>Vandaag te betalen</span>
            <strong>€ 0,00</strong>
          </div>
        ) : null}
        <p className="v-summary__note">
          {p.proefDagen
            ? `Je eerste ${p.proefDagen} dagen zijn gratis. Daarna betaal je € ${p.prijsTekst} per maand, exclusief btw.`
            : `Je betaalt € ${p.prijsTekst} per maand, exclusief btw.`}
        </p>
      </div>
      <button className="v-auth__btn" disabled={bezig} onClick={() => void rondAf()} type="button">
        {bezig ? "Even geduld" : "Betaling afronden"}
      </button>
      <a className="v-auth__link" href="/pricing">
        Ander abonnement kiezen
      </a>
    </AuthShell>
  );
}

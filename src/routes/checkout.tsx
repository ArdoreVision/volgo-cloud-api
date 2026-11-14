import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AuthShell, Steps } from "@/components/volgo/auth-shell";
import { bekijkTestBetaling, rondTestBetalingAf } from "@/lib/api/account.functions";
import { PLANS, isPlan, planTitel } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>): { token?: string } => ({ token: typeof s.token === "string" && s.token ? s.token : undefined }),
  loaderDeps: ({ search }) => ({ token: search.token ?? "" }),
  loader: ({ deps }) => (deps.token ? bekijkTestBetaling({ data: { token: deps.token } }) : null),
  head: () => ({ meta: [{ title: "Checkout · Volgo" }] }),
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
        <h1 className="v-auth__title">This payment no longer exists.</h1>
        <p className="v-auth__sub">Choose a plan again to continue.</p>
        <a className="v-auth__btn" href="/pricing">See plans</a>
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
      <p className="v-testbadge">Test mode · you won’t be charged</p>
      <h1 className="v-auth__title">{planTitel(p)}</h1>
      <div className="v-summary">
        <div>
          <span>Plan</span>
          <strong>{planTitel(p)}</strong>
        </div>
        <div>
          <span>Price</span>
          <strong>{p.opstart ? `€${p.opstart / 100} one-time + ` : ""}€{p.prijsTekst} per month</strong>
        </div>
        {p.proefDagen ? (
          <div>
            <span>Due today</span>
            <strong>€0.00</strong>
          </div>
        ) : null}
        <p className="v-summary__note">
          {p.proefDagen
            ? `Your first ${p.proefDagen} days are free. After that you pay €${p.prijsTekst} per month, excluding VAT.`
            : p.opstart
              ? `Today you pay €${p.opstart / 100} for your website plus the first month of Volgo. After that €${p.prijsTekst} per month, excluding VAT.`
              : `You pay €${p.prijsTekst} per month, excluding VAT.`}
        </p>
      </div>
      <button className="v-auth__btn" disabled={bezig} onClick={() => void rondAf()} type="button">
        {bezig ? "One moment…" : "Complete payment"}
      </button>
      <a className="v-auth__link" href="/pricing">
        Choose a different plan
      </a>
    </AuthShell>
  );
}

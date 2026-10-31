import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthShell, Steps } from "@/components/volgo/auth-shell";
import { controleerBetaling, maakAccount } from "@/lib/api/account.functions";
import { PLANS, isPlan } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/aanmelden")({
  validateSearch: (s: Record<string, unknown>): { token?: string; session_id?: string } => ({
    token: typeof s.token === "string" && s.token ? s.token : undefined,
    session_id: typeof s.session_id === "string" && s.session_id ? s.session_id : undefined,
  }),
  loaderDeps: ({ search }) => ({ token: search.token ?? "", session_id: search.session_id ?? "" }),
  loader: ({ deps }) =>
    deps.token || deps.session_id
      ? controleerBetaling({ data: { token: deps.token || undefined, session_id: deps.session_id || undefined } })
      : null,
  head: () => ({ meta: [{ title: "Account aanmaken · Volgo" }] }),
  component: Aanmelden,
});

function Aanmelden() {
  const betaling = Route.useLoaderData();
  const navigate = useNavigate();
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const [toon, setToon] = useState(false);

  if (!betaling || !isPlan(betaling.plan)) {
    return (
      <AuthShell>
        <h1 className="v-auth__title">Kies eerst een abonnement.</h1>
        <p className="v-auth__sub">Je maakt een account aan nadat je een abonnement hebt gekozen en afgerond.</p>
        <a className="v-auth__btn" href="/abonnement">Naar abonnementen</a>
        <a className="v-auth__link" href="/inloggen">Ik heb al een account</a>
      </AuthShell>
    );
  }
  const p = PLANS[betaling.plan];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    if (v("naam").length < 2 || v("bedrijf").length < 2) return setFout("Vul je naam en bedrijfsnaam in.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("email"))) return setFout("Vul een geldig e-mailadres in.");
    if (String(fd.get("wachtwoord") ?? "").length < 8) return setFout("Kies een wachtwoord van minimaal 8 tekens.");
    setFout("");
    setBezig(true);
    try {
      const res = await maakAccount({
        data: { token: betaling!.token, naam: v("naam"), bedrijf: v("bedrijf"), email: v("email"), wachtwoord: String(fd.get("wachtwoord")) },
      });
      if (res.ok) void navigate({ to: "/inloggen", search: { nieuw: "ja" } });
      else {
        setFout(res.message);
        setBezig(false);
      }
    } catch {
      setFout("Er ging iets mis. Probeer het opnieuw.");
      setBezig(false);
    }
  }

  return (
    <AuthShell>
      <Steps actief={3} />
      <p className="v-auth__ok">Betaling gelukt · Volgo {p.naam}</p>
      <h1 className="v-auth__title">Maak je account aan.</h1>
      <p className="v-auth__sub">Hiermee log je in op je bedrijfsdashboard.</p>
      <form className="v-auth__form" noValidate onSubmit={onSubmit}>
        <div className="v-fld">
          <label htmlFor="naam">Je naam</label>
          <input autoComplete="name" id="naam" name="naam" />
        </div>
        <div className="v-fld">
          <label htmlFor="bedrijf">Bedrijfsnaam</label>
          <input autoComplete="organization" id="bedrijf" name="bedrijf" />
        </div>
        <div className="v-fld">
          <label htmlFor="email">E-mailadres</label>
          <input autoComplete="email" defaultValue={betaling.email} id="email" inputMode="email" name="email" type="email" />
        </div>
        <div className="v-fld">
          <label htmlFor="wachtwoord">Wachtwoord</label>
          <div className="v-pw">
            <input autoComplete="new-password" id="wachtwoord" minLength={8} name="wachtwoord" type={toon ? "text" : "password"} />
            <button onClick={() => setToon(!toon)} type="button">
              {toon ? "Verberg" : "Toon"}
            </button>
          </div>
          <p className="v-hint">Minimaal 8 tekens.</p>
        </div>
        {fout ? <p className="v-err" role="alert">{fout}</p> : null}
        <button className="v-auth__btn" disabled={bezig} type="submit">
          {bezig ? "Account wordt aangemaakt" : "Account aanmaken"}
        </button>
      </form>
    </AuthShell>
  );
}

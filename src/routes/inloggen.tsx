import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthShell, Steps } from "@/components/volgo/auth-shell";
import { inloggen } from "@/lib/api/account.functions";
import { isIngelogd } from "@/lib/api/assistent.functions";
import "@/volgo.css";

export const Route = createFileRoute("/inloggen")({
  // Ingelogd? Dan direct naar je Volgo-home in plaats van de landingspagina.
  beforeLoad: async () => {
    if (await isIngelogd()) throw redirect({ to: "/dashboard" });
  },
  validateSearch: (s: Record<string, unknown>): { nieuw?: string } => ({ nieuw: s.nieuw === "ja" ? "ja" : undefined }),
  head: () => ({ meta: [{ title: "Inloggen · Volgo" }] }),
  component: Inloggen,
});

function Inloggen() {
  const { nieuw } = Route.useSearch();
  const navigate = useNavigate();
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setFout("");
    setBezig(true);
    try {
      const res = await inloggen({ data: { email: String(fd.get("email") ?? ""), wachtwoord: String(fd.get("wachtwoord") ?? "") } });
      if (res.ok) void navigate({ to: "/dashboard" });
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
      {nieuw ? <Steps actief={4} /> : null}
      {nieuw ? <p className="v-auth__ok">Je account is aangemaakt</p> : null}
      <h1 className="v-auth__title">Inloggen</h1>
      <p className="v-auth__sub">Log in op je bedrijfsdashboard.</p>
      <form className="v-auth__form" onSubmit={onSubmit}>
        <div className="v-fld">
          <label htmlFor="email">E-mailadres</label>
          <input autoComplete="email" id="email" inputMode="email" name="email" required type="email" />
        </div>
        <div className="v-fld">
          <span className="v-fld__row">
            <label htmlFor="wachtwoord">Wachtwoord</label>
            <a href="/wachtwoord-vergeten">Vergeten?</a>
          </span>
          <input autoComplete="current-password" id="wachtwoord" name="wachtwoord" required type="password" />
        </div>
        {fout ? <p className="v-err" role="alert">{fout}</p> : null}
        <button className="v-auth__btn" disabled={bezig} type="submit">
          {bezig ? "Bezig met inloggen" : "Inloggen"}
        </button>
      </form>
      <p className="v-auth__alt">
        Nog geen account? <a href="/abonnement">Kies een abonnement</a>
      </p>
    </AuthShell>
  );
}

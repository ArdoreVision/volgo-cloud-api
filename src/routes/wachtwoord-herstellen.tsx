import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthShell } from "@/components/volgo/auth-shell";
import { herstelWachtwoord } from "@/lib/api/wachtwoord.functions";
import "@/volgo.css";

export const Route = createFileRoute("/wachtwoord-herstellen")({
  validateSearch: (s: Record<string, unknown>): { token: string } => ({ token: typeof s.token === "string" ? s.token : "" }),
  head: () => ({ meta: [{ title: "Nieuw wachtwoord · Volgo" }, { name: "robots", content: "noindex" }] }),
  component: Herstellen,
});

function Herstellen() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const w1 = String(fd.get("w1") ?? "");
    const w2 = String(fd.get("w2") ?? "");
    if (w1.length < 8) return setFout("Kies een wachtwoord van minstens 8 tekens.");
    if (w1 !== w2) return setFout("De twee wachtwoorden zijn niet hetzelfde.");
    setFout("");
    setBezig(true);
    try {
      const r = await herstelWachtwoord({ data: { token, wachtwoord: w1 } });
      if (r.ok) return void navigate({ to: "/dashboard" });
      setFout(r.message);
    } catch {
      setFout("Deze link klopt niet. Vraag een nieuwe aan.");
    }
    setBezig(false);
  }

  return (
    <AuthShell>
      <h1 className="v-auth__title">Nieuw wachtwoord</h1>
      <p className="v-auth__sub">Kies een wachtwoord van minstens 8 tekens. Daarna ben je meteen ingelogd.</p>
      <form className="v-auth__form" onSubmit={onSubmit}>
        <div className="v-fld">
          <label htmlFor="w1">Nieuw wachtwoord</label>
          <input autoComplete="new-password" id="w1" minLength={8} name="w1" required type="password" />
        </div>
        <div className="v-fld">
          <label htmlFor="w2">Herhaal wachtwoord</label>
          <input autoComplete="new-password" id="w2" minLength={8} name="w2" required type="password" />
        </div>
        {fout ? <p className="v-err" role="alert">{fout}</p> : null}
        <button className="v-auth__btn" disabled={bezig || !token} type="submit">
          {bezig ? "Even geduld…" : "Opslaan en inloggen"}
        </button>
      </form>
      <p className="v-auth__alt">
        <a href="/wachtwoord-vergeten">Nieuwe link aanvragen</a>
      </p>
    </AuthShell>
  );
}

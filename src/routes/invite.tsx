import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthShell } from "@/components/volgo/auth-shell";
import { accepteerUitnodiging, bekijkUitnodiging } from "@/lib/api/team.functions";
import "@/volgo.css";

export const Route = createFileRoute("/invite")({
  validateSearch: (s: Record<string, unknown>): { token?: string } => ({ token: typeof s.token === "string" && s.token ? s.token : undefined }),
  loaderDeps: ({ search }) => ({ token: search.token ?? "" }),
  loader: ({ deps }) => (deps.token ? bekijkUitnodiging({ data: { token: deps.token } }) : null),
  head: () => ({ meta: [{ title: "Uitnodiging · Volgo" }, { name: "robots", content: "noindex" }] }),
  component: Uitnodiging,
});

function Uitnodiging() {
  const info = Route.useLoaderData();
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  if (!info) {
    return (
      <AuthShell>
        <h1 className="v-auth__title">Deze uitnodiging werkt niet meer.</h1>
        <p className="v-auth__sub">Vraag je collega om een nieuwe uitnodiging. Heb je al een account? Log dan in.</p>
        <a className="v-auth__btn" href="/login">Inloggen</a>
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const naam = String(fd.get("naam") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const wachtwoord = String(fd.get("wachtwoord") ?? "");
    if (naam.length < 2) return setFout("Vul je naam in.");
    if (wachtwoord.length < 8) return setFout("Kies een wachtwoord van minimaal 8 tekens.");
    setFout("");
    setBezig(true);
    const res = await accepteerUitnodiging({ data: { token: token ?? "", naam, email, wachtwoord } });
    if (res.ok) void navigate({ to: "/dashboard" });
    else {
      setFout(res.message);
      setBezig(false);
    }
  }

  return (
    <AuthShell>
      <p className="v-auth__ok">Uitnodiging van {info.van}</p>
      <h1 className="v-auth__title">Word lid van het team van {info.bedrijf}.</h1>
      <p className="v-auth__sub">Maak je account aan. Daarna zit je meteen in het dashboard en de teamchat.</p>
      <form className="v-auth__form" noValidate onSubmit={(e) => void onSubmit(e)}>
        <div className="v-fld">
          <label htmlFor="naam">Je naam</label>
          <input autoComplete="name" id="naam" name="naam" />
        </div>
        <div className="v-fld">
          <label htmlFor="email">E-mailadres</label>
          <input autoComplete="email" defaultValue={info.email} id="email" name="email" type="email" />
        </div>
        <div className="v-fld">
          <label htmlFor="wachtwoord">Wachtwoord</label>
          <input autoComplete="new-password" id="wachtwoord" minLength={8} name="wachtwoord" type="password" />
          <p className="v-hint">Minimaal 8 tekens.</p>
        </div>
        {fout ? <p className="v-err" role="alert">{fout}</p> : null}
        <button className="v-auth__btn" disabled={bezig} type="submit">
          {bezig ? "Even geduld" : "Account aanmaken en starten"}
        </button>
      </form>
    </AuthShell>
  );
}

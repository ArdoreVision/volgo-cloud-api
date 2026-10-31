import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthShell } from "@/components/volgo/auth-shell";
import { vraagHerstel } from "@/lib/api/wachtwoord.functions";
import "@/volgo.css";

export const Route = createFileRoute("/wachtwoord-vergeten")({
  head: () => ({ meta: [{ title: "Wachtwoord vergeten · Volgo" }, { name: "robots", content: "noindex" }] }),
  component: Vergeten,
});

function Vergeten() {
  const [bericht, setBericht] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [bezig, setBezig] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setBezig(true);
    try {
      const r = await vraagHerstel({ data: { email } });
      setBericht({ ok: r.ok, tekst: r.message });
    } catch {
      setBericht({ ok: false, tekst: "Vul een geldig e-mailadres in." });
    }
    setBezig(false);
  }

  return (
    <AuthShell>
      <h1 className="v-auth__title">Wachtwoord vergeten</h1>
      <p className="v-auth__sub">Vul je e-mailadres in. Je krijgt een link om een nieuw wachtwoord te kiezen.</p>
      {bericht?.ok ? (
        <p className="v-auth__ok v-auth__ok--blok">{bericht.tekst}</p>
      ) : (
        <form className="v-auth__form" onSubmit={onSubmit}>
          <div className="v-fld">
            <label htmlFor="email">E-mailadres</label>
            <input autoComplete="email" id="email" inputMode="email" name="email" required type="email" />
          </div>
          {bericht ? <p className="v-err" role="alert">{bericht.tekst}</p> : null}
          <button className="v-auth__btn" disabled={bezig} type="submit">
            {bezig ? "Even geduld…" : "Stuur mij een link"}
          </button>
        </form>
      )}
      <p className="v-auth__alt">
        <a href="/inloggen">Terug naar inloggen</a>
      </p>
    </AuthShell>
  );
}

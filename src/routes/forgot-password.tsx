import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthShell } from "@/components/volgo/auth-shell";
import { vraagHerstel } from "@/lib/api/wachtwoord.functions";
import "@/volgo.css";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password · Volgo" }, { name: "robots", content: "noindex" }] }),
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
      setBericht({ ok: false, tekst: "Enter a valid email address." });
    }
    setBezig(false);
  }

  return (
    <AuthShell>
      <h1 className="v-auth__title">Forgot your password?</h1>
      <p className="v-auth__sub">Enter your email address and we’ll send you a link to choose a new password.</p>
      {bericht?.ok ? (
        <p className="v-auth__ok v-auth__ok--blok">{bericht.tekst}</p>
      ) : (
        <form className="v-auth__form" onSubmit={onSubmit}>
          <div className="v-fld">
            <label htmlFor="email">Email address</label>
            <input autoComplete="email" id="email" inputMode="email" name="email" required type="email" />
          </div>
          {bericht ? <p className="v-err" role="alert">{bericht.tekst}</p> : null}
          <button className="v-auth__btn" disabled={bezig} type="submit">
            {bezig ? "One moment…" : "Send me a link"}
          </button>
        </form>
      )}
      <p className="v-auth__alt">
        <a href="/login">Back to log in</a>
      </p>
    </AuthShell>
  );
}

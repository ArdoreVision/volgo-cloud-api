import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthShell, Steps } from "@/components/volgo/auth-shell";
import { WachtwoordVeld } from "@/components/volgo/wachtwoord-veld";
import { beoordeel } from "@/lib/wachtwoord";
import { activeerAbonnement, controleerBetaling, maakAccount } from "@/lib/api/account.functions";
import { isIngelogd } from "@/lib/api/assistent.functions";
import { PLANS, isPlan } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): { token?: string; session_id?: string } => ({
    token: typeof s.token === "string" && s.token ? s.token : undefined,
    session_id: typeof s.session_id === "string" && s.session_id ? s.session_id : undefined,
  }),
  loaderDeps: ({ search }) => ({ token: search.token ?? "", session_id: search.session_id ?? "" }),
  loader: async ({ deps }) => {
    const [betaling, ingelogd] = await Promise.all([
      deps.token || deps.session_id ? controleerBetaling({ data: { token: deps.token || undefined, session_id: deps.session_id || undefined } }) : null,
      isIngelogd().catch(() => false),
    ]);
    return { betaling, ingelogd };
  },
  head: () => ({ meta: [{ title: "Create account · Volgo" }] }),
  component: Aanmelden,
});

function Aanmelden() {
  const { betaling, ingelogd } = Route.useLoaderData();
  const navigate = useNavigate();
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  if (!betaling || !isPlan(betaling.plan)) {
    return (
      <AuthShell>
        <h1 className="v-auth__title">Choose a plan first.</h1>
        <p className="v-auth__sub">You create your account after choosing a plan and completing checkout.</p>
        <a className="v-auth__btn" href="/pricing">See plans</a>
        <a className="v-auth__link" href="/login">I already have an account</a>
      </AuthShell>
    );
  }
  const p = PLANS[betaling.plan];

  // Al ingelogd (bv. na een verlopen proef)? Dan het abonnement op het bestaande account zetten.
  if (ingelogd) {
    const activeer = async () => {
      setBezig(true);
      const r = await activeerAbonnement({ data: { token: betaling.token } }).catch(() => ({ ok: false as const, message: "Something went wrong." }));
      if (r.ok) return void navigate({ to: "/dashboard" });
      setFout(r.message);
      setBezig(false);
    };
    return (
      <AuthShell>
        <p className="v-auth__ok">Payment successful · Volgo {p.naam}</p>
        <h1 className="v-auth__title">Activate your plan</h1>
        <p className="v-auth__sub">You’re already logged in. We’ll add Volgo {p.naam} to your existing account, with all your data.</p>
        {fout ? <p className="v-err" role="alert">{fout}</p> : null}
        <button className="v-auth__btn" disabled={bezig} onClick={() => void activeer()} type="button">
          {bezig ? "One moment…" : "Activate and go to my dashboard"}
        </button>
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    if (v("naam").length < 2 || v("bedrijf").length < 2) return setFout("Enter your name and company name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("email"))) return setFout("Enter a valid email address.");
    const st = beoordeel(String(fd.get("wachtwoord") ?? ""), [v("naam"), v("bedrijf"), v("email")]);
    if (!st.ok) return setFout(st.label === "Too short" ? "Choose a password of at least 8 characters." : st.tip);
    setFout("");
    setBezig(true);
    try {
      const res = await maakAccount({
        data: { token: betaling!.token, naam: v("naam"), bedrijf: v("bedrijf"), email: v("email"), wachtwoord: String(fd.get("wachtwoord")) },
      });
      if (res.ok) void navigate({ to: "/login", search: { new: 1 } });
      else {
        setFout(res.message);
        setBezig(false);
      }
    } catch {
      setFout("Something went wrong. Please try again.");
      setBezig(false);
    }
  }

  return (
    <AuthShell>
      <Steps actief={3} />
      <p className="v-auth__ok">Payment successful · Volgo {p.naam}</p>
      <h1 className="v-auth__title">Create your account.</h1>
      <p className="v-auth__sub">You’ll use it to log in to your business dashboard.</p>
      <form className="v-auth__form" noValidate onSubmit={onSubmit}>
        <div className="v-fld">
          <label htmlFor="naam">Your name</label>
          <input autoComplete="name" id="naam" name="naam" />
        </div>
        <div className="v-fld">
          <label htmlFor="bedrijf">Company name</label>
          <input autoComplete="organization" id="bedrijf" name="bedrijf" />
        </div>
        <div className="v-fld">
          <label htmlFor="email">Email address</label>
          <input autoComplete="email" defaultValue={betaling.email} id="email" inputMode="email" name="email" type="email" />
        </div>
        <WachtwoordVeld context={[betaling.email]} id="wachtwoord" label="Password" name="wachtwoord" soort="new" />
        <p className="v-hint v-akkoord">
          By creating an account, you agree to the <a href="/terms" target="_blank">Terms of Service</a> and the{" "}
          <a href="/dpa" target="_blank">Data Processing Agreement</a>.
        </p>
        {fout ? <p className="v-err" role="alert">{fout}</p> : null}
        <button className="v-auth__btn" disabled={bezig} type="submit">
          {bezig ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}

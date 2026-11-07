import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { AuthShell, Steps } from "@/components/volgo/auth-shell";
import { aankoopId, conversie } from "@/components/volgo/tracking";
import { WachtwoordVeld } from "@/components/volgo/wachtwoord-veld";
import { beoordeel } from "@/lib/wachtwoord";
import { activeerAbonnement, controleerBetaling, maakAccount, maakAccountZonderPlan } from "@/lib/api/account.functions";
import { isIngelogd } from "@/lib/api/assistent.functions";
import { PLANS, isPlan, type PlanId } from "@/lib/plans";
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
    if (ingelogd) {
      return (
        <AuthShell>
          <h1 className="v-auth__title">You’re already logged in.</h1>
          <p className="v-auth__sub">Open your dashboard to start your plan.</p>
          <a className="v-auth__btn" href="/dashboard">Go to my dashboard</a>
        </AuthShell>
      );
    }
    return <AccountZonderPlan />;
  }
  const p = PLANS[betaling.plan];

  // Al ingelogd (bv. na een verlopen proef)? Dan het abonnement op het bestaande account zetten.
  if (ingelogd) {
    const activeer = async () => {
      setBezig(true);
      const r = await activeerAbonnement({ data: { token: betaling.token } }).catch(() => ({ ok: false as const, message: "Something went wrong." }));
      if (r.ok) {
        // Confirmed, real payment on an existing account: count it once for the ad pixel (only sent with consent).
        if (!r.test) conversie(r.prijs, PLANS[r.plan as PlanId]?.naam ?? "Volgo", await aankoopId(betaling.token));
        window.setTimeout(() => void navigate({ to: "/dashboard" }), 400);
        return;
      }
      setFout(r.message);
      setBezig(false);
    };
    return (
      <AuthShell>
        <AutoStart actie={activeer} />
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
      if (res.ok) {
        // The payment is confirmed server-side at this point. Hand the purchase to the welcome page, which fires it once.
        if (!res.test && !res.proef) {
          try {
            sessionStorage.setItem("volgo-aankoop", JSON.stringify({ id: await aankoopId(betaling!.token), waarde: res.prijs, plan: PLANS[res.plan].naam }));
          } catch {
            /* private mode */
          }
        }
        void navigate({ to: "/welcome", search: { plan: res.plan, v: res.prijs } });
      }
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

/** Runs once on mount: back from checkout while logged in, so the plan is switched on without an extra click. */
function AutoStart({ actie }: { actie: () => Promise<void> }) {
  const gedaan = useRef(false);
  useEffect(() => {
    if (gedaan.current) return;
    gedaan.current = true;
    void actie();
  }, [actie]);
  return null;
}

/** Step 1 of the new flow: create an account for free, land in your dashboard (locked), then start 7 days for €1. */
function AccountZonderPlan() {
  const navigate = useNavigate();
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

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
      const res = await maakAccountZonderPlan({ data: { naam: v("naam"), bedrijf: v("bedrijf"), email: v("email"), wachtwoord: String(fd.get("wachtwoord")) } });
      if (res.ok) {
        void navigate({ to: "/dashboard" });
        return;
      }
      setFout(res.message);
    } catch {
      setFout("Something went wrong. Please try again.");
    }
    setBezig(false);
  }

  return (
    <AuthShell>
      <h1 className="v-auth__title">Create your account.</h1>
      <p className="v-auth__sub">Then you land in your dashboard. Start your plan there: the first 7 days for €1.</p>
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
          <input autoComplete="email" id="email" inputMode="email" name="email" type="email" />
        </div>
        <WachtwoordVeld context={[]} id="wachtwoord" label="Password" name="wachtwoord" soort="new" />
        <p className="v-hint v-akkoord">
          By creating an account, you agree to the <a href="/terms" target="_blank">Terms of Service</a> and the{" "}
          <a href="/dpa" target="_blank">Data Processing Agreement</a>.
        </p>
        {fout ? <p className="v-err" role="alert">{fout}</p> : null}
        <button className="v-auth__btn" disabled={bezig} type="submit">
          {bezig ? "Creating account…" : "Create account"}
        </button>
      </form>
      <a className="v-auth__link" href="/login">I already have an account</a>
    </AuthShell>
  );
}

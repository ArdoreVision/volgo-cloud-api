import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthShell } from "@/components/volgo/auth-shell";
import { WachtwoordVeld } from "@/components/volgo/wachtwoord-veld";
import { controleerInvite, maakInviteAccount } from "@/lib/api/account.functions";
import { isIngelogd } from "@/lib/api/assistent.functions";
import { beoordeel } from "@/lib/wachtwoord";
import "@/volgo.css";

/** Personal invite for the first customers: enter the code, get welcomed, create an account with 3 months free. */
export const Route = createFileRoute("/vip")({
  loader: async () => ({ ingelogd: await isIngelogd().catch(() => false) }),
  head: () => ({ meta: [{ title: "Your invitation · Volgo" }, { name: "robots", content: "noindex" }] }),
  component: Vip,
});

const GOUD = "#e7c873";
const KRIJGT = [
  ["A new website, built for you", "Made to measure by our team. You tell us what you want, we build it. Free."],
  ["Volgo inside your website", "Answers every visitor 24/7, asks your questions and books the appointment in your calendar."],
  ["One app for every warm customer", "Name, number and request in one place, on your phone and computer."],
  ["3 months completely free", "No card needed. Nothing is charged automatically. After 3 months you decide if you continue."],
];

function Vip() {
  const { ingelogd } = Route.useLoaderData();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [binnen, setBinnen] = useState(false);
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  if (ingelogd) {
    return (
      <AuthShell>
        <h1 className="v-auth__title">You’re already logged in.</h1>
        <p className="v-auth__sub">This invitation is for new accounts. Open your dashboard to continue.</p>
        <a className="v-auth__btn" href="/dashboard">Go to my dashboard</a>
      </AuthShell>
    );
  }

  async function open(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim()) return setFout("Enter the code from your invitation.");
    setFout("");
    setBezig(true);
    const r = await controleerInvite({ data: { code } }).catch(() => ({ ok: false as const, message: "Something went wrong. Please try again." }));
    setBezig(false);
    if (r.ok) setBinnen(true);
    else setFout(r.message);
  }

  async function maak(e: FormEvent<HTMLFormElement>) {
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
      const res = await maakInviteAccount({ data: { code, naam: v("naam"), bedrijf: v("bedrijf"), email: v("email"), wachtwoord: String(fd.get("wachtwoord")) } });
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

  if (!binnen) {
    return (
      <AuthShell>
        <p style={{ margin: 0, color: GOUD, fontSize: 13, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }}>By invitation only</p>
        <h1 className="v-auth__title">Enter your invite code.</h1>
        <p className="v-auth__sub">You received a personal invitation to Volgo. Enter the code to open it.</p>
        <form className="v-auth__form" noValidate onSubmit={open}>
          <div className="v-fld">
            <label htmlFor="code">Invite code</label>
            <input
              autoCapitalize="characters"
              autoComplete="off"
              autoFocus
              id="code"
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              style={{ letterSpacing: "0.18em", textTransform: "uppercase", textAlign: "center", fontWeight: 600 }}
              value={code}
            />
          </div>
          {fout ? <p className="v-err" role="alert">{fout}</p> : null}
          <button className="v-auth__btn" disabled={bezig} type="submit">
            {bezig ? "One moment…" : "Open my invitation"}
          </button>
        </form>
        <a className="v-auth__link" href="/login">I already have an account</a>
      </AuthShell>
    );
  }

  return (
    <AuthShell wide>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "0 auto 14px", width: 64, height: 64, display: "grid", placeItems: "center", borderRadius: "50%", border: `1px solid ${GOUD}`, color: GOUD, fontSize: 26, boxShadow: `0 0 60px ${GOUD}33` }} aria-hidden="true">
          ★
        </p>
        <p style={{ margin: 0, color: GOUD, fontSize: 13, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }}>Founding customer</p>
        <h1 className="v-auth__title" style={{ marginTop: 8 }}>Welcome. You’re one of the first.</h1>
        <p className="v-auth__sub" style={{ marginInline: "auto" }}>
          You were personally invited to be among the very first businesses to use Volgo. As a thank you, everything below is yours, free for 3 months.
        </p>
      </div>
      <ul style={{ listStyle: "none", margin: "22px 0 6px", padding: 0, display: "grid", gap: 10 }}>
        {KRIJGT.map(([kop, tekst]) => (
          <li key={kop} style={{ display: "flex", gap: 14, padding: "14px 16px", borderRadius: 16, border: `1px solid ${GOUD}40`, background: `${GOUD}0d` }}>
            <span aria-hidden="true" style={{ color: GOUD, fontWeight: 700 }}>✓</span>
            <div>
              <strong style={{ display: "block", fontSize: 15, marginBottom: 2 }}>{kop}</strong>
              <span style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.5 }}>{tekst}</span>
            </div>
          </li>
        ))}
      </ul>
      <h2 style={{ margin: "22px 0 0", fontSize: "1.25rem" }}>Create your account to start.</h2>
      <p className="v-auth__sub">It takes a minute. Then your dashboard opens and we start on your website.</p>
      <form className="v-auth__form" noValidate onSubmit={maak}>
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
          {bezig ? "Creating account…" : "Start my 3 free months"}
        </button>
      </form>
    </AuthShell>
  );
}

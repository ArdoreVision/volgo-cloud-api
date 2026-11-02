import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthShell } from "@/components/volgo/auth-shell";
import { WachtwoordVeld } from "@/components/volgo/wachtwoord-veld";
import { beoordeel } from "@/lib/wachtwoord";
import { herstelWachtwoord } from "@/lib/api/wachtwoord.functions";
import "@/volgo.css";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>): { token: string } => ({ token: typeof s.token === "string" ? s.token : "" }),
  head: () => ({ meta: [{ title: "New password · Volgo" }, { name: "robots", content: "noindex" }] }),
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
    const st = beoordeel(w1);
    if (!st.ok) return setFout(st.label === "Too short" ? "Choose a password of at least 8 characters." : st.tip);
    if (w1 !== w2) return setFout("The two passwords don’t match.");
    setFout("");
    setBezig(true);
    try {
      const r = await herstelWachtwoord({ data: { token, wachtwoord: w1 } });
      if (r.ok) return void navigate({ to: "/dashboard" });
      setFout(r.message);
    } catch {
      setFout("This link isn’t valid. Request a new one.");
    }
    setBezig(false);
  }

  return (
    <AuthShell>
      <h1 className="v-auth__title">New password</h1>
      <p className="v-auth__sub">Choose a password of at least 8 characters. You’ll be logged in right after.</p>
      <form className="v-auth__form" onSubmit={onSubmit}>
        <WachtwoordVeld id="w1" label="New password" name="w1" soort="new" />
        <WachtwoordVeld id="w2" label="Repeat password" name="w2" />
        {fout ? <p className="v-err" role="alert">{fout}</p> : null}
        <button className="v-auth__btn" disabled={bezig || !token} type="submit">
          {bezig ? "One moment…" : "Save and log in"}
        </button>
      </form>
      <p className="v-auth__alt">
        <a href="/forgot-password">Request a new link</a>
      </p>
    </AuthShell>
  );
}

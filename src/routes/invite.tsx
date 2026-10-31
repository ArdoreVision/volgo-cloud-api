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
  head: () => ({ meta: [{ title: "Invitation · Volgo" }, { name: "robots", content: "noindex" }] }),
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
        <h1 className="v-auth__title">This invitation no longer works.</h1>
        <p className="v-auth__sub">Ask your colleague for a new invitation. Already have an account? Log in.</p>
        <a className="v-auth__btn" href="/login">Log in</a>
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const naam = String(fd.get("naam") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const wachtwoord = String(fd.get("wachtwoord") ?? "");
    if (naam.length < 2) return setFout("Enter your name.");
    if (wachtwoord.length < 8) return setFout("Choose a password of at least 8 characters.");
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
      <p className="v-auth__ok">Invitation from {info.van}</p>
      <h1 className="v-auth__title">Join the {info.bedrijf} team.</h1>
      <p className="v-auth__sub">Create your account and you’ll go straight to the dashboard and team chat.</p>
      <form className="v-auth__form" noValidate onSubmit={(e) => void onSubmit(e)}>
        <div className="v-fld">
          <label htmlFor="naam">Your name</label>
          <input autoComplete="name" id="naam" name="naam" />
        </div>
        <div className="v-fld">
          <label htmlFor="email">Email address</label>
          <input autoComplete="email" defaultValue={info.email} id="email" name="email" type="email" />
        </div>
        <div className="v-fld">
          <label htmlFor="wachtwoord">Password</label>
          <input autoComplete="new-password" id="wachtwoord" minLength={8} name="wachtwoord" type="password" />
          <p className="v-hint">At least 8 characters.</p>
        </div>
        {fout ? <p className="v-err" role="alert">{fout}</p> : null}
        <button className="v-auth__btn" disabled={bezig} type="submit">
          {bezig ? "One moment…" : "Create account and get started"}
        </button>
      </form>
    </AuthShell>
  );
}

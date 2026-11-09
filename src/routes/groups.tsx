import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import { Footer } from "@/components/volgo/footer";
import { VolgoMark } from "@/components/volgo/logo";
import "@/volgo-dialed.css";
import "@/volgo-landing.css";

export const Route = createFileRoute("/groups")({
  head: () => ({ meta: [{ title: "Groups · Volgo" }, { name: "robots", content: "noindex" }] }),
  component: Groups,
});

/** Groups: approved team members log in with the password they got by email, then get the Discord link and their group. */
function Groups() {
  const [email, setEmail] = useState("");
  const [ww, setWw] = useState("");
  const [lid, setLid] = useState<{ naam: string; link: string; groep: string; uitleg: string } | null>(null);
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  async function open(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !ww.trim()) return;
    setBezig(true);
    setFout("");
    const r = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, wachtwoord: ww }) })
      .then((x) => x.json() as Promise<{ ok: boolean; naam?: string; link?: string; groep?: string; uitleg?: string; te_vaak?: boolean }>)
      .catch(() => null);
    setBezig(false);
    if (r?.ok && r.link) {
      setLid({ naam: r.naam ?? "", link: r.link, groep: r.groep ?? "", uitleg: r.uitleg ?? "" });
      setWw("");
      return;
    }
    setFout(r?.te_vaak ? "Too many tries. Try again in 15 minutes." : "This email and password don't match an approved member.");
  }

  return (
    <div className="volgo volgo--simpel volgo--dialed vl" id="vd">
      <header className="vl-top">
        <a className="vl-merk" href="/">
          <VolgoMark size={22} />
          <span>Volgo</span>
        </a>
      </header>
      <main>
        <section aria-labelledby="vl-groups" className="vl-hero vl-groups">
          <h1 className="vl-titel vl-groups__titel" id="vl-groups">
            Groups
          </h1>
          {lid ? (
            <>
              <p className="vl-sub">Welcome, {lid.naam}. Join our Discord, then pick your group.</p>
              <div className="vl-acties">
                <a className="vl-knop" href={lid.link} rel="noopener noreferrer" target="_blank">
                  Open Discord →
                </a>
              </div>
              <p className="vl-groups__groep">
                Your group: <strong>{lid.groep}</strong>
              </p>
              <p className="vl-klein">{lid.uitleg}</p>
            </>
          ) : (
            <>
              <p className="vl-sub">For approved team members. Log in with the email you applied with and the password we emailed you.</p>
              <form className="vl-groups__form" onSubmit={(e) => void open(e)}>
                <input aria-label="Email" autoComplete="email" onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" value={email} />
                <input aria-label="Password" autoComplete="current-password" onChange={(e) => setWw(e.target.value)} placeholder="Password" type="password" value={ww} />
                <button className="vl-knop" disabled={bezig || !email.trim() || !ww.trim()} type="submit">
                  {bezig ? "Checking…" : "Log in →"}
                </button>
              </form>
              {fout ? <p className="vl-groups__fout">{fout}</p> : null}
              <p className="vl-klein">
                Not in the team yet? <a href="/team-4f9k2q7x">Apply here</a>. After approval you get your password by email.
              </p>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

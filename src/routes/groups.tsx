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

/** Groups: enter the password to get the link to the Volgo Discord. */
function Groups() {
  const [ww, setWw] = useState("");
  const [link, setLink] = useState("");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  async function open(e: FormEvent) {
    e.preventDefault();
    if (!ww.trim()) return;
    setBezig(true);
    setFout("");
    const r = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wachtwoord: ww }) })
      .then((x) => x.json() as Promise<{ ok: boolean; link?: string; te_vaak?: boolean }>)
      .catch(() => null);
    setBezig(false);
    if (r?.ok && r.link) {
      setLink(r.link);
      setWw("");
      return;
    }
    setFout(r?.te_vaak ? "Te veel pogingen. Probeer het over 15 minuten opnieuw." : "Dat wachtwoord klopt niet.");
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
          {link ? (
            <>
              <p className="vl-sub">Je bent binnen. Open de groep op Discord.</p>
              <div className="vl-acties">
                <a className="vl-knop" href={link} rel="noopener noreferrer" target="_blank">
                  Open Discord →
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="vl-sub">Voer het wachtwoord in om de groep te openen.</p>
              <form className="vl-groups__form" onSubmit={(e) => void open(e)}>
                <input aria-label="Wachtwoord" autoComplete="off" autoFocus onChange={(e) => setWw(e.target.value)} placeholder="Wachtwoord" type="password" value={ww} />
                <button className="vl-knop" disabled={bezig || !ww.trim()} type="submit">
                  {bezig ? "Controleren…" : "Openen →"}
                </button>
              </form>
              {fout ? <p className="vl-groups__fout">{fout}</p> : null}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

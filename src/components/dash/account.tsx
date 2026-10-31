import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { wijzigAccount, wijzigWachtwoord } from "@/lib/api/wachtwoord.functions";

type G = { naam: string; bedrijf: string; email: string; rol: string; created_at: string };

export function Account({ g, loguit }: { g: G; loguit: () => void }) {
  const router = useRouter();
  const [melding1, setMelding1] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [melding2, setMelding2] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [bezig, setBezig] = useState(false);
  const eigenaar = g.rol === "eigenaar";
  const lid = new Date(g.created_at.replace(" ", "T") + "Z").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

  async function bewaarGegevens(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBezig(true);
    try {
      const r = await wijzigAccount({ data: { naam: String(fd.get("naam") ?? ""), bedrijf: eigenaar ? String(fd.get("bedrijf") ?? "") : undefined } });
      setMelding1({ ok: r.ok, tekst: r.message });
      if (r.ok) await router.invalidate();
    } catch {
      setMelding1({ ok: false, tekst: "Vul je naam (en bedrijfsnaam) in." });
    }
    setBezig(false);
  }

  async function bewaarWachtwoord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const nieuw = String(fd.get("nieuw") ?? "");
    if (nieuw.length < 8) return setMelding2({ ok: false, tekst: "Kies een nieuw wachtwoord van minstens 8 tekens." });
    if (nieuw !== String(fd.get("herhaal") ?? "")) return setMelding2({ ok: false, tekst: "De nieuwe wachtwoorden zijn niet hetzelfde." });
    setBezig(true);
    try {
      const r = await wijzigWachtwoord({ data: { huidig: String(fd.get("huidig") ?? ""), nieuw } });
      setMelding2({ ok: r.ok, tekst: r.message });
      if (r.ok) form.reset();
    } catch {
      setMelding2({ ok: false, tekst: "Er ging iets mis. Probeer het opnieuw." });
    }
    setBezig(false);
  }

  const Melding = ({ m }: { m: { ok: boolean; tekst: string } | null }) =>
    m ? (
      <span className={m.ok ? "v-ok-tekst" : "v-err"} role="status">
        {m.tekst}
      </span>
    ) : null;

  return (
    <>
      <header className="v-dash__head">
        <h1>Account</h1>
        <p>
          {g.email} · lid sinds {lid}
        </p>
      </header>

      <section className="v-dash__panel">
        <h2 className="v-sub">Je gegevens</h2>
        <form className="v-form-grid" onSubmit={bewaarGegevens}>
          <div className="v-fld">
            <label htmlFor="acc-naam">Naam</label>
            <input autoComplete="name" defaultValue={g.naam} id="acc-naam" name="naam" required />
          </div>
          <div className="v-fld">
            <label htmlFor="acc-bedrijf">
              Bedrijfsnaam{eigenaar ? null : <em>alleen de eigenaar kan dit wijzigen</em>}
            </label>
            <input defaultValue={g.bedrijf} disabled={!eigenaar} id="acc-bedrijf" name="bedrijf" required />
          </div>
          <div className="v-form-actie">
            <button className="v-btn-blauw" disabled={bezig} type="submit">
              Opslaan
            </button>
            <Melding m={melding1} />
          </div>
        </form>
      </section>

      <section className="v-dash__panel">
        <h2 className="v-sub">Wachtwoord wijzigen</h2>
        <form className="v-form-grid" onSubmit={bewaarWachtwoord}>
          <div className="v-fld">
            <label htmlFor="acc-huidig">Huidig wachtwoord</label>
            <input autoComplete="current-password" id="acc-huidig" name="huidig" required type="password" />
          </div>
          <div className="v-fld">
            <label htmlFor="acc-nieuw">Nieuw wachtwoord</label>
            <input autoComplete="new-password" id="acc-nieuw" minLength={8} name="nieuw" required type="password" />
          </div>
          <div className="v-fld">
            <label htmlFor="acc-herhaal">Herhaal nieuw wachtwoord</label>
            <input autoComplete="new-password" id="acc-herhaal" minLength={8} name="herhaal" required type="password" />
          </div>
          <div className="v-form-actie">
            <button className="v-btn-blauw" disabled={bezig} type="submit">
              Wachtwoord wijzigen
            </button>
            <Melding m={melding2} />
          </div>
        </form>
      </section>

      <section className="v-dash__panel">
        <h2 className="v-sub">Uitloggen</h2>
        <p className="v-muted">Je blijft 30 dagen ingelogd op dit apparaat. Log uit op een gedeelde computer.</p>
        <button className="v-dash__logout" onClick={loguit} type="button">
          Uitloggen
        </button>
      </section>
    </>
  );
}

import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { verwijderLid } from "@/lib/api/account.functions";
import { wijzigAccount, wijzigWachtwoord } from "@/lib/api/wachtwoord.functions";
import { WachtwoordVeld } from "@/components/volgo/wachtwoord-veld";
import { beoordeel } from "@/lib/wachtwoord";

import { ProfielFoto, verkleinFoto } from "./profiel";

type G = { id: number; naam: string; bedrijf: string; email: string; rol: string; created_at: string; foto?: string; functie?: string };
type Lid = { id: number; naam: string; email: string; rol: string };

export function Account({ g, loguit, leden = [], planNaam, openTab }: { g: G; loguit: () => void; leden?: Lid[]; planNaam?: string; openTab?: (t: string) => void }) {
  const router = useRouter();
  const [foto, setFoto] = useState(g.foto ?? "");
  const [naamNu, setNaamNu] = useState(g.naam);
  const [melding1, setMelding1] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [melding2, setMelding2] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [bezig, setBezig] = useState(false);
  const eigenaar = g.rol === "eigenaar";
  const lid = new Date(g.created_at.replace(" ", "T") + "Z").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" });

  async function bewaarGegevens(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBezig(true);
    try {
      const r = await wijzigAccount({
        data: {
          naam: String(fd.get("naam") ?? ""),
          bedrijf: eigenaar ? String(fd.get("bedrijf") ?? "") : undefined,
          functie: String(fd.get("functie") ?? ""),
          foto: foto === (g.foto ?? "") ? undefined : foto,
        },
      });
      setMelding1({ ok: r.ok, tekst: r.message });
      if (r.ok) await router.invalidate();
    } catch {
      setMelding1({ ok: false, tekst: "Controleer je naam en bedrijfsnaam, en gebruik een JPG- of PNG-foto." });
    }
    setBezig(false);
  }

  async function bewaarWachtwoord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const nieuw = String(fd.get("nieuw") ?? "");
    const st = beoordeel(nieuw, [g.naam, g.bedrijf, g.email]);
    if (!st.ok) return setMelding2({ ok: false, tekst: st.label === "Te kort" ? "Kies een nieuw wachtwoord van minstens 8 tekens." : st.tip });
    if (nieuw !== String(fd.get("herhaal") ?? "")) return setMelding2({ ok: false, tekst: "De nieuwe wachtwoorden zijn niet gelijk." });
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
        <h1>Profiel &amp; account</h1>
        <p>
          {g.email} · member since {lid}
        </p>
      </header>

      <section className="v-dash__panel">
        <h2 className="v-sub">Je profiel</h2>
        <form className="v-form-grid" onSubmit={bewaarGegevens}>
          <div className="v-pf-kies">
            <ProfielFoto foto={foto} maat={84} naam={naamNu} />
            <div>
              <strong>Profielfoto</strong>
              <p className="v-muted v-small">Rechtsboven te zien en voor je team. JPG of PNG, vierkant werkt het best.</p>
              <div className="v-pf-kies__knoppen">
                <label className="v-dash__logout v-pf-kies__upload">
                  {foto ? "Foto wijzigen" : "Foto uploaden"}
                  <input
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        setFoto(await verkleinFoto(f));
                        setMelding1({ ok: true, tekst: "Foto klaar. Klik op Profiel opslaan." });
                      } catch (err) {
                        setMelding1({ ok: false, tekst: err instanceof Error ? err.message : "Deze afbeelding kon niet gebruikt worden." });
                      }
                    }}
                    type="file"
                  />
                </label>
                {foto ? (
                  <button className="v-linkbtn--rood" onClick={() => setFoto("")} type="button">
                    Verwijderen
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="v-fld">
            <label htmlFor="acc-naam">Naam</label>
            <input autoComplete="name" defaultValue={g.naam} id="acc-naam" name="naam" onChange={(e) => setNaamNu(e.target.value)} required />
          </div>
          <div className="v-fld">
            <label htmlFor="acc-functie">
              Wat je doet <em>optional</em>
            </label>
            <input autoComplete="organization-title" defaultValue={g.functie ?? ""} id="acc-functie" maxLength={80} name="functie" placeholder="Bijv. Eigenaar, Verkoop, Planner" />
          </div>
          <div className="v-fld">
            <label htmlFor="acc-bedrijf">
              Company name{eigenaar ? null : <em>alleen de eigenaar kan dit wijzigen</em>}
            </label>
            <input defaultValue={g.bedrijf} disabled={!eigenaar} id="acc-bedrijf" name="bedrijf" required />
          </div>
          <div className="v-form-actie">
            <button className="v-btn-blauw" disabled={bezig} type="submit">
              Profiel opslaan
            </button>
            <Melding m={melding1} />
          </div>
        </form>
      </section>

      <section className="v-dash__panel">
        <h2 className="v-sub">Account</h2>
        <dl className="v-acc-info">
          <div>
            <dt>E-mail</dt>
            <dd>{g.email}</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>{eigenaar ? "Eigenaar" : "Teamlid"}</dd>
          </div>
          {planNaam ? (
            <div>
              <dt>Pakket</dt>
              <dd>
                Volgo {planNaam}
                {openTab && eigenaar ? (
                  <button className="v-linkbtn" onClick={() => openTab("abonnement")} type="button">
                    Abonnement beheren
                  </button>
                ) : null}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Lid sinds</dt>
            <dd>{lid}</dd>
          </div>
        </dl>
      </section>

      <section className="v-dash__panel">
        <h2 className="v-sub">Wachtwoord wijzigen</h2>
        <form className="v-form-grid" onSubmit={bewaarWachtwoord}>
          <WachtwoordVeld id="acc-huidig" label="Huidig wachtwoord" name="huidig" />
          <WachtwoordVeld context={[g.naam, g.bedrijf, g.email]} id="acc-nieuw" label="Nieuw wachtwoord" name="nieuw" soort="new" />
          <WachtwoordVeld id="acc-herhaal" label="Herhaal nieuw wachtwoord" name="herhaal" />
          <div className="v-form-actie">
            <button className="v-btn-blauw" disabled={bezig} type="submit">
              Wachtwoord wijzigen
            </button>
            <Melding m={melding2} />
          </div>
        </form>
      </section>

      {eigenaar && leden.length > 1 ? (
        <section className="v-dash__panel">
          <h2 className="v-sub">Teamleden</h2>
          <ul className="v-leden">
            {leden.map((l) => (
              <li key={l.id}>
                <span className="v-dash__avatar" aria-hidden="true">
                  {l.naam.trim()[0]?.toUpperCase()}
                </span>
                <div>
                  <strong>{l.naam}</strong>
                  <small>
                    {l.email} · {l.rol === "eigenaar" ? "Eigenaar" : "Lid"}
                  </small>
                </div>
                {l.id !== g.id ? (
                  <button
                    className="v-linkbtn--rood"
                    onClick={async () => {
                      if (!window.confirm(`${l.naam} uit je team verwijderen? Diegene kan dan niet meer inloggen.`)) return;
                      await verwijderLid({ data: { id: l.id } });
                      await router.invalidate();
                    }}
                    type="button"
                  >
                    Verwijderen
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

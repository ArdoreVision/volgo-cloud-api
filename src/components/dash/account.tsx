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
  const lid = new Date(g.created_at.replace(" ", "T") + "Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" });

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
      setMelding1({ ok: false, tekst: "Check your name and company name, and use a JPG or PNG photo." });
    }
    setBezig(false);
  }

  async function bewaarWachtwoord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const nieuw = String(fd.get("nieuw") ?? "");
    const st = beoordeel(nieuw, [g.naam, g.bedrijf, g.email]);
    if (!st.ok) return setMelding2({ ok: false, tekst: st.label === "Too short" ? "Choose a new password of at least 8 characters." : st.tip });
    if (nieuw !== String(fd.get("herhaal") ?? "")) return setMelding2({ ok: false, tekst: "The new passwords don't match." });
    setBezig(true);
    try {
      const r = await wijzigWachtwoord({ data: { huidig: String(fd.get("huidig") ?? ""), nieuw } });
      setMelding2({ ok: r.ok, tekst: r.message });
      if (r.ok) form.reset();
    } catch {
      setMelding2({ ok: false, tekst: "Something went wrong. Please try again." });
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
        <h1>Profile &amp; account</h1>
        <p>
          {g.email} · member since {lid}
        </p>
      </header>

      <section className="v-dash__panel">
        <h2 className="v-sub">Your profile</h2>
        <form className="v-form-grid" onSubmit={bewaarGegevens}>
          <div className="v-pf-kies">
            <ProfielFoto foto={foto} maat={84} naam={naamNu} />
            <div>
              <strong>Profile photo</strong>
              <p className="v-muted v-small">Shown in the top right and to your team. JPG or PNG, square works best.</p>
              <div className="v-pf-kies__knoppen">
                <label className="v-dash__logout v-pf-kies__upload">
                  {foto ? "Change photo" : "Upload photo"}
                  <input
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        setFoto(await verkleinFoto(f));
                        setMelding1({ ok: true, tekst: "Photo ready. Click Save profile." });
                      } catch (err) {
                        setMelding1({ ok: false, tekst: err instanceof Error ? err.message : "This image couldn't be used." });
                      }
                    }}
                    type="file"
                  />
                </label>
                {foto ? (
                  <button className="v-linkbtn--rood" onClick={() => setFoto("")} type="button">
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="v-fld">
            <label htmlFor="acc-naam">Name</label>
            <input autoComplete="name" defaultValue={g.naam} id="acc-naam" name="naam" onChange={(e) => setNaamNu(e.target.value)} required />
          </div>
          <div className="v-fld">
            <label htmlFor="acc-functie">
              What you do <em>optional</em>
            </label>
            <input autoComplete="organization-title" defaultValue={g.functie ?? ""} id="acc-functie" maxLength={80} name="functie" placeholder="E.g. Owner, Sales, Planner" />
          </div>
          <div className="v-fld">
            <label htmlFor="acc-bedrijf">
              Company name{eigenaar ? null : <em>only the owner can change this</em>}
            </label>
            <input defaultValue={g.bedrijf} disabled={!eigenaar} id="acc-bedrijf" name="bedrijf" required />
          </div>
          <div className="v-form-actie">
            <button className="v-btn-blauw" disabled={bezig} type="submit">
              Save profile
            </button>
            <Melding m={melding1} />
          </div>
        </form>
      </section>

      <section className="v-dash__panel">
        <h2 className="v-sub">Account</h2>
        <dl className="v-acc-info">
          <div>
            <dt>Email</dt>
            <dd>{g.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{eigenaar ? "Owner" : "Team member"}</dd>
          </div>
          {planNaam ? (
            <div>
              <dt>Plan</dt>
              <dd>
                Volgo {planNaam}
                {openTab && eigenaar ? (
                  <button className="v-linkbtn" onClick={() => openTab("abonnement")} type="button">
                    Manage subscription
                  </button>
                ) : null}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Member since</dt>
            <dd>{lid}</dd>
          </div>
        </dl>
      </section>

      <section className="v-dash__panel">
        <h2 className="v-sub">Change password</h2>
        <form className="v-form-grid" onSubmit={bewaarWachtwoord}>
          <WachtwoordVeld id="acc-huidig" label="Current password" name="huidig" />
          <WachtwoordVeld context={[g.naam, g.bedrijf, g.email]} id="acc-nieuw" label="New password" name="nieuw" soort="new" />
          <WachtwoordVeld id="acc-herhaal" label="Repeat new password" name="herhaal" />
          <div className="v-form-actie">
            <button className="v-btn-blauw" disabled={bezig} type="submit">
              Change password
            </button>
            <Melding m={melding2} />
          </div>
        </form>
      </section>

      {eigenaar && leden.length > 1 ? (
        <section className="v-dash__panel">
          <h2 className="v-sub">Team members</h2>
          <ul className="v-leden">
            {leden.map((l) => (
              <li key={l.id}>
                <span className="v-dash__avatar" aria-hidden="true">
                  {l.naam.trim()[0]?.toUpperCase()}
                </span>
                <div>
                  <strong>{l.naam}</strong>
                  <small>
                    {l.email} · {l.rol === "eigenaar" ? "Owner" : "Member"}
                  </small>
                </div>
                {l.id !== g.id ? (
                  <button
                    className="v-linkbtn--rood"
                    onClick={async () => {
                      if (!window.confirm(`Remove ${l.naam} from your team? They can no longer log in.`)) return;
                      await verwijderLid({ data: { id: l.id } });
                      await router.invalidate();
                    }}
                    type="button"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="v-dash__panel">
        <h2 className="v-sub">Log out</h2>
        <p className="v-muted">You stay logged in on this device for 30 days. Log out on a shared computer.</p>
        <button className="v-dash__logout" onClick={loguit} type="button">
          Log out
        </button>
      </section>
    </>
  );
}

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { bewaarAva, bewaarMeldingen, haalAva } from "@/lib/api/ava.functions";

type Ava = Awaited<ReturnType<typeof haalAva>>;
const KLEUREN = ["#1677d9", "#111318", "#1f9d55", "#6d4fd8", "#e07a10", "#d63c7b"];

function Toggle({ aan, onChange, label, uitleg }: { aan: boolean; onChange: (v: boolean) => void; label: string; uitleg: string }) {
  return (
    <label className="v-toggle">
      <span>
        <strong>{label}</strong>
        <small>{uitleg}</small>
      </span>
      <input checked={aan} onChange={(e) => onChange(e.target.checked)} role="switch" type="checkbox" />
      <i aria-hidden="true" />
    </label>
  );
}

export function AvaInstellen() {
  const [ava, setAva] = useState<Ava | null>(null);
  const [kleur, setKleur] = useState("#1677d9");
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);
  const [melding, setMelding] = useState({ chat: true, lead: true, email: false, heet_mail: true, samenvatting: true });
  const [browser, setBrowser] = useState<string>("default");

  useEffect(() => {
    void haalAva().then((a) => {
      setAva(a);
      setKleur(a.inst.kleur);
      setMelding({ chat: !!a.meldingen.chat, lead: !!a.meldingen.lead, email: !!a.meldingen.email, heet_mail: !!a.meldingen.heet_mail, samenvatting: !!a.meldingen.samenvatting });
    });
    if (typeof Notification !== "undefined") setBrowser(Notification.permission);
  }, []);

  async function wijzigMelding(k: keyof typeof melding, v: boolean) {
    const nieuw = { ...melding, [k]: v };
    setMelding(nieuw);
    await bewaarMeldingen({ data: nieuw });
    if (v && (k === "chat" || k === "lead") && typeof Notification !== "undefined" && Notification.permission === "default") {
      setBrowser(await Notification.requestPermission());
    }
  }

  async function opslaan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await bewaarAva({
      data: {
        naam: String(fd.get("naam") ?? "AVA").trim() || "AVA",
        begroeting: String(fd.get("begroeting") ?? "").trim(),
        bedrijfsinfo: String(fd.get("bedrijfsinfo") ?? "").trim(),
        kleur,
      },
    });
    setOpgeslagen(true);
    window.setTimeout(() => setOpgeslagen(false), 2500);
  }

  if (!ava) return <p className="v-feed__empty">AVA wordt geladen…</p>;
  const host = typeof window !== "undefined" ? window.location.origin : "";
  const code = `<script src="${host}/ava.js" data-key="${ava.inst.sleutel}" defer></script>`;

  return (
    <>
      <header className="v-dash__head v-dash__head--row">
        <div>
          <h1>AVA</h1>
          <p>
            {ava.aiActief ? "AVA voert echte gesprekken met AI." : "AVA draait in basismodus: een korte vaste intake. Met de Claude-koppeling voert AVA echte gesprekken."}
          </p>
        </div>
        <a className="v-addbtn" href={`/demo/${ava.inst.sleutel}`} rel="noopener" target="_blank">
          Probeer AVA op een voorbeeldsite
        </a>
      </header>

      <div className="v-dash__grid">
        <section className="v-dash__panel">
          <div className="v-dash__panel-head">
            <h2>Meldingen</h2>
          </div>
          <div className="v-toggles">
            <Toggle aan={melding.chat} label="Nieuw gesprek" onChange={(v) => void wijzigMelding("chat", v)} uitleg="Een seintje zodra iemand AVA aanspreekt." />
            <Toggle aan={melding.lead} label="Nieuwe lead" onChange={(v) => void wijzigMelding("lead", v)} uitleg="Als een bezoeker zijn gegevens achterlaat, met warmte." />
            <Toggle aan={melding.heet_mail} label="E-mail bij een hete lead" onChange={(v) => void wijzigMelding("heet_mail", v)} uitleg="Direct een mail als iemand met warmte 75 of hoger zijn gegevens achterlaat." />
            <Toggle aan={melding.email} label="E-mail bij elke lead" onChange={(v) => void wijzigMelding("email", v)} uitleg="Ook een mail bij minder warme leads." />
            <Toggle aan={melding.samenvatting} label="Ochtendsamenvatting" onChange={(v) => void wijzigMelding("samenvatting", v)} uitleg="Elke ochtend om 7:00 een korte mail: nieuwe leads, wie je moet bellen en je afspraken." />
          </div>
          {browser === "denied" ? <p className="v-muted v-small">Je browser blokkeert meldingen. Je ziet ze wel in het dashboard zelf.</p> : null}
        </section>

        <section className="v-dash__panel">
          <div className="v-dash__panel-head">
            <h2>Op de website</h2>
          </div>
          <p className="v-muted v-small">Volgo zet AVA in je website. Je hoeft zelf niets te doen. Bouw je de site zelf? Plak dan deze ene regel vlak voor &lt;/body&gt;.</p>
          <div className="v-copy">
            <input aria-label="Installatiecode" readOnly value={code} />
            <button
              onClick={() => {
                navigator.clipboard.writeText(code).then(() => setGekopieerd(true), () => setGekopieerd(false));
              }}
              type="button"
            >
              {gekopieerd ? "Gekopieerd" : "Kopieer"}
            </button>
          </div>
        </section>
      </div>

      <section className="v-dash__panel">
        <div className="v-dash__panel-head">
          <h2>Zo praat AVA</h2>
        </div>
        <form className="v-ava-form" onSubmit={(e) => void opslaan(e)}>
          <div className="v-row">
            <div className="v-fld">
              <label htmlFor="ava-naam">Naam van de assistent</label>
              <input defaultValue={ava.inst.naam} id="ava-naam" maxLength={30} name="naam" />
            </div>
            <div className="v-fld">
              <span className="v-fld__label">Kleur</span>
              <div className="v-swatches" role="radiogroup" aria-label="Kleur">
                {KLEUREN.map((k) => (
                  <button aria-checked={kleur === k} aria-label={k} className="v-swatch" key={k} onClick={() => setKleur(k)} role="radio" style={{ background: k }} type="button" />
                ))}
              </div>
            </div>
          </div>
          <div className="v-fld">
            <label htmlFor="ava-begroeting">Eerste bericht</label>
            <input defaultValue={ava.inst.begroeting} id="ava-begroeting" maxLength={300} name="begroeting" />
          </div>
          <div className="v-fld">
            <label htmlFor="ava-info">Wat AVA over je bedrijf moet weten</label>
            <textarea
              defaultValue={ava.inst.bedrijfsinfo}
              id="ava-info"
              maxLength={4000}
              name="bedrijfsinfo"
              placeholder="Bijv. diensten, werkgebied, openingstijden, hoe snel jullie terugbellen, wat jullie niet doen."
              rows={6}
            />
          </div>
          <div className="v-modal__actions">
            {opgeslagen ? <span className="v-auth__ok">Opgeslagen</span> : null}
            <button className="v-btn-dark" type="submit">
              Opslaan
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

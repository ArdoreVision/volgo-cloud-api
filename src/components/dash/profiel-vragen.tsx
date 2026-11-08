import { useState } from "react";

import { VolgoMark } from "@/components/volgo/logo";
import { bewaarProfiel } from "@/lib/api/ava.functions";
import { VRAGEN, profielAntwoorden, type Profiel } from "@/lib/profiel-vragen";

/**
 * Five closed questions, one per screen, before the dashboard opens.
 * Pick an answer and you move on automatically; the last one saves.
 */
export function ProfielVragen({ bedrijf, start = {}, klaar, annuleer }: { bedrijf: string; start?: Profiel; klaar: () => void | Promise<void>; annuleer?: () => void }) {
  const [stap, setStap] = useState(0);
  const [antwoorden, setAntwoorden] = useState<Profiel>(start);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const vraag = VRAGEN[stap]!;
  const laatste = stap === VRAGEN.length - 1;
  const gekozen = antwoorden[vraag.id];

  async function kies(id: string) {
    const nieuw = { ...antwoorden, [vraag.id]: id };
    setAntwoorden(nieuw);
    if (!laatste) {
      window.setTimeout(() => setStap((s) => s + 1), 160);
      return;
    }
    setBezig(true);
    setFout("");
    const r = await bewaarProfiel({ data: nieuw as Record<string, string> }).catch(() => ({ ok: false as const, message: "Er ging iets mis. Probeer het opnieuw." }));
    setBezig(false);
    if (!r.ok) {
      setFout(r.message || "Beantwoord alle vijf de vragen.");
      return;
    }
    await klaar();
  }

  return (
    <div className="v-vragen" role="dialog" aria-labelledby="vr-titel" aria-modal="true">
      <div className="v-vragen__kaart">
        <header className="v-vragen__top">
          <span className="v-nav__brand">
            <VolgoMark />
            <span>Volgo</span>
          </span>
          <span className="v-vragen__teller">
            {stap + 1} / {VRAGEN.length}
          </span>
        </header>
        <div aria-hidden="true" className="v-vragen__balk">
          <i style={{ width: `${((stap + (gekozen ? 1 : 0)) / VRAGEN.length) * 100}%` }} />
        </div>
        {stap === 0 && !annuleer ? <p className="v-vragen__intro">Vijf korte vragen, zodat Volgo weet hoe het de klanten van {bedrijf} helpt. Duurt nog geen minuut.</p> : null}
        <h1 className="v-vragen__titel" id="vr-titel" key={vraag.id}>
          {vraag.titel}
        </h1>
        <p className="v-vragen__sub">{vraag.sub}</p>
        <div className="v-vragen__opties" role="radiogroup" aria-label={vraag.titel}>
          {vraag.opties.map((o) => (
            <button aria-checked={gekozen === o.id} className="v-vragen__optie" disabled={bezig} key={o.id} onClick={() => void kies(o.id)} role="radio" type="button">
              <span className="v-vragen__bol" aria-hidden="true" />
              <span>
                <strong>{o.label}</strong>
                {o.uitleg ? <small>{o.uitleg}</small> : null}
              </span>
            </button>
          ))}
        </div>
        {fout ? <p className="v-vragen__fout">{fout}</p> : null}
        <footer className="v-vragen__voet">
          {stap > 0 ? (
            <button className="v-vragen__terug" disabled={bezig} onClick={() => setStap((s) => s - 1)} type="button">
              Terug
            </button>
          ) : annuleer ? (
            <button className="v-vragen__terug" onClick={annuleer} type="button">
              Annuleren
            </button>
          ) : (
            <span />
          )}
          <span className="v-vragen__hint">{bezig ? "Opslaan…" : laatste ? "Kies er één om af te ronden" : "Kies er één om verder te gaan"}</span>
        </footer>
      </div>
    </div>
  );
}

/** The answers, shown on the Train Volgo page, with a button to change them. */
export function ProfielSamenvatting({ profiel, wijzig }: { profiel: Profiel; wijzig: () => void }) {
  const rijen = profielAntwoorden(profiel);
  return (
    <section className="v-dash__panel v-profiel-kaart">
      <div className="v-profiel-kaart__kop">
        <div>
          <h2>Je bedrijf in vijf antwoorden</h2>
          <p className="v-muted">Volgo gebruikt dit om te bepalen wat het vraagt en hoe het klinkt.</p>
        </div>
        <button className="v-btn-wit" onClick={wijzig} type="button">
          Antwoorden wijzigen
        </button>
      </div>
      <dl className="v-profiel-kaart__lijst">
        {rijen.map(({ vraag, optie }) => (
          <div key={vraag.id}>
            <dt>{vraag.titel}</dt>
            <dd>{optie?.label ?? "Nog niet beantwoord"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

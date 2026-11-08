import { useEffect, useState } from "react";

import { haalReviewsKlant, schrijfReviewAntwoord } from "@/lib/api/groei.functions";

import { datumAms, sqlDate } from "./util";

type Data = Awaited<ReturnType<typeof haalReviewsKlant>>;

/** Reviews: Volgo asks for them after every appointment and writes the reply to any review you paste. */
export function Reviews({ openTab }: { openTab: (t: string) => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [sterren, setSterren] = useState(5);
  const [naam, setNaam] = useState("");
  const [review, setReview] = useState("");
  const [antwoord, setAntwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [gekopieerd, setGekopieerd] = useState(false);
  const laad = () => void haalReviewsKlant().then(setD).catch(() => undefined);
  useEffect(laad, []);

  async function schrijf() {
    if (review.trim().length < 2) return setFout("Plak eerst de review.");
    setBezig(true);
    setFout("");
    setGekopieerd(false);
    const r = await schrijfReviewAntwoord({ data: { naam: naam || undefined, sterren, review } }).catch(() => null);
    setBezig(false);
    if (!r?.ok) return setFout(r?.message ?? "Dat lukte niet. Probeer het opnieuw.");
    setAntwoord(r.antwoord);
    laad();
  }

  return (
    <div className="v-g">
      <header className="v-g__kop">
        <h1>Reviews</h1>
        <p>Meer Google-reviews betekent meer mensen die je vertrouwen voordat ze bellen. Volgo vraagt elke klant na de afspraak om een review en schrijft je antwoorden.</p>
      </header>

      <section className="v-g__kaart">
        <h2>Automatische reviewverzoeken</h2>
        {d && !d.reviewUrl ? (
          <>
            <p>Zet één keer je Google-reviewlink erin, dan vraagt Volgo elke klant een uur na de afspraak om een review.</p>
            <button className="v-g__knop" onClick={() => openTab("mijnsite")} type="button">
              Reviewlink toevoegen
            </button>
          </>
        ) : d ? (
          <>
            <p>
              {d.aan ? "Aan." : "Uit."} Volgo stuurt je link <a href={d.reviewUrl} rel="noreferrer" target="_blank">{d.reviewUrl.replace(/^https:\/\//, "").slice(0, 48)}</a> één keer per klant.
            </p>
            {d.verzoeken.length === 0 ? <p className="v-g__leeg">Nog geen verzoeken verstuurd.</p> : null}
            <ul className="v-g__lijst">
              {d.verzoeken.slice(0, 8).map((v, i) => (
                <li key={i}>
                  <span>{v.aan}</span>
                  <small>
                    {datumAms(sqlDate(v.gemaakt))} · {v.status === "verstuurd" ? (v.kanaal === "sms" ? "sms ✓" : "mail ✓") : "niet afgeleverd"}
                  </small>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="v-g__leeg">Laden…</p>
        )}
      </section>

      <section className="v-g__kaart">
        <h2>Antwoord op een review</h2>
        <p>Plak een review van Google, Volgo schrijft een persoonlijk antwoord in jouw toon. Kopieer het en plak het onder de review in Google.</p>
        <div className="v-g__form">
          <label className="v-g__veld">
            Naam van de schrijver
            <input onChange={(e) => setNaam(e.target.value)} placeholder="Bijvoorbeeld Anna" value={naam} />
          </label>
          <div className="v-g__veld">
            Sterren
            <div className="v-g__sterren" role="radiogroup" aria-label="Sterren">
              {[1, 2, 3, 4, 5].map((n) => (
                <button aria-checked={sterren === n} aria-label={`${n} sterren`} className={n <= sterren ? "is-aan" : ""} key={n} onClick={() => setSterren(n)} role="radio" type="button">
                  ★
                </button>
              ))}
            </div>
          </div>
          <label className="v-g__veld is-breed">
            De review
            <textarea onChange={(e) => setReview(e.target.value)} placeholder="Plak de review hier" rows={4} value={review} />
          </label>
          <div className="v-g__knoppen is-breed">
            <button className="v-g__knop" disabled={bezig} onClick={() => void schrijf()} type="button">
              {bezig ? "Schrijven…" : "Schrijf mijn antwoord"}
            </button>
            {fout ? <span className="v-g__fout">{fout}</span> : null}
          </div>
        </div>
        {antwoord ? (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <p className="v-g__antwoord">{antwoord}</p>
            <div className="v-g__knoppen">
              <button
                className="v-g__knop2"
                onClick={() => {
                  void navigator.clipboard.writeText(antwoord).then(() => setGekopieerd(true));
                }}
                type="button"
              >
                {gekopieerd ? "Gekopieerd ✓" : "Antwoord kopiëren"}
              </button>
              <button className="v-g__knop2" disabled={bezig} onClick={() => void schrijf()} type="button">
                Schrijf een andere versie
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {d && d.antwoorden.length ? (
        <section className="v-g__kaart">
          <h2>Eerdere antwoorden</h2>
          <ul className="v-g__lijst">
            {d.antwoorden.map((a) => (
              <li key={a.id}>
                <span>
                  <strong>
                    {"★".repeat(a.sterren)} {a.naam}
                  </strong>
                  <br />
                  <small>{a.review.slice(0, 120)}</small>
                  <br />
                  {a.antwoord}
                </span>
                <small>{datumAms(sqlDate(a.gemaakt))}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

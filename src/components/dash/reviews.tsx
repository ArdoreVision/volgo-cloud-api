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
    if (review.trim().length < 2) return setFout("Paste the review first.");
    setBezig(true);
    setFout("");
    setGekopieerd(false);
    const r = await schrijfReviewAntwoord({ data: { naam: naam || undefined, sterren, review } }).catch(() => null);
    setBezig(false);
    if (!r?.ok) return setFout(r?.message ?? "That did not work. Please try again.");
    setAntwoord(r.antwoord);
    laad();
  }

  return (
    <div className="v-g">
      <header className="v-g__kop">
        <h1>Reviews</h1>
        <p>More Google reviews means more people who trust you before they call. Volgo asks every customer for a review after the appointment and writes your replies.</p>
      </header>

      <section className="v-g__kaart">
        <h2>Automatic review requests</h2>
        {d && !d.reviewUrl ? (
          <>
            <p>Add your Google review link once, and Volgo asks every customer for a review an hour after the appointment.</p>
            <button className="v-g__knop" onClick={() => openTab("kanalen")} type="button">
              Add review link
            </button>
          </>
        ) : d ? (
          <>
            <p>
              {d.aan ? "On." : "Off."} Volgo sends your link <a href={d.reviewUrl} rel="noreferrer" target="_blank">{d.reviewUrl.replace(/^https:\/\//, "").slice(0, 48)}</a> once per customer.
            </p>
            {d.verzoeken.length === 0 ? <p className="v-g__leeg">No requests sent yet.</p> : null}
            <ul className="v-g__lijst">
              {d.verzoeken.slice(0, 8).map((v, i) => (
                <li key={i}>
                  <span>{v.aan}</span>
                  <small>
                    {datumAms(sqlDate(v.gemaakt))} · {v.status === "verstuurd" ? (v.kanaal === "sms" ? "sms ✓" : "mail ✓") : "not delivered"}
                  </small>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="v-g__leeg">Loading…</p>
        )}
      </section>

      <section className="v-g__kaart">
        <h2>Reply to a review</h2>
        <p>Paste a review from Google and Volgo writes a personal reply in your tone. Copy it and paste it under the review in Google.</p>
        <div className="v-g__form">
          <label className="v-g__veld">
            Name of the writer
            <input onChange={(e) => setNaam(e.target.value)} placeholder="For example Anna" value={naam} />
          </label>
          <div className="v-g__veld">
            Stars
            <div className="v-g__sterren" role="radiogroup" aria-label="Stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button aria-checked={sterren === n} aria-label={`${n} sterren`} className={n <= sterren ? "is-aan" : ""} key={n} onClick={() => setSterren(n)} role="radio" type="button">
                  ★
                </button>
              ))}
            </div>
          </div>
          <label className="v-g__veld is-breed">
            The review
            <textarea onChange={(e) => setReview(e.target.value)} placeholder="Paste the review here" rows={4} value={review} />
          </label>
          <div className="v-g__knoppen is-breed">
            <button className="v-g__knop" disabled={bezig} onClick={() => void schrijf()} type="button">
              {bezig ? "Writing…" : "Write my reply"}
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
                {gekopieerd ? "Copied ✓" : "Copy reply"}
              </button>
              <button className="v-g__knop2" disabled={bezig} onClick={() => void schrijf()} type="button">
                Write another version
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {d && d.antwoorden.length ? (
        <section className="v-g__kaart">
          <h2>Earlier replies</h2>
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

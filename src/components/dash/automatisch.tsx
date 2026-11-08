import { useEffect, useState } from "react";

import { haalAutomatisch } from "@/lib/api/groei.functions";

import { datumAms, sqlDate } from "./util";

type Data = Awaited<ReturnType<typeof haalAutomatisch>>;

const SOORT: Record<string, string> = { herinnering: "Herinnering", review: "Reviewverzoek", opvolging: "Opvolging", seizoen: "Seizoensbericht" };

/** What Volgo does by itself after a chat or appointment. The customer sees it; Volgo (the owner) switches it. */
export function Automatisch({ openTab }: { openTab: (t: string) => void }) {
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    void haalAutomatisch().then(setD).catch(() => undefined);
  }, []);
  if (!d) return <p className="v-g__leeg">Laden…</p>;

  const kanaal = d.sms ? "mail of sms" : "mail";
  const kaarten: { id: keyof Data["aan"]; titel: string; tekst: string; let?: string }[] = [
    { id: "herinnering", titel: "Herinnering een dag van tevoren", tekst: `Iedereen met een afspraak krijgt ongeveer 24 uur van tevoren een herinnering per ${kanaal}. Minder mensen vergeten te komen.` },
    {
      id: "review",
      titel: "Reviewverzoek na de afspraak",
      tekst: "Een uur na de afspraak vraagt Volgo om een Google-review, één keer per klant.",
      let: d.reviewUrl ? undefined : "Zet je Google-reviewlink onder Je website",
    },
    { id: "opvolging", titel: "Opvolging voor wie niet boekte", tekst: "Gegevens achtergelaten maar geen afspraak? Volgo volgt op na 1 en na 3 dagen, geschreven op wat ze vroegen. Het stopt zodra ze antwoorden of boeken." },
    { id: "seizoen", titel: "Seizoensbericht aan eerdere klanten", tekst: "Vier keer per jaar een kort, nuttig bericht aan eerdere klanten (voor een hovenier: \"tijd om de heg te snoeien?\") met een knop om een moment te plannen." },
  ];

  return (
    <div className="v-g">
      <header className="v-g__kop">
        <h1>Automatisch</h1>
        <p>Wat Volgo zelf doet, zodat er geen klant tussendoor glipt. Opvolg- en seizoensberichten hebben altijd een afmeldlink.</p>
      </header>

      <div className="v-g__raster">
        {kaarten.map((k) => {
          const aan = d.aan[k.id];
          return (
            <div className="v-g__auto" key={k.id}>
              <span className={`v-g__status${aan && !k.let ? " is-aan" : aan && k.let ? " is-let" : ""}`}>{aan ? (k.let ? "Wacht" : "Aan") : "Uit"}</span>
              <strong>{k.titel}</strong>
              <p>{k.tekst}</p>
              {aan && k.let ? (
                <button className="v-g__knop2" onClick={() => openTab("mijnsite")} type="button">
                  {k.let}
                </button>
              ) : null}
              <span className="v-g__getal">
                <b>{d.maand[k.id] ?? 0}</b> verstuurd in de laatste 30 dagen
              </span>
            </div>
          );
        })}
      </div>
      <p className="v-g__leeg">Wil je er een aan of uit? Stuur je Volgo-contact een bericht, wij passen het aan.</p>

      <section className="v-g__kaart">
        <h2>Verstuurd door Volgo</h2>
        <p>De laatste automatische berichten. Je vindt ze ook in het gesprek in je Inbox.</p>
        {d.log.length === 0 ? <p className="v-g__leeg">Nog niets verstuurd. Zodra iemand boekt of gegevens achterlaat, zie je het hier.</p> : null}
        <ul className="v-g__lijst">
          {d.log.map((l) => (
            <li key={l.id}>
              <span>
                <strong>{SOORT[l.soort] ?? l.soort}</strong> aan {l.aan}
                <br />
                <small>{l.onderwerp}</small>
              </span>
              <small>
                {datumAms(sqlDate(l.gemaakt))}
                <br />
                {l.status === "verstuurd" ? (l.kanaal === "sms" ? "Sms ✓" : "Mail ✓") : "Niet afgeleverd"}
              </small>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

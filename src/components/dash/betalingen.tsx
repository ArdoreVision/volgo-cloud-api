import { type FormEvent, useEffect, useState } from "react";

import { annuleerBetaalverzoek, haalBetalingen, maakBetaalverzoek, markeerBetaald } from "@/lib/api/groei.functions";

import { datumAms, sqlDate } from "./util";

type Data = Awaited<ReturnType<typeof haalBetalingen>>;
const euro = (c: number) => `€ ${(c / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Payment requests: send a customer a payment link after the job, see who paid. */
export function Betalingen() {
  const [d, setD] = useState<Data | null>(null);
  const [gesprek, setGesprek] = useState<number | "">("");
  const [naam, setNaam] = useState("");
  const [contact, setContact] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string; link?: string } | null>(null);
  const laad = () => void haalBetalingen().then(setD).catch(() => undefined);
  useEffect(laad, []);

  async function stuur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const bedrag = Math.round(Number(String(fd.get("bedrag") ?? "").replace(/\./g, "").replace(",", ".")) * 100);
    const omschrijving = String(fd.get("omschrijving") ?? "").trim();
    if (!naam.trim() || !contact.trim() || !(bedrag >= 100) || omschrijving.length < 2) return setMelding({ ok: false, tekst: "Vul naam, mail of mobiel nummer, bedrag (minstens € 1) en waarvoor in." });
    setBezig(true);
    const r = await maakBetaalverzoek({ data: { naam: naam.trim(), contact: contact.trim(), bedrag, omschrijving, gesprek_id: gesprek || undefined } }).catch(() => null);
    setBezig(false);
    if (!r) return setMelding({ ok: false, tekst: "Dat lukte niet. Probeer het opnieuw." });
    if (!r.ok) return setMelding({ ok: false, tekst: r.message });
    setMelding({ ok: true, tekst: r.verstuurd ? `Verstuurd naar ${contact}.` : r.message, link: r.link });
    form.reset();
    setNaam("");
    setContact("");
    setGesprek("");
    laad();
  }

  if (!d) return <p className="v-g__leeg">Laden…</p>;
  const open = d.verzoeken.filter((v) => v.status === "open").reduce((n, v) => n + v.bedrag, 0);
  const betaald = d.verzoeken.filter((v) => v.status === "betaald").reduce((n, v) => n + v.bedrag, 0);

  return (
    <div className="v-g">
      <header className="v-g__kop">
        <h1>Betalingen</h1>
        <p>Klus klaar? Stuur in 10 seconden een betaalverzoek. Je klant krijgt een link per mail of sms en betaalt {d.online ? "met iDEAL of kaart" : "met een overboeking"}, direct op jouw rekening.</p>
      </header>

      {!d.klaar ? (
        <section className="v-g__kaart">
          <h2>Nog niet aangezet</h2>
          <p>Volgo heeft je rekeningnummer (IBAN) of je Stripe-account nodig om betaalverzoeken te sturen. Stuur je Volgo-contact een bericht, dan staat het dezelfde dag klaar.</p>
        </section>
      ) : (
        <section className="v-g__kaart">
          <h2>Nieuw betaalverzoek</h2>
          <form className="v-g__form" onSubmit={(e) => void stuur(e)}>
            {d.contacten.length ? (
              <label className="v-g__veld is-breed">
                Uit een gesprek
                <select
                  onChange={(e) => {
                    const id = Number(e.target.value) || "";
                    setGesprek(id);
                    const c = d.contacten.find((x) => x.gesprek_id === id);
                    if (c) {
                      setNaam(c.naam === "Websitebezoeker" ? "" : c.naam);
                      setContact(c.contact.split(" · ")[0]);
                    }
                  }}
                  value={gesprek}
                >
                  <option value="">Kies een klant (of vul hieronder in)</option>
                  {d.contacten.map((c) => (
                    <option key={c.gesprek_id} value={c.gesprek_id}>
                      {c.naam} · {c.contact}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="v-g__veld">
              Naam
              <input onChange={(e) => setNaam(e.target.value)} required value={naam} />
            </label>
            <label className="v-g__veld">
              Mail of mobiel nummer
              <input onChange={(e) => setContact(e.target.value)} required value={contact} />
            </label>
            <label className="v-g__veld">
              Bedrag (€)
              <input inputMode="decimal" name="bedrag" placeholder="250,00" required />
            </label>
            <label className="v-g__veld">
              Voor
              <input maxLength={160} name="omschrijving" placeholder="Tuinonderhoud maart" required />
            </label>
            <div className="v-g__knoppen is-breed">
              <button className="v-g__knop" disabled={bezig} type="submit">
                {bezig ? "Versturen…" : "Betaalverzoek versturen"}
              </button>
              {melding ? <span className={melding.ok ? "v-g__ok" : "v-g__fout"}>{melding.tekst}</span> : null}
              {melding?.link ? (
                <button className="v-g__knop2" onClick={() => void navigator.clipboard.writeText(melding.link!)} type="button">
                  Link kopiëren
                </button>
              ) : null}
            </div>
          </form>
        </section>
      )}

      <section className="v-g__kaart">
        <h2>Verzoeken</h2>
        <p>
          Open: <strong>{euro(open)}</strong> · Betaald: <strong>{euro(betaald)}</strong>
        </p>
        {d.verzoeken.length === 0 ? <p className="v-g__leeg">Nog geen betaalverzoeken.</p> : null}
        <ul className="v-g__lijst">
          {d.verzoeken.map((v) => (
            <li key={v.id}>
              <span>
                <strong>{euro(v.bedrag)}</strong> · {v.naam} <span className={`v-g__badge is-${v.status}`}>{v.status === "betaald" ? "Betaald" : v.status === "open" ? "Open" : "Geannuleerd"}</span>
                <br />
                <small>
                  {v.omschrijving} · {v.contact}
                </small>
              </span>
              <span className="v-g__knoppen" style={{ justifyContent: "flex-end" }}>
                <small>{datumAms(sqlDate(v.betaald ?? v.gemaakt))}</small>
                {v.status === "open" ? (
                  <>
                    <button className="v-g__knop2" onClick={() => void navigator.clipboard.writeText(`${location.origin}/api/betaal/${v.token}`)} type="button">
                      Link
                    </button>
                    <button className="v-g__knop2" onClick={() => void markeerBetaald({ data: { id: v.id } }).then(laad)} type="button">
                      Betaald
                    </button>
                    <button className="v-g__knop2" onClick={() => void annuleerBetaalverzoek({ data: { id: v.id } }).then(laad)} type="button">
                      Annuleren
                    </button>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

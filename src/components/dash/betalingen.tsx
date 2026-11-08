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
    if (!naam.trim() || !contact.trim() || !(bedrag >= 100) || omschrijving.length < 2) return setMelding({ ok: false, tekst: "Fill in name, email or mobile number, amount (at least € 1) and what it's for." });
    setBezig(true);
    const r = await maakBetaalverzoek({ data: { naam: naam.trim(), contact: contact.trim(), bedrag, omschrijving, gesprek_id: gesprek || undefined } }).catch(() => null);
    setBezig(false);
    if (!r) return setMelding({ ok: false, tekst: "That didn't work. Try again." });
    if (!r.ok) return setMelding({ ok: false, tekst: r.message });
    setMelding({ ok: true, tekst: r.verstuurd ? `Sent to ${contact}.` : r.message, link: r.link });
    form.reset();
    setNaam("");
    setContact("");
    setGesprek("");
    laad();
  }

  if (!d) return <p className="v-g__leeg">Loading…</p>;
  const open = d.verzoeken.filter((v) => v.status === "open").reduce((n, v) => n + v.bedrag, 0);
  const betaald = d.verzoeken.filter((v) => v.status === "betaald").reduce((n, v) => n + v.bedrag, 0);

  return (
    <div className="v-g">
      <header className="v-g__kop">
        <h1>Payments</h1>
        <p>Job done? Send a payment request in 10 seconds. Your customer gets a link by email or text and pays {d.online ? "with iDEAL or card" : "by bank transfer"}, straight to your account.</p>
      </header>

      {!d.klaar ? (
        <section className="v-g__kaart">
          <h2>Not switched on yet</h2>
          <p>Volgo needs your bank account (IBAN) or your Stripe account to send payment requests. Send your Volgo contact a message and it's set up the same day.</p>
        </section>
      ) : (
        <section className="v-g__kaart">
          <h2>New payment request</h2>
          <form className="v-g__form" onSubmit={(e) => void stuur(e)}>
            {d.contacten.length ? (
              <label className="v-g__veld is-breed">
                From a conversation
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
                  <option value="">Choose a customer (or fill in below)</option>
                  {d.contacten.map((c) => (
                    <option key={c.gesprek_id} value={c.gesprek_id}>
                      {c.naam} · {c.contact}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="v-g__veld">
              Name
              <input onChange={(e) => setNaam(e.target.value)} required value={naam} />
            </label>
            <label className="v-g__veld">
              Email or mobile number
              <input onChange={(e) => setContact(e.target.value)} required value={contact} />
            </label>
            <label className="v-g__veld">
              Amount (€)
              <input inputMode="decimal" name="bedrag" placeholder="250,00" required />
            </label>
            <label className="v-g__veld">
              For
              <input maxLength={160} name="omschrijving" placeholder="Garden maintenance March" required />
            </label>
            <div className="v-g__knoppen is-breed">
              <button className="v-g__knop" disabled={bezig} type="submit">
                {bezig ? "Sending…" : "Send payment request"}
              </button>
              {melding ? <span className={melding.ok ? "v-g__ok" : "v-g__fout"}>{melding.tekst}</span> : null}
              {melding?.link ? (
                <button className="v-g__knop2" onClick={() => void navigator.clipboard.writeText(melding.link!)} type="button">
                  Copy link
                </button>
              ) : null}
            </div>
          </form>
        </section>
      )}

      <section className="v-g__kaart">
        <h2>Requests</h2>
        <p>
          Open: <strong>{euro(open)}</strong> · Paid: <strong>{euro(betaald)}</strong>
        </p>
        {d.verzoeken.length === 0 ? <p className="v-g__leeg">No payment requests yet.</p> : null}
        <ul className="v-g__lijst">
          {d.verzoeken.map((v) => (
            <li key={v.id}>
              <span>
                <strong>{euro(v.bedrag)}</strong> · {v.naam} <span className={`v-g__badge is-${v.status}`}>{v.status === "betaald" ? "Paid" : v.status === "open" ? "Open" : "Cancelled"}</span>
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
                      Mark paid
                    </button>
                    <button className="v-g__knop2" onClick={() => void annuleerBetaalverzoek({ data: { id: v.id } }).then(laad)} type="button">
                      Cancel
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

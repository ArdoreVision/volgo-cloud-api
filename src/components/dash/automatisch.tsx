import { useEffect, useState } from "react";

import { bewaarBerichtTaal, haalAutomatisch, haalVoorbeeldBerichten, zetAutomatisch } from "@/lib/api/groei.functions";

import { datumAms, sqlDate } from "./util";

type Data = Awaited<ReturnType<typeof haalAutomatisch>>;
type Voorbeelden = Awaited<ReturnType<typeof haalVoorbeeldBerichten>>;
type Vb = Voorbeelden[keyof Voorbeelden];

/** One message as the customer sees it in their email. */
function Mail({ b }: { b: Vb }) {
  return (
    <div className="v-au__mail">
      <p className="v-au__onderwerp">
        <span>Subject</span> {b.onderwerp}
      </p>
      <p className="v-au__kopje">{b.kop}</p>
      {b.tekst.split("\n\n").map((x, i) => (
        <p key={i}>{x}</p>
      ))}
      {"knop" in b && b.knop ? <span className="v-au__knop">{b.knop.tekst}</span> : null}
    </div>
  );
}

const SOORT: Record<string, string> = { bevestiging: "Confirmation", herinnering: "Reminder", review: "Review request", opvolging: "Follow-up", seizoen: "Seasonal message" };

/** What Volgo does by itself after a chat or appointment. The customer sees it; Volgo (the owner) switches it. */
export function Automatisch({ openTab }: { openTab: (t: string) => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [taalMelding, setTaalMelding] = useState("");
  const [vb, setVb] = useState<Voorbeelden | null>(null);
  const [lees, setLees] = useState<string | null>(null);
  const [fout, setFout] = useState("");
  const laadVb = () => void haalVoorbeeldBerichten().then(setVb).catch(() => undefined);
  useEffect(() => {
    void haalAutomatisch().then(setD).catch(() => undefined);
    laadVb();
  }, []);
  if (!d) return <p className="v-g__leeg">Loading…</p>;

  const kanaal = d.sms ? "email or text" : "mail";
  async function schakel(id: keyof Data["aan"], aan: boolean) {
    setFout("");
    setD({ ...d!, aan: { ...d!.aan, [id]: aan } });
    const r = await zetAutomatisch({ data: { soort: id, aan } }).catch(() => ({ ok: false as const, message: "Saving did not work. Please try again." }));
    if (!r.ok) {
      setFout(r.message);
      setD({ ...d!, aan: { ...d!.aan, [id]: !aan } });
    }
  }
  const kaarten: { id: keyof Data["aan"]; titel: string; tekst: string; let?: string; voorbeeld?: (keyof Voorbeelden)[] }[] = [
    { id: "herinnering", titel: "Reminder the day before", tekst: `Everyone with an appointment gets a reminder by ${kanaal} about 24 hours before. Fewer people forget to show up.`, voorbeeld: ["herinnering"] },
    {
      id: "review",
      titel: "Review request after the appointment",
      tekst: "An hour after the appointment Volgo asks for a Google review, once per customer.",
      let: d.reviewUrl ? undefined : "Add your Google review link under Connections",
      voorbeeld: ["review"],
    },
    { id: "opvolging", titel: "Follow-up for whoever did not book", tekst: "Left their details but no appointment? Volgo follows up after 1 and after 3 days, written around what they asked. It stops as soon as they answer or book.", voorbeeld: ["opvolging", "opvolging3"] },
    { id: "seizoen", titel: "Seasonal message to earlier customers", tekst: "Four times a year a short, useful message to earlier customers (for a gardener: \"time to trim the hedge?\") with a button to plan a moment." },
  ];

  return (
    <div className="v-g">
      <header className="v-g__kop">
        <h1>Follow-up</h1>
        <p>What Volgo does by itself, so no customer slips through. Whoever books always gets a confirmation right away with day, time and a button to add the appointment to their own calendar. Follow-up and seasonal messages always have an unsubscribe link.</p>
      </header>

      <div className="v-g__raster">
        {kaarten.map((k) => {
          const aan = d.aan[k.id];
          return (
            <div className="v-g__auto" key={k.id}>
              <div className="v-au__rij">
                <span className={`v-g__status${aan && !k.let ? " is-aan" : aan && k.let ? " is-let" : ""}`}>{aan ? (k.let ? "Waiting" : "On") : "Off"}</span>
                <label className="v-au__schakel">
                  <span className="v-sr">{k.titel}</span>
                  <input checked={aan} disabled={!d.eigenaar} onChange={(e) => void schakel(k.id, e.target.checked)} type="checkbox" />
                  <i aria-hidden="true" />
                </label>
              </div>
              <strong>{k.titel}</strong>
              <p>{k.tekst}</p>
              {aan && k.let ? (
                <button className="v-g__knop2" onClick={() => openTab("kanalen")} type="button">
                  {k.let}
                </button>
              ) : null}
              {k.voorbeeld && vb ? (
                <button className="v-au__lees" onClick={() => setLees(lees === k.id ? null : k.id)} type="button">
                  {lees === k.id ? "Hide the message" : "Read the message"}
                </button>
              ) : null}
              <span className="v-g__getal">
                <b>{d.maand[k.id] ?? 0}</b> sent in the last 30 days
              </span>
            </div>
          );
        })}
      </div>
      {fout ? <p className="v-g__fout">{fout}</p> : null}
      {lees && lees !== "bevestiging" && vb ? (
        <section className="v-g__kaart">
          <div className="v-mw__kop">
            <h2 style={{ margin: 0 }}>What your customer receives</h2>
            <button className="v-g__knop2" onClick={() => setLees(null)} type="button">
              Close
            </button>
          </div>
          <p>With a sample customer. The follow-ups are written by Volgo from the conversation itself; this is the standard version.</p>
          <div className="v-au__mails">
            {(lees === "bevestiging" ? [] : (kaarten.find((k) => k.id === lees)?.voorbeeld ?? [])).map((id) => (
              <div key={id}>
                <p className="v-au__wanneer">{id === "opvolging" ? "After 1 day" : id === "opvolging3" ? "After 3 days" : id === "herinnering" ? "The day before" : id === "review" ? "1 hour after the appointment" : "Right after booking"}</p>
                <Mail b={vb[id]} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="v-g__kaart">
        <div className="v-mw__kop">
          <div>
            <h2 style={{ margin: 0 }}>Confirmation right after booking</h2>
            <span className="v-g__status is-aan">Always on</span>
          </div>
          {vb ? (
            <button className="v-g__knop2" onClick={() => setLees(lees === "bevestiging" ? null : "bevestiging")} type="button">
              {lees === "bevestiging" ? "Hide the message" : "Read the message"}
            </button>
          ) : null}
        </div>
        <p>Whoever books gets a confirmation with day, time and a button to add it to their calendar.</p>
        {lees === "bevestiging" && vb ? <Mail b={vb.bevestiging} /> : null}
      </section>
      {d.eigenaar ? null : <p className="v-g__leeg">Only the account owner can switch these on or off.</p>}

      <section className="v-g__kaart">
        <h2>Language of your messages</h2>
        <p>The language Volgo writes to your customers in: confirmation, reminder, follow-up and review request.</p>
        <div className="v-g__form">
          <label className="v-g__veld">
            Language
            <select
              disabled={!d.eigenaar}
              onChange={(e) => {
                const taal = e.target.value === "nl" ? "nl" : "en";
                setTaalMelding("");
                void bewaarBerichtTaal({ data: { taal } })
                  .then((r) => {
                    if (r.ok) {
                      setD({ ...d, taal });
                      laadVb();
                    }
                    setTaalMelding(r.ok ? "Saved." : r.message);
                  })
                  .catch(() => setTaalMelding("Saving did not work. Please try again."));
              }}
              value={d.taal}
            >
              <option value="en">English</option>
              <option value="nl">Dutch</option>
            </select>
          </label>
          {taalMelding ? <span className={taalMelding === "Saved." ? "v-g__ok" : "v-g__fout"}>{taalMelding}</span> : null}
        </div>
      </section>

      <section className="v-g__kaart">
        <h2>Sent by Volgo</h2>
        <p>The latest automatic messages. You also find them in the conversation in your inbox.</p>
        {d.log.length === 0 ? <p className="v-g__leeg">Nothing sent yet. As soon as someone books or leaves their details, you see it here.</p> : null}
        <ul className="v-g__lijst">
          {d.log.map((l) => (
            <li key={l.id}>
              <span>
                <strong>{SOORT[l.soort] ?? l.soort}</strong> to {l.aan}
                <br />
                <small>{l.onderwerp}</small>
              </span>
              <small>
                {datumAms(sqlDate(l.gemaakt))}
                <br />
                {l.status === "verstuurd" ? (l.kanaal === "sms" ? "Sms ✓" : "Mail ✓") : "Not delivered"}
              </small>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

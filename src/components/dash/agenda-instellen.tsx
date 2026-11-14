import { useEffect, useState } from "react";

import { haalAva } from "@/lib/api/ava.functions";
import { bewaarAgendaKoppeling, haalAgendaKoppeling } from "@/lib/api/groei.functions";

import { AgendaInstellingen } from "./agenda-instellingen";

type Koppeling = Awaited<ReturnType<typeof haalAgendaKoppeling>>;

const UITLEG: { id: string; naam: string; stappen: string[] }[] = [
  {
    id: "google",
    naam: "Google Calendar",
    stappen: [
      "Open Google Calendar on a computer and click ⚙ → Settings.",
      "On the left, under Settings for my calendars, click your calendar.",
      "Scroll to Integrate calendar and copy the Secret address in iCal format.",
    ],
  },
  {
    id: "outlook",
    naam: "Outlook",
    stappen: ["Open Outlook on the web → ⚙ Settings → Calendar → Shared calendars.", "Under Publish a calendar, choose your calendar and Can view all details, then Publish.", "Copy the ICS link."],
  },
  {
    id: "apple",
    naam: "Apple / iCloud",
    stappen: ["Open icloud.com/calendar, click the share icon next to your calendar.", "Switch on Public Calendar and copy the link (it starts with webcal://)."],
  },
];

/** Your own calendar: read busy times from it, and add Volgo's appointments to it. */
function EigenAgenda() {
  const [k, setK] = useState<Koppeling | null>(null);
  const [url, setUrl] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [hoe, setHoe] = useState("google");
  const [gekopieerd, setGekopieerd] = useState(false);
  const laad = () => void haalAgendaKoppeling().then(setK).catch(() => undefined);
  useEffect(laad, []);
  if (!k) return null;

  async function koppel(leeg = false) {
    setBezig(true);
    setMelding(null);
    const r = await bewaarAgendaKoppeling({ data: { url: leeg ? "" : url } }).catch(() => ({ ok: false as const, message: "Saving did not work. Please try again.", aantal: 0 }));
    setBezig(false);
    if (!r.ok) return setMelding({ ok: false, tekst: r.message });
    setUrl("");
    setMelding({ ok: true, tekst: leeg ? "Unlinked." : `Linked. Volgo found ${r.aantal} busy ${r.aantal === 1 ? "moment" : "moments"} in the next 3 weeks and will not offer those times.` });
    laad();
  }
  const s = UITLEG.find((x) => x.id === hoe)!;

  return (
    <section className="v-g__kaart" id="agenda-instellen-eigen">
      <div className="v-mw__kop">
        <h2 style={{ margin: 0 }}>Your own calendar</h2>
        <span className={`v-g__status${k.gekoppeld ? " is-aan" : " is-let"}`}>{k.gekoppeld ? `Linked · ${k.bron}` : "Not linked"}</span>
      </div>
      <p>
        Do you keep appointments in Google, Outlook or Apple Calendar? Link it, and Volgo never offers a time that is already taken there. Volgo checks it every few minutes and only reads busy times.
      </p>
      {k.eigenaar ? (
        <>
          <div className="v-g__tabs" style={{ marginTop: 6 }}>
            {UITLEG.map((x) => (
              <button aria-pressed={hoe === x.id} key={x.id} onClick={() => setHoe(x.id)} type="button">
                {x.naam}
              </button>
            ))}
          </div>
          <ol className="v-g__stappen">
            {s.stappen.map((x) => (
              <li key={x}>{x}</li>
            ))}
            <li>Paste it below and press Link.</li>
          </ol>
          <div className="v-inst__rij" style={{ marginTop: 10 }}>
            <label className="v-g__veld" style={{ flex: "1 1 260px" }}>
              <span className="v-sr">Calendar address</span>
              <input onChange={(e) => setUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" value={url} />
            </label>
            <button className="v-g__knop" disabled={bezig || !url.trim()} onClick={() => void koppel()} type="button">
              {bezig ? "Checking…" : k.gekoppeld ? "Replace" : "Link"}
            </button>
            {k.gekoppeld ? (
              <button className="v-g__knop2" disabled={bezig} onClick={() => void koppel(true)} type="button">
                Unlink
              </button>
            ) : null}
          </div>
          {melding ? <p className={melding.ok ? "v-g__ok" : "v-g__fout"}>{melding.tekst}</p> : null}
        </>
      ) : (
        <p className="v-g__leeg">Only the account owner can link a calendar.</p>
      )}

      <div className="v-il__feed">
        <strong>Volgo's appointments in your own calendar</strong>
        <small>Add this private address to Google (Other calendars → + → From URL), Outlook (Add calendar → Subscribe from web) or Apple (File → New calendar subscription). New bookings appear there automatically. Keep it private.</small>
        <div className="v-inst__rij" style={{ marginTop: 8 }}>
          <code className="v-g__code" style={{ flex: "1 1 260px", margin: 0, overflowX: "auto", whiteSpace: "nowrap" }}>
            {k.feed}
          </code>
          <button className="v-g__knop2" onClick={() => void navigator.clipboard.writeText(k.feed).then(() => setGekopieerd(true))} type="button">
            {gekopieerd ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>
    </section>
  );
}

/** Calendar settings: opening hours and kinds of appointment, and the link with the business's own calendar. */
export function AgendaInstellen() {
  const [inst, setInst] = useState<Awaited<ReturnType<typeof haalAva>>["inst"] | null>(null);
  useEffect(() => {
    void haalAva()
      .then((a) => setInst(a.inst))
      .catch(() => undefined);
  }, []);
  return (
    <div className="v-g" id="agenda-instellen" style={{ marginTop: 22 }}>
      <header className="v-g__kop">
        <h2 style={{ margin: 0, fontSize: 22 }}>Calendar settings</h2>
        <p>When visitors can book, and which times are already taken in your own calendar.</p>
      </header>
      {inst ? <AgendaInstellingen inst={inst} /> : <p className="v-g__leeg">Loading…</p>}
      <EigenAgenda />
    </div>
  );
}

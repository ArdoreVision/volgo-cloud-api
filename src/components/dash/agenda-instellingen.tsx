import { useState } from "react";

import { isOngebruikelijkRuim, openUrenPerWeek } from "@/lib/agenda";
import { bewaarAgenda } from "@/lib/api/ava.functions";

import { useOnopgeslagen } from "./onopgeslagen";

type Inst = { boeken: number; open_dagen: string; open_van: string; open_tot: string; afspraak_duur: number; afspraak_soorten: string; tijdzone: string; instagram: string };

const DAGEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VOLGORDE = [1, 2, 3, 4, 5, 6, 0];
const SOORTEN: [string, string, string][] = [
  ["bellen", "Phone call", "You call them at the chosen time"],
  ["langs", "Visit at their address", "You go to them, e.g. to measure. Asks for their address"],
  ["kantoor", "At your office", "They come to you"],
  ["insta", "DM on Instagram", "Opens a DM with your Instagram account, no time slot"],
];
const ZONES = ["Europe/Amsterdam", "Europe/Brussels", "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "Australia/Sydney"];

/** Settings for the calendar visitors use inside the AVA chat. */
export function AgendaInstellingen({ inst }: { inst: Inst }) {
  const [aan, setAan] = useState(Boolean(inst.boeken));
  const [dagen, setDagen] = useState(inst.open_dagen.split(",").map(Number));
  const [van, setVan] = useState(inst.open_van);
  const [tot, setTot] = useState(inst.open_tot);
  const [duur, setDuur] = useState(inst.afspraak_duur);
  const [soorten, setSoorten] = useState(inst.afspraak_soorten.split(","));
  const [zone, setZone] = useState(inst.tijdzone);
  const [insta, setInsta] = useState(inst.instagram ?? "");
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [bezig, setBezig] = useState(false);
  const zones = ZONES.includes(zone) ? ZONES : [zone, ...ZONES];
  const huidig = { boeken: aan, open_dagen: dagen, open_van: van, open_tot: tot, afspraak_duur: duur, afspraak_soorten: soorten as ("bellen" | "langs" | "kantoor" | "insta")[], tijdzone: zone, instagram: insta };
  const [opgeslagenStand, setOpgeslagenStand] = useState(() => JSON.stringify(huidig));
  const gewijzigd = JSON.stringify(huidig) !== opgeslagenStand;
  useOnopgeslagen(gewijzigd);
  const ruim = aan && dagen.length > 0 && van < tot && isOngebruikelijkRuim({ open_dagen: dagen, open_van: van, open_tot: tot });

  async function opslaan() {
    if (bezig) return;
    if (!dagen.length) return setMelding({ ok: false, tekst: "Choose at least one day." });
    if (!soorten.length) return setMelding({ ok: false, tekst: "Choose at least one kind of appointment." });
    if (van >= tot) return setMelding({ ok: false, tekst: "Opening time must be before closing time." });
    setBezig(true);
    try {
      const r = await bewaarAgenda({ data: huidig });
      setMelding({ ok: r.ok, tekst: r.ok ? "Saved. Visitors now see these days and times in the chat." : r.message });
      if (r.ok) setOpgeslagenStand(JSON.stringify(huidig));
    } catch {
      setMelding({ ok: false, tekst: "Couldn't save. Check the times and try again." });
    } finally {
      setBezig(false);
    }
  }
  const wissel = <T,>(lijst: T[], x: T) => (lijst.includes(x) ? lijst.filter((y) => y !== x) : [...lijst, x]);

  return (
    <section className="v-dash__panel v-agset">
      <h2 className="v-sub">Appointments in the chat</h2>
      <p className="v-muted v-small">
        Visitors pick a free day and time in a small calendar inside the chat, in 3 easy steps. Only moments that are still free in your Calendar are shown, and
        every booking lands in your Calendar and Requests right away.
      </p>
      <label className="v-toggle">
        <span>
          <strong>Let visitors book appointments</strong>
          <small>Shows a "Book an appointment" button in the chat, and AVA opens the calendar when someone wants to meet.</small>
        </span>
        <input checked={aan} onChange={(e) => setAan(e.target.checked)} type="checkbox" />
        <i aria-hidden="true" />
      </label>
      <fieldset className="v-agset__groep" disabled={!aan}>
        <span className="v-fld__label">Kinds of appointment</span>
        <div className="v-agset__soorten">
          {SOORTEN.map(([id, t, u]) => (
            <label className={soorten.includes(id) ? "is-aan" : ""} key={id}>
              <input checked={soorten.includes(id)} onChange={() => setSoorten(wissel(soorten, id))} type="checkbox" />
              <span>
                <b>{t}</b>
                <small>{u}</small>
              </span>
            </label>
          ))}
        </div>
        {soorten.includes("insta") ? (
          <label className="v-fld v-agset__insta">
            <span className="v-fld__label">Your Instagram username</span>
            <input onChange={(e) => setInsta(e.target.value)} placeholder="@yourbusiness" value={insta} />
          </label>
        ) : null}
        <span className="v-fld__label">Days you take appointments</span>
        <div className="v-agset__dagen">
          {VOLGORDE.map((d) => (
            <button aria-pressed={dagen.includes(d)} key={d} onClick={() => setDagen(wissel(dagen, d))} type="button">
              {DAGEN[d]}
            </button>
          ))}
        </div>
        <div className="v-agset__rij">
          <label className="v-fld">
            <span className="v-fld__label">From</span>
            <input onChange={(e) => setVan(e.target.value)} type="time" value={van} />
          </label>
          <label className="v-fld">
            <span className="v-fld__label">Until</span>
            <input onChange={(e) => setTot(e.target.value)} type="time" value={tot} />
          </label>
          <label className="v-fld">
            <span className="v-fld__label">Length</span>
            <select className="v-select" onChange={(e) => setDuur(Number(e.target.value))} value={duur}>
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </label>
          <label className="v-fld">
            <span className="v-fld__label">Time zone</span>
            <select className="v-select" onChange={(e) => setZone(e.target.value)} value={zone}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
        {ruim ? (
          <p className="v-waarschuw" role="status">
            <strong>Unusually wide availability:</strong> visitors can book {dagen.length} days a week, {van}–{tot} ({openUrenPerWeek({ open_dagen: dagen, open_van: van, open_tot: tot })} hours a week). That is fine if you really take calls at those times; otherwise narrow it down so nobody books you at midnight. Nothing changes until you save.
          </p>
        ) : null}
      </fieldset>
      <div className="v-form-actie">
        <button className="v-btn-dark" disabled={bezig || !gewijzigd} onClick={() => void opslaan()} type="button">
          {bezig ? "Saving…" : gewijzigd ? "Save appointment settings" : "Saved"}
        </button>
        {melding ? (
          <span className={melding.ok ? "v-ok-tekst" : "v-err"} role={melding.ok ? "status" : "alert"}>
            {melding.tekst}
          </span>
        ) : null}
      </div>
    </section>
  );
}

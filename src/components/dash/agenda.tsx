import { useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { maakAfspraak, verwijderAfspraak } from "@/lib/api/team.functions";

import { type Afspraak, type DashData, dagKey, plusDag } from "./util";

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const DAGEN_KORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const DAGEN_LANG = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];

const weekdag = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 = maandag
};
const dagTitel = (key: string) => `${DAGEN_LANG[weekdag(key)]}, ${MAANDEN[Number(key.slice(5, 7)) - 1]} ${Number(key.slice(8))}`;
const kleur = (titel: string) => (/installati/i.test(titel) ? "groen" : /opname|locatie|site visit|survey/i.test(titel) ? "paars" : /onderhoud|maintenance|service/i.test(titel) ? "oranje" : "blauw");

function Item({ a, onDelete }: { a: Afspraak; onDelete: (id: number) => void }) {
  return (
    <li className={`v-ev v-ev--${kleur(a.titel)}`}>
      <div className="v-ev__time">
        <strong>{a.start.slice(11)}</strong>
        <span>{a.eind.slice(11)}</span>
      </div>
      <div className="v-ev__body">
        <strong>{a.titel}</strong>
        {a.locatie ? <span>{a.locatie}</span> : null}
        {a.notitie ? <small>{a.notitie}</small> : null}
      </div>
      <button aria-label={`${a.titel} verwijderen`} className="v-ev__del" onClick={() => onDelete(a.id)} type="button">
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </li>
  );
}

export function Agenda({ data }: { data: DashData }) {
  const router = useRouter();
  const vandaag = dagKey(new Date());
  const [weergave, setWeergave] = useState<"lijst" | "maand">("lijst");
  const [maand, setMaand] = useState(vandaag.slice(0, 7)); // YYYY-MM
  const [gekozen, setGekozen] = useState(vandaag);
  const [nieuw, setNieuw] = useState(false);
  const [fout, setFout] = useState("");

  const perDag = useMemo(() => {
    const m = new Map<string, Afspraak[]>();
    for (const a of data.afspraken) {
      const k = a.start.slice(0, 10);
      m.set(k, [...(m.get(k) ?? []), a].sort((x, y) => x.start.localeCompare(y.start)));
    }
    return m;
  }, [data.afspraken]);

  const eerste = `${maand}-01`;
  const [jaar, mnd] = maand.split("-").map(Number);
  const dagenInMaand = new Date(Date.UTC(jaar, mnd, 0)).getUTCDate();
  const verschuif = (n: number) => {
    const t = new Date(Date.UTC(jaar, mnd - 1 + n, 1));
    setMaand(t.toISOString().slice(0, 7));
  };

  const lijstDagen = Array.from({ length: dagenInMaand }, (_, i) => plusDag(eerste, i)).filter(
    (k) => perDag.has(k) || k === vandaag,
  );
  const startCel = weekdag(eerste);
  const cellen = Array.from({ length: Math.ceil((startCel + dagenInMaand) / 7) * 7 }, (_, i) => plusDag(eerste, i - startCel));

  async function verwijder(id: number) {
    await verwijderAfspraak({ data: { id } });
    await router.invalidate();
  }

  async function opslaan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const datum = v("datum");
    const leadId = Number(v("lead")) || undefined;
    const lead = data.leads.find((l) => l.id === leadId);
    const titel = v("titel") || (lead ? `Gesprek · ${lead.naam}` : "");
    if (titel.length < 2 || !datum || !v("start") || !v("eind")) return setFout("Vul een titel, datum en tijden in.");
    if (v("eind") <= v("start")) return setFout("De eindtijd moet na de begintijd liggen.");
    setFout("");
    const res = await maakAfspraak({
      data: { titel, start: `${datum}T${v("start")}`, eind: `${datum}T${v("eind")}`, locatie: v("locatie") || undefined, notitie: v("notitie") || undefined, lead_id: leadId },
    });
    if (!res.ok) return setFout(res.reden || "Opslaan lukte niet. Probeer het opnieuw.");
    setNieuw(false);
    setGekozen(datum);
    setMaand(datum.slice(0, 7));
    await router.invalidate();
  }

  const openLeads = data.leads.filter((l) => l.status !== "klant" && l.status !== "verloren").sort((a, b) => b.warmte - a.warmte).slice(0, 30);

  return (
    <>
      <header className="v-dash__head v-dash__head--row">
        <div>
          <h1>
            {MAANDEN[mnd - 1]} <span className="v-muted-h">{jaar}</span>
          </h1>
        </div>
        <div className="v-cal-bar">
          <div className="v-seg" role="tablist" aria-label="Weergave">
            <button aria-selected={weergave === "lijst"} onClick={() => setWeergave("lijst")} role="tab" type="button">
              Lijst
            </button>
            <button aria-selected={weergave === "maand"} onClick={() => setWeergave("maand")} role="tab" type="button">
              Maand
            </button>
          </div>
          <div className="v-cal-nav">
            <button aria-label="Vorige maand" onClick={() => verschuif(-1)} type="button">
              ‹
            </button>
            <button
              onClick={() => {
                setMaand(vandaag.slice(0, 7));
                setGekozen(vandaag);
              }}
              type="button"
            >
              Vandaag
            </button>
            <button aria-label="Volgende maand" onClick={() => verschuif(1)} type="button">
              ›
            </button>
          </div>
          <button className="v-addbtn" onClick={() => setNieuw(true)} type="button">
            + Afspraak
          </button>
        </div>
      </header>

      {weergave === "lijst" ? (
        <section className="v-cal-list">
          {lijstDagen.map((k) => (
            <div className="v-cal-day" key={k}>
              <h2 className={k === vandaag ? "is-vandaag" : ""}>
                {k === vandaag ? <span>Vandaag</span> : null}
                {dagTitel(k)}
              </h2>
              {perDag.get(k)?.length ? (
                <ul className="v-evs">
                  {perDag.get(k)!.map((a) => (
                    <Item a={a} key={a.id} onDelete={(id) => void verwijder(id)} />
                  ))}
                </ul>
              ) : (
                <p className="v-cal-empty">Geen afspraken</p>
              )}
            </div>
          ))}
          {lijstDagen.length === 0 ? <p className="v-cal-empty">Geen afspraken deze maand.</p> : null}
        </section>
      ) : (
        <>
          <section className="v-month" aria-label="Maandoverzicht">
            {DAGEN_KORT.map((d) => (
              <div className="v-month__wd" key={d}>
                {d}
              </div>
            ))}
            {cellen.map((k) => {
              const items = perDag.get(k) ?? [];
              const binnen = k.slice(0, 7) === maand;
              return (
                <button
                  aria-label={`${dagTitel(k)}, ${items.length} ${items.length === 1 ? "appointment" : "appointments"}`}
                  aria-pressed={gekozen === k}
                  className={`v-month__cell${binnen ? "" : " is-buiten"}${k === vandaag ? " is-vandaag" : ""}${gekozen === k ? " is-gekozen" : ""}`}
                  key={k}
                  onClick={() => setGekozen(k)}
                  type="button"
                >
                  <span className="v-month__num">{Number(k.slice(8))}</span>
                  {items.slice(0, 3).map((a) => (
                    <span className={`v-month__ev v-month__ev--${kleur(a.titel)}`} key={a.id}>
                      {a.start.slice(11)} {a.titel.split(" · ")[0]}
                    </span>
                  ))}
                  {items.length > 3 ? <span className="v-month__more">+{items.length - 3} more</span> : null}
                  {items.length ? <i aria-hidden="true" className="v-month__dot" /> : null}
                </button>
              );
            })}
          </section>
          <section className="v-cal-day v-cal-day--sel">
            <h2 className={gekozen === vandaag ? "is-vandaag" : ""}>
              {gekozen === vandaag ? <span>Vandaag</span> : null}
              {dagTitel(gekozen)}
            </h2>
            {perDag.get(gekozen)?.length ? (
              <ul className="v-evs">
                {perDag.get(gekozen)!.map((a) => (
                  <Item a={a} key={a.id} onDelete={(id) => void verwijder(id)} />
                ))}
              </ul>
            ) : (
              <p className="v-cal-empty">Geen afspraken</p>
            )}
          </section>
        </>
      )}

      {nieuw ? (
        <div className="v-modal" onClick={(e) => e.target === e.currentTarget && setNieuw(false)} role="presentation">
          <form aria-label="Nieuwe afspraak" className="v-modal__card" onSubmit={(e) => void opslaan(e)} role="dialog">
            <h2>Nieuwe afspraak</h2>
            <div className="v-fld">
              <label htmlFor="a-lead">Klant (optioneel)</label>
              <select defaultValue="" id="a-lead" name="lead">
                <option value="">Geen klant gekoppeld</option>
                {openLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.naam} · {l.onderwerp}
                  </option>
                ))}
              </select>
            </div>
            <div className="v-fld">
              <label htmlFor="a-titel">Titel</label>
              <input id="a-titel" maxLength={120} name="titel" placeholder="Bijv. Kennismaking" />
            </div>
            <div className="v-row v-row--3">
              <div className="v-fld">
                <label htmlFor="a-datum">Datum</label>
                <input defaultValue={gekozen} id="a-datum" name="datum" type="date" />
              </div>
              <div className="v-fld">
                <label htmlFor="a-start">Van</label>
                <input defaultValue="10:00" id="a-start" name="start" type="time" />
              </div>
              <div className="v-fld">
                <label htmlFor="a-eind">Tot</label>
                <input defaultValue="11:00" id="a-eind" name="eind" type="time" />
              </div>
            </div>
            <div className="v-fld">
              <label htmlFor="a-loc">Locatie</label>
              <input id="a-loc" maxLength={120} name="locatie" placeholder="Bij de klant thuis" />
            </div>
            <div className="v-fld">
              <label htmlFor="a-not">Notitie</label>
              <textarea id="a-not" maxLength={1000} name="notitie" rows={2} />
            </div>
            {fout ? <p className="v-err">{fout}</p> : null}
            <div className="v-modal__actions">
              <button className="v-btn-ghost" onClick={() => setNieuw(false)} type="button">
                Annuleren
              </button>
              <button className="v-btn-dark" type="submit">
                Opslaan
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

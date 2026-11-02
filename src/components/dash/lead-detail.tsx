import { useEffect, useState } from "react";

import { bewaarLeadNotitie, haalLead } from "@/lib/api/account.functions";

import { Laadfout } from "./status";
import { sqlDate, tijdzone, warmteLabel } from "./util";

type Data = NonNullable<Awaited<ReturnType<typeof haalLead>>>;
type Status = "nieuw" | "opvolging" | "offerte" | "afspraak" | "klant" | "verloren";

const STATUS_LABEL: Record<Status, string> = { nieuw: "New", opvolging: "AVA following up", offerte: "Quote", afspraak: "Appointment", klant: "Customer", verloren: "Lost" };

const wanneer = (iso: string) => sqlDate(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tijdzone() });

/** Splits "Sarah, 06 1234 5678 / sarah@mail.com" into phone and email, whatever AVA captured. */
function contactDelen(c: string | null) {
  const t = c ?? "";
  const email = t.match(/[^\s,;/]+@[^\s,;/]+\.[a-z]{2,}/i)?.[0] ?? null;
  const tel = t.replace(email ?? "", "").match(/\+?[\d][\d\s().-]{6,}\d/)?.[0]?.trim() ?? null;
  return { email, tel: tel ? tel.replace(/[\s().-]/g, "") : null, telToon: tel };
}

export function LeadDetail({ id, sluit, zetStatus, openChats }: { id: number; sluit: () => void; zetStatus: (id: number, s: Status) => Promise<void>; openChats: () => void }) {
  const [d, setD] = useState<Data | null | undefined>(undefined);
  const [notitie, setNotitie] = useState("");
  const [bewaard, setBewaard] = useState(false);
  const [gekopieerd, setGekopieerd] = useState("");

  const [laadFout, setLaadFout] = useState(false);
  const [poging, setPoging] = useState(0);
  useEffect(() => {
    setD(undefined);
    setLaadFout(false);
    void haalLead({ data: { id } })
      .then((r) => {
        setD(r);
        setNotitie(r?.lead.notitie ?? "");
      })
      .catch(() => setLaadFout(true));
  }, [id, poging]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && sluit();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [sluit]);

  async function bewaar() {
    if (!d || notitie === d.lead.notitie) return;
    await bewaarLeadNotitie({ data: { id, notitie } });
    setD({ ...d, lead: { ...d.lead, notitie } });
    setBewaard(true);
    window.setTimeout(() => setBewaard(false), 2000);
  }
  async function kopieer(t: string) {
    try {
      await navigator.clipboard.writeText(t);
      setGekopieerd(t);
      window.setTimeout(() => setGekopieerd(""), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  const l = d?.lead;
  const c = contactDelen(l?.contact ?? null);
  const kleur = l ? warmteLabel(l.warmte).toLowerCase() : "lauw";

  return (
    <div className="v-lp" onClick={sluit} role="presentation">
      <aside aria-label="Lead details" className="v-lp__paneel" onClick={(e) => e.stopPropagation()} role="dialog">
        <button aria-label="Close" className="v-lp__sluit v-rimpel-uit" onClick={sluit} type="button">
          ×
        </button>
        {d === undefined ? <p className="v-feed__empty v-pad">Loading…</p> : null}
        {laadFout ? <Laadfout opnieuw={() => setPoging((p) => p + 1)} wat="this lead" /> : null}
        {d === null && !laadFout ? <p className="v-feed__empty v-pad">This lead no longer exists.</p> : null}
        {l ? (
          <>
            <header className="v-lp__kop">
              <span className={`v-heat v-heat--${kleur} v-lp__heat`} title={l.reden ?? ""}>
                {l.warmte}
              </span>
              <div>
                <h2>{l.naam}</h2>
                <p>
                  {warmteLabel(l.warmte)} · {l.onderwerp}
                </p>
              </div>
            </header>
            {l.reden ? <p className="v-lp__reden">Why this score: {l.reden}</p> : null}

            <div className="v-lp__acties">
              {c.tel ? (
                <a className="v-btn-blauw" href={`tel:${c.tel}`}>
                  Call {c.telToon}
                </a>
              ) : null}
              {c.email ? (
                <a className="v-btn-wit" href={`mailto:${c.email}?subject=${encodeURIComponent("Your request: " + l.onderwerp)}`}>
                  Email
                </a>
              ) : null}
              {l.contact ? (
                <button className="v-btn-wit" onClick={() => void kopieer(l.contact!)} type="button">
                  {gekopieerd ? "Copied" : "Copy contact"}
                </button>
              ) : (
                <p className="v-muted v-small">AVA didn’t get contact details yet.</p>
              )}
            </div>

            <dl className="v-lp__feiten">
              <div>
                <dt>Status</dt>
                <dd>
                  <select aria-label="Status" className={`v-select v-pill--${l.status}`} onChange={(e) => void zetStatus(l.id, e.target.value as Status).then(() => setD({ ...d, lead: { ...l, status: e.target.value } }))} value={l.status}>
                    {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
              <div>
                <dt>Received</dt>
                <dd>
                  {wanneer(l.created_at)} · via {l.kanaal}
                </dd>
              </div>
              {l.contact ? (
                <div>
                  <dt>Contact</dt>
                  <dd>{l.contact}</dd>
                </div>
              ) : null}
              {l.herkomst ? (
                <div>
                  <dt>Location</dt>
                  <dd>📍 {l.herkomst}</dd>
                </div>
              ) : null}
              {d.afspraken.length ? (
                <div>
                  <dt>Appointments</dt>
                  <dd>
                    {d.afspraken.map((a) => (
                      <span className="v-lp__afspraak" key={a.id}>
                        {wanneer(a.start)} · {a.titel}
                        {a.locatie ? ` · ${a.locatie}` : ""}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>

            <section className="v-lp__blok">
              <h3>Your notes</h3>
              <textarea
                aria-label="Notes"
                className="v-lp__notitie"
                onBlur={() => void bewaar()}
                onChange={(e) => setNotitie(e.target.value)}
                placeholder="Called on Tuesday, wants a visit next week…"
                rows={3}
                value={notitie}
              />
              <p className="v-hint">{bewaard ? "Saved." : "Saved automatically when you click away."}</p>
            </section>

            <section className="v-lp__blok">
              <div className="v-lp__blokkop">
                <h3>Conversation with AVA</h3>
                {l.gesprek_id ? (
                  <button className="v-linkbtn" onClick={openChats} type="button">
                    Open in Chats
                  </button>
                ) : null}
              </div>
              {d.berichten.length === 0 ? <p className="v-muted v-small">No conversation stored for this lead.</p> : null}
              <ul className="v-lp__chat">
                {d.berichten.map((b) => (
                  <li className={`v-lp__msg v-lp__msg--${b.rol}`} key={b.id}>
                    <span>{b.rol === "bezoeker" ? l.naam : b.rol === "mens" ? "You" : b.rol === "systeem" ? "System" : "AVA"}</span>
                    <p>{b.tekst}</p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </aside>
    </div>
  );
}

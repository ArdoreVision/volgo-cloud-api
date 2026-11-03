import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { vraagAssistent } from "@/lib/api/assistent.functions";

import { AanDeSlag } from "./aan-de-slag";
import { leadOpen } from "./leads";
import { STATUS_LABEL, type DashData, type Lead, type Status, dagKey, datumLang, geleden, sqlDate, tijdAms, uurAms, warmteLabel } from "./util";

const VOORBEELDEN = [
  "Which leads should I call first today?",
  "What's on my calendar this week?",
  "What have visitors been asking about lately?",
  "Write a short follow-up email for my hottest lead.",
];

function groet(uur: number) {
  if (uur < 6) return "Good night";
  if (uur < 12) return "Good morning";
  if (uur < 18) return "Good afternoon";
  return "Good evening";
}

/** "Contact: 06 1234 5678 / sarah@mail.com" → a phone number and an email, whichever AVA captured. */
function contactVan(l: Lead) {
  const t = l.laatste_actie ?? "";
  const email = t.match(/[^\s,;/]+@[^\s,;/]+\.[a-z]{2,}/i)?.[0] ?? null;
  const tel = t.replace(email ?? "", "").match(/\+?\d[\d\s().-]{6,}\d/)?.[0]?.trim() ?? null;
  return { email, tel: tel ? tel.replace(/[\s().-]/g, "") : null };
}

type Bericht = { rol: "ik" | "ava"; tekst: string };

/**
 * Home: what needs doing today. Leads to call first, the day's appointments, chats waiting for a person,
 * and AVA as an assistant for questions about your own data. Sample data is labelled as such.
 */
export function Home({
  voornaam,
  bedrijf,
  data,
  leads,
  openTab,
  openLead,
}: {
  voornaam: string;
  bedrijf: string;
  data: DashData;
  leads: Lead[];
  openTab: (t: string) => void;
  openLead: (id: number) => void;
}) {
  const [nu, setNu] = useState(() => Date.parse(data.nu));
  useEffect(() => {
    setNu(Date.now());
    const id = window.setInterval(() => setNu(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);
  const vandaag = dagKey(new Date(nu));

  // Call first: leads that still need a call (new, following up, quote), hottest first, real ones before samples.
  // Leads with an appointment are already planned and stay out of this list.
  const teBellen = (l: Lead) => leadOpen(l) && l.status !== "afspraak";
  const bellen = leads.filter(teBellen).sort((a, b) => a.voorbeeld - b.voorbeeld || b.warmte - a.warmte).slice(0, 5);
  // Appointments: today, then the next few.
  const komend = data.afspraken.filter((a) => a.start.slice(0, 10) >= vandaag).sort((a, b) => a.start.localeCompare(b.start));
  const vandaagAf = komend.filter((a) => a.start.startsWith(vandaag));
  const later = komend.filter((a) => !a.start.startsWith(vandaag)).slice(0, 3);
  // Chats that need a person: a visitor is waiting for a reply from someone who took over, or a hot visitor is live right now.
  const live = (g: DashData["gesprekken"][number]) => g.status === "live" && nu - sqlDate(g.laatste).getTime() < 10 * 60000;
  const aandacht = data.gesprekken
    .filter((g) => !g.voorbeeld && ((g.overgenomen_naam && g.laatste_rol === "bezoeker") || (live(g) && g.warmte >= 75)))
    .slice(0, 4);
  const liveNu = data.gesprekken.filter((g) => !g.voorbeeld && live(g)).length;
  const nieuwEcht = leads.filter((l) => l.status === "nieuw" && !l.voorbeeld).length;
  const alleenVoorbeeld = !data.avaLive && leads.some((l) => l.voorbeeld);

  return (
    <section className="v-vandaag">
      <header className="v-dash__head v-vandaag__kop">
        <div>
          <p className="v-home__tijd">
            <span>{tijdAms(new Date(nu))}</span> · {datumLang(new Date(nu))}
          </p>
          <h1>
            {groet(uurAms(new Date(nu)))}, {voornaam}
          </h1>
          <p>
            {data.avaLive
              ? `${liveNu ? `AVA is talking to ${liveNu} ${liveNu === 1 ? "visitor" : "visitors"} right now` : "AVA is ready on your website"} · ${nieuwEcht} new ${nieuwEcht === 1 ? "lead" : "leads"} · ${vandaagAf.length} ${vandaagAf.length === 1 ? "appointment" : "appointments"} today`
              : `AVA is not on your website yet. Finish the steps below and your first real leads land here.`}
          </p>
        </div>
      </header>

      {alleenVoorbeeld ? (
        <p className="v-dash__note">
          Everything marked <strong>Sample</strong> is example data, so you can see how Volgo works. It disappears automatically after AVA’s first real conversation.
        </p>
      ) : null}

      {!data.avaLive ? <AanDeSlag openTab={openTab} /> : null}

      <div className="v-vandaag__grid">
        <section aria-labelledby="bel-kop" className="v-dash__panel v-vandaag__paneel">
          <div className="v-dash__panel-head">
            <h2 id="bel-kop">Call first</h2>
            <button className="v-linkbtn" onClick={() => openTab("aanvragen")} type="button">
              All leads
            </button>
          </div>
          {bellen.length === 0 ? (
            <div className="v-leeg v-leeg--klein">
              <p className="v-leeg__titel">No open leads</p>
              <p>{data.avaLive ? "Every lead is handled. New ones appear here the moment AVA collects their details." : "Your first leads appear here once AVA is live on your website."}</p>
            </div>
          ) : (
            <ol className="v-bel">
              {bellen.map((l) => {
                const c = contactVan(l);
                return (
                  <li key={l.id}>
                    <span className={`v-heat v-heat--${warmteLabel(l.warmte).toLowerCase()}`} title={`Warmth ${l.warmte}: ${l.reden ?? ""}`}>
                      {l.warmte}
                    </span>
                    <button className="v-bel__wie" onClick={() => openLead(l.id)} type="button">
                      <strong>
                        {l.naam}
                        {l.voorbeeld ? <em className="v-voorbeeld-tag">Sample</em> : null}
                      </strong>
                      <small>{l.reden || l.onderwerp}</small>
                      <small className="v-muted">
                        {STATUS_LABEL[l.status as Status] ?? l.status} · {geleden(sqlDate(l.created_at), nu)}
                      </small>
                    </button>
                    {c.tel && !l.voorbeeld ? (
                      <a aria-label={`Call ${l.naam}`} className="v-bel__actie" href={`tel:${c.tel}`}>
                        Call
                      </a>
                    ) : c.email && !l.voorbeeld ? (
                      <a aria-label={`Email ${l.naam}`} className="v-bel__actie" href={`mailto:${c.email}`}>
                        Email
                      </a>
                    ) : (
                      <button className="v-bel__actie v-bel__actie--stil" onClick={() => openLead(l.id)} type="button">
                        Open
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="ag-kop" className="v-dash__panel v-vandaag__paneel">
          <div className="v-dash__panel-head">
            <h2 id="ag-kop">Today’s appointments</h2>
            <button className="v-linkbtn" onClick={() => openTab("agenda")} type="button">
              Calendar
            </button>
          </div>
          {vandaagAf.length === 0 ? (
            <p className="v-muted v-small">Nothing on the calendar today.</p>
          ) : (
            <ul className="v-vandaag__lijst">
              {vandaagAf.map((a) => (
                <li key={a.id}>
                  <time>{a.start.slice(11, 16)}</time>
                  <span>
                    <strong>
                      {a.titel}
                      {a.voorbeeld ? <em className="v-voorbeeld-tag">Sample</em> : null}
                    </strong>
                    {a.locatie ? <small>{a.locatie}</small> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {later.length ? (
            <>
              <p className="v-vandaag__sub">Coming up</p>
              <ul className="v-vandaag__lijst v-vandaag__lijst--later">
                {later.map((a) => (
                  <li key={a.id}>
                    <time>
                      {new Date(`${a.start.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })} {a.start.slice(11, 16)}
                    </time>
                    <span>
                      <strong>
                        {a.titel}
                        {a.voorbeeld ? <em className="v-voorbeeld-tag">Sample</em> : null}
                      </strong>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section aria-labelledby="chat-kop" className="v-dash__panel v-vandaag__paneel">
          <div className="v-dash__panel-head">
            <h2 id="chat-kop">Chats that need you</h2>
            <button className="v-linkbtn" onClick={() => openTab("gesprekken")} type="button">
              All chats
            </button>
          </div>
          {aandacht.length === 0 ? (
            <p className="v-muted v-small">{data.avaLive ? "AVA has every conversation covered. You only see chats here when a visitor is waiting for you, or a hot lead is live." : "Live conversations from your website show up here."}</p>
          ) : (
            <ul className="v-vandaag__lijst">
              {aandacht.map((g) => (
                <li key={g.id}>
                  <span className={`v-heat v-heat--${warmteLabel(g.warmte).toLowerCase()}`}>{g.warmte}</span>
                  <span>
                    <strong>{g.bezoeker}</strong>
                    <small>{g.overgenomen_naam && g.laatste_rol === "bezoeker" ? `Waiting for ${g.overgenomen_naam} · ${geleden(sqlDate(g.laatste), nu)}` : `Live now · ${g.onderwerp}`}</small>
                  </span>
                  <button className="v-bel__actie" onClick={() => openTab("gesprekken")} type="button">
                    Open
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Assistent bedrijf={bedrijf} />
      </div>
    </section>
  );
}

/** AVA as your assistant: questions about your own leads, calendar and conversations. */
function Assistent({ bedrijf }: { bedrijf: string }) {
  const [tekst, setTekst] = useState("");
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [bezig, setBezig] = useState(false);
  const lijst = useRef<HTMLDivElement>(null);
  const veld = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    lijst.current?.scrollTo({ top: lijst.current.scrollHeight, behavior: "smooth" });
  }, [berichten, bezig]);

  async function stuur(vraag: string) {
    const v = vraag.trim();
    if (!v || bezig) return;
    const historie = berichten.slice(-12);
    setBerichten((b) => [...b, { rol: "ik", tekst: v }]);
    setTekst("");
    setBezig(true);
    try {
      const r = await vraagAssistent({ data: { vraag: v, historie } });
      setBerichten((b) => [...b, { rol: "ava", tekst: r.antwoord }]);
    } catch {
      setBerichten((b) => [...b, { rol: "ava", tekst: "No connection. Please try again." }]);
    } finally {
      setBezig(false);
      veld.current?.focus();
    }
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void stuur(tekst);
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  }
  return (
    <section aria-labelledby="ava-kop" className="v-dash__panel v-vandaag__paneel v-assist">
      <div className="v-dash__panel-head">
        <h2 id="ava-kop">Ask AVA</h2>
        {berichten.length ? (
          <button className="v-linkbtn" onClick={() => setBerichten([])} type="button">
            Clear
          </button>
        ) : null}
      </div>
      {berichten.length === 0 ? <p className="v-muted v-small">Questions about {bedrijf}’s leads, calendar and conversations. AVA only uses your own data.</p> : null}
      {berichten.length ? (
        <div aria-live="polite" className="v-assist__chat" ref={lijst}>
          {berichten.map((b, i) => (
            <div className={`v-home__msg v-home__msg--${b.rol}`} key={i}>
              {b.rol === "ava" ? (
                <span aria-hidden="true" className="v-home__ava">
                  A
                </span>
              ) : null}
              <p>{b.tekst}</p>
            </div>
          ))}
          {bezig ? (
            <div className="v-home__msg v-home__msg--ava">
              <span aria-hidden="true" className="v-home__ava">
                A
              </span>
              <p aria-label="AVA is thinking" className="v-home__typen">
                <i />
                <i />
                <i />
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
      <form className="v-home__balk v-assist__balk" onSubmit={onSubmit}>
        <textarea aria-label="Ask AVA" onChange={(e) => setTekst(e.target.value)} onKeyDown={onKey} placeholder={berichten.length ? "Ask another question" : "Which leads should I call first today?"} ref={veld} rows={1} value={tekst} />
        <button aria-label="Send" disabled={bezig || !tekst.trim()} type="submit">
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <path d="M10 16V4M5 9l5-5 5 5" />
          </svg>
        </button>
      </form>
      {berichten.length === 0 ? (
        <div className="v-home__tips v-assist__tips">
          {VOORBEELDEN.map((v) => (
            <button key={v} onClick={() => void stuur(v)} type="button">
              {v}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

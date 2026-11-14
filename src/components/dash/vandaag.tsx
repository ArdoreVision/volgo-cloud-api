import { useEffect, useState } from "react";

import { haalWeek } from "@/lib/api/groei.functions";
import { Dagtaken } from "./dagtaken";
import { type Afspraak, type DashData, type Gesprek, type Lead, dagKey, geleden, sqlDate } from "./util";

function groet(d: Date) {
  const uur = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Amsterdam" }).format(d));
  if (uur < 6) return "Good night";
  if (uur < 12) return "Good morning";
  if (uur < 18) return "Good afternoon";
  return "Good evening";
}

/** Contact line from the note the booking saved ("Contact: …"). */
function contactVan(a: Afspraak) {
  const m = /Contact:\s*([^\n]+)/.exec(a.notitie ?? "");
  return m ? m[1].trim() : "";
}
const isTel = (s: string) => /^[+\d][\d\s()-]{6,}$/.test(s);

function AfspraakRij({ a }: { a: Afspraak }) {
  const contact = contactVan(a);
  const dag = new Date(`${a.start.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <li className="v-vd__rij">
      <span className="v-vd__tijd">
        <b>{a.start.slice(11, 16)}</b>
        <small>{dag}</small>
      </span>
      <span className="v-vd__wat">
        <b>{a.titel}</b>
        {a.locatie ? <small>{a.locatie}</small> : null}
      </span>
      {contact ? (
        <a className="v-vd__actie" href={isTel(contact) ? `tel:${contact.replace(/[^\d+]/g, "")}` : `mailto:${contact}`}>
          {isTel(contact) ? "Call" : "Email"}
        </a>
      ) : null}
    </li>
  );
}

/** What Volgo did for you in the last 7 days: the reason you pay, in five numbers. */
function WeekStrook({ openTab }: { openTab: (t: string) => void }) {
  const [w, setW] = useState<Awaited<ReturnType<typeof haalWeek>> | null>(null);
  useEffect(() => {
    void haalWeek().then(setW).catch(() => undefined);
  }, []);
  const tegels: [string, string, string][] = w
    ? [
        [String(w.gesprekken), w.gesprekken === 1 ? "conversation answered" : "conversations answered", "gesprekken"],
        [String(w.aanvragen), w.aanvragen === 1 ? "new request" : "new requests", "aanvragen"],
        [String(w.afspraken), w.afspraken === 1 ? "appointment booked" : "appointments booked", "agenda"],
        [String(w.berichten), "messages sent automatically", "automatisch"],
        [`€ ${Math.round(w.betaald / 100).toLocaleString("en-GB")}`, "paid via Volgo", "betalingen"],
      ]
    : [];
  return (
    <section aria-label="This week" className="v-vd__week">
      <h2>What Volgo did for you in the last 7 days</h2>
      <div className="v-vd__tegels">
        {w
          ? tegels.map(([n, label, tab]) => (
              <button key={label} onClick={() => openTab(tab)} type="button">
                <b>{n}</b>
                <span>{label}</span>
              </button>
            ))
          : [0, 1, 2, 3, 4].map((i) => <span className="v-vd__tegel-laden" key={i} />)}
      </div>
    </section>
  );
}

/**
 * The start screen: what needs you right now. Who is chatting live, what is booked today and next,
 * and the newest requests to call back. Everything else lives in the other tabs.
 */
export function Vandaag({ data, voornaam, openTab }: { data: DashData; voornaam: string; openTab: (t: string) => void }) {
  const nu = new Date();
  const vandaag = dagKey(nu);
  const echt = <T extends { voorbeeld: number }>(x: T[]) => x.filter((r) => !r.voorbeeld);

  const live: Gesprek[] = echt(data.gesprekken).filter((g) => g.status === "live" && nu.getTime() - sqlDate(g.laatste).getTime() < 15 * 60000);
  const afspraken: Afspraak[] = echt(data.afspraken);
  const nuLokaal = `${vandaag}T${nu.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" })}`;
  const vandaagLijst = afspraken.filter((a) => a.start.slice(0, 10) === vandaag && a.eind.slice(0, 16) >= nuLokaal);
  const straks = afspraken.filter((a) => a.start.slice(0, 10) > vandaag).slice(0, 5);
  const nieuw: Lead[] = echt(data.leads)
    .filter((l) => l.status === "nieuw")
    .slice(0, 5);

  return (
    <div className="v-vd">
      <header className="v-vd__kop">
        <h1>
          {groet(nu)}
          {voornaam ? `, ${voornaam}` : ""}.
        </h1>
        <p>
          {live.length ? `${live.length} ${live.length === 1 ? "person is" : "people are"} chatting with your assistant right now.` : "Your assistant is online and answers your website, 24/7."}
        </p>
      </header>

      <WeekStrook openTab={openTab} />

      <Dagtaken openTab={openTab} />

      <section aria-labelledby="vd-live" className="v-vd__blok">
        <div className="v-vd__blokkop">
          <h2 id="vd-live">Live now</h2>
          <button className="v-vd__link" onClick={() => openTab("gesprekken")} type="button">
            All conversations →
          </button>
        </div>
        {live.length ? (
          <ul className="v-vd__lijst">
            {live.map((g) => (
              <li className="v-vd__rij" key={g.id}>
                <span className="v-vd__punt" aria-label="Live" />
                <span className="v-vd__wat">
                  <b>{g.bezoeker}</b>
                  <small>
                    {g.onderwerp} · {geleden(sqlDate(g.laatste))}
                  </small>
                </span>
                <button className="v-vd__actie" onClick={() => openTab("gesprekken")} type="button">
                  Watch
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="v-vd__leeg">Nobody is chatting right now. You get a notification as soon as someone starts.</p>
        )}
      </section>

      <section aria-labelledby="vd-vandaag" className="v-vd__blok">
        <div className="v-vd__blokkop">
          <h2 id="vd-vandaag">Today</h2>
          <button className="v-vd__link" onClick={() => openTab("agenda")} type="button">
            Calendar →
          </button>
        </div>
        {vandaagLijst.length ? (
          <ul className="v-vd__lijst">
            {vandaagLijst.map((a) => (
              <AfspraakRij a={a} key={a.id} />
            ))}
          </ul>
        ) : (
          <p className="v-vd__leeg">No more appointments today.</p>
        )}
      </section>

      <section aria-labelledby="vd-straks" className="v-vd__blok">
        <div className="v-vd__blokkop">
          <h2 id="vd-straks">Coming up</h2>
        </div>
        {straks.length ? (
          <ul className="v-vd__lijst">
            {straks.map((a) => (
              <AfspraakRij a={a} key={a.id} />
            ))}
          </ul>
        ) : (
          <p className="v-vd__leeg">When a customer picks a day and time in the chat, the appointment shows up here with name and address.</p>
        )}
      </section>

      <section aria-labelledby="vd-nieuw" className="v-vd__blok">
        <div className="v-vd__blokkop">
          <h2 id="vd-nieuw">New requests to call back</h2>
          <button className="v-vd__link" onClick={() => openTab("aanvragen")} type="button">
            All requests →
          </button>
        </div>
        {nieuw.length ? (
          <ul className="v-vd__lijst">
            {nieuw.map((l) => (
              <li className="v-vd__rij" key={l.id}>
                <span className="v-vd__wat">
                  <b>{l.naam}</b>
                  <small>
                    {l.onderwerp} · {geleden(sqlDate(l.created_at))}
                  </small>
                </span>
                <button className="v-vd__actie" onClick={() => openTab("aanvragen")} type="button">
                  Open
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="v-vd__leeg">No open requests. Nice.</p>
        )}
      </section>
    </div>
  );
}

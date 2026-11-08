import { useEffect, useState } from "react";

import { Footer } from "./footer";
import { VolgoMark } from "./logo";
import { startBetaling } from "@/lib/api/account.functions";
import { PLANS, type PlanId } from "@/lib/plans";
import { type RouteTaal } from "./route-teksten";
import { huidigeTaal, kiesTaal } from "./taal";
import { meet } from "./tracking";
import "@/volgo-dialed.css";
import "@/volgo-landing.css";

const T = {
  en: {
    login: "Log in",
    dashboard: "Dashboard",
    oog: "AI assistant for your website",
    titel: "Your assistant online. 24/7.",
    sub: "You do the work. Volgo answers every visitor on your website, asks the questions you need and puts each appointment, with name and address, in your calendar.",
    start: "Start",
    prijzen: "See pricing",
    klein: "7 days for €1 · cancel any time",
    chatKop: "Your website",
    bez1: "Hi, can someone redo our back garden?",
    ava1: "Of course! Roughly how big is it, and what's the address?",
    bez2: "About 60 m², Dorpsstraat 12, Middelburg.",
    ava2: "Thanks! Pick a moment for a visit below.",
    geboekt: "Booked: Tue 14:00",
    appKop: "Volgo app",
    nieuw: "New appointment",
    afspraak: "Visit at address · Tue 14:00",
    naam: "Anna de Vries",
    adres: "Dorpsstraat 12, Middelburg",
    notitie: "Back garden ~60 m², wants it done in spring",
    bellen: "Call",
    stappenKop: "How it works",
    stappen: [
      ["Volgo answers", "Every visitor gets an answer within seconds, day and night, also at the weekend."],
      ["It asks your questions", "What they need, where, how big, when. The questions you choose."],
      ["The appointment is in your calendar", "Phone call, visit or chat appointment, with name, number and address."],
    ],
    appTitel: "Everything in one clear app",
    app: [
      ["Live chats", "See what visitors ask, right now, and take over yourself."],
      ["Calendar", "Every appointment with name, phone number and address."],
      ["Notifications", "Know the moment someone starts chatting."],
      ["Visitors", "See how many people visit your website and where they come from."],
    ],
    prijsTitel: "Two plans. No surprises.",
    prijsSub: "Excluding VAT. Monthly, cancel any time.",
    perMaand: "per month",
    plannen: {
      start: { naam: "Assistant", voor: "For businesses that already have a website.", extra: "7 days for €1", knop: "Start 7 days for €1", punten: ["Assistant on your website, 24/7", "Asks your questions before every appointment", "Appointments in your calendar with name and address", "Notification when someone starts chatting", "We set it up for you"] },
      pro: { naam: "Complete", voor: "A new premium website, with your assistant inside.", extra: "+ €995 one-time for your website", knop: "Start Complete", punten: ["Everything in Assistant", "New premium website, built for you", "Photos, video and animations", "Your own chat photo and style", "Changes when you need them"] },
    },
    populair: "Most chosen",
    eenMoment: "One moment…",
    slotTitel: "Never lose a customer in your inbox again.",
    slotSub: "Start today. Volgo is on your website within a day.",
  },
  nl: {
    login: "Inloggen",
    dashboard: "Dashboard",
    oog: "AI-assistent voor je website",
    titel: "Jouw assistent online. 24/7.",
    sub: "Jij doet het werk. Volgo beantwoordt elke bezoeker op je website, stelt de vragen die jij wilt en zet elke afspraak, met naam en adres, in je agenda.",
    start: "Start",
    prijzen: "Bekijk de prijzen",
    klein: "7 dagen voor €1 · maandelijks opzegbaar",
    chatKop: "Jouw website",
    bez1: "Hoi, kunnen jullie onze achtertuin opnieuw aanleggen?",
    ava1: "Zeker! Hoe groot is de tuin ongeveer, en wat is het adres?",
    bez2: "Zo'n 60 m², Dorpsstraat 12, Middelburg.",
    ava2: "Dank je! Kies hieronder een moment voor een bezoek.",
    geboekt: "Geboekt: di 14:00",
    appKop: "Volgo-app",
    nieuw: "Nieuwe afspraak",
    afspraak: "Langskomen · di 14:00",
    naam: "Anna de Vries",
    adres: "Dorpsstraat 12, Middelburg",
    notitie: "Achtertuin ±60 m², wil het in het voorjaar klaar",
    bellen: "Bellen",
    stappenKop: "Zo werkt het",
    stappen: [
      ["Volgo antwoordt", "Elke bezoeker krijgt binnen een paar seconden antwoord, dag en nacht, ook in het weekend."],
      ["Het stelt jouw vragen", "Wat ze nodig hebben, waar, hoe groot, wanneer. De vragen die jij kiest."],
      ["De afspraak staat in je agenda", "Bellen, langskomen of een chatafspraak, met naam, nummer en adres."],
    ],
    appTitel: "Alles in één overzichtelijke app",
    app: [
      ["Live chats", "Zie wat bezoekers nu vragen, en neem het gesprek zelf over."],
      ["Agenda", "Elke afspraak met naam, telefoonnummer en adres."],
      ["Meldingen", "Weet het meteen als iemand begint te chatten."],
      ["Bezoekers", "Zie hoeveel mensen je website bezoeken en waar ze vandaan komen."],
    ],
    prijsTitel: "Twee pakketten. Geen verrassingen.",
    prijsSub: "Exclusief btw. Per maand, maandelijks opzegbaar.",
    perMaand: "per maand",
    plannen: {
      start: { naam: "Assistent", voor: "Voor bedrijven die al een website hebben.", extra: "7 dagen voor €1", knop: "Start 7 dagen voor €1", punten: ["Assistent op je website, 24/7", "Stelt jouw vragen voor elke afspraak", "Afspraken in je agenda met naam en adres", "Melding zodra iemand begint te chatten", "Wij zetten het voor je op"] },
      pro: { naam: "Compleet", voor: "Een nieuwe premium website, met je assistent erin.", extra: "+ €995 eenmalig voor je website", knop: "Start Compleet", punten: ["Alles uit Assistent", "Nieuwe premium website, voor je gebouwd", "Foto's, video en animaties", "Eigen chatfoto en stijl", "Aanpassingen wanneer je wilt"] },
    },
    populair: "Meest gekozen",
    eenMoment: "Een moment…",
    slotTitel: "Nooit meer een klant kwijt in je mail.",
    slotSub: "Start vandaag. Volgo staat binnen een dag op je website.",
  },
};

function Ico({ i }: { i: number }) {
  const paden = [
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16A2.5 2.5 0 0 1 4 13.5z" key="a" />,
    <path d="M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4" key="b" />,
    <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9zM10 19a2 2 0 0 0 4 0" key="c" />,
    <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" key="d" />,
  ];
  return (
    <svg aria-hidden="true" className="vl-ico" viewBox="0 0 24 24">
      {paden[i]}
    </svg>
  );
}

function Prijzen({ t }: { t: (typeof T)["en"] | (typeof T)["nl"] }) {
  const [bezig, setBezig] = useState<PlanId | null>(null);
  async function kies(plan: PlanId) {
    if (bezig) return;
    setBezig(plan);
    meet("abo_klik");
    try {
      const r = await startBetaling({ data: { plan } });
      if (r.ok) {
        window.location.href = r.url;
        return;
      }
    } catch {
      /* fall through */
    }
    window.location.href = "/pricing#plans";
  }
  return (
    <section aria-labelledby="vl-prijs" className="vl-sectie" id="pricing">
      <h2 className="vl-h2" id="vl-prijs" style={{ marginBottom: 10 }}>
        {t.prijsTitel}
      </h2>
      <p className="vl-sub vl-center">{t.prijsSub}</p>
      <div className="vl-plannen">
        {(["start", "pro"] as const).map((id) => {
          const p = t.plannen[id];
          return (
            <article className={`vl-plan${id === "pro" ? " is-uit" : ""}`} key={id}>
              <div className="vl-plan__kop">
                <h3>{p.naam}</h3>
                {id === "pro" ? <em>{t.populair}</em> : null}
              </div>
              <p className="vl-plan__voor">{p.voor}</p>
              <p className="vl-plan__prijs">
                <b>€{PLANS[id].prijsTekst}</b> <span>{t.perMaand}</span>
              </p>
              <p className="vl-plan__extra">{p.extra}</p>
              <button className={`vl-knop${id === "pro" ? "" : " vl-knop--stil"}`} disabled={bezig !== null} onClick={() => void kies(id)} type="button">
                {bezig === id ? t.eenMoment : `${p.knop} →`}
              </button>
              <ul>
                {p.punten.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** The landing page: what Volgo does, how it works, what you see in the app, the two plans. Only what works today. */
export function LandingPagina({ ingelogd, vast }: { ingelogd: boolean; vast?: RouteTaal }) {
  const [taal, setTaal] = useState<RouteTaal>(vast ?? "en");

  useEffect(() => {
    if (vast) {
      document.documentElement.lang = vast;
      if (huidigeTaal() !== vast) kiesTaal(vast);
    } else setTaal(huidigeTaal() === "nl" ? "nl" : "en");
    const op = (e: Event) => setTaal((e as CustomEvent<string>).detail === "nl" ? "nl" : "en");
    window.addEventListener("volgo-taal", op);
    return () => window.removeEventListener("volgo-taal", op);
  }, [vast]);

  const t = T[taal === "nl" ? "nl" : "en"];
  const naar = ingelogd ? "/dashboard" : "/signup";

  return (
    <div className="volgo volgo--simpel volgo--dialed vl" id="vd">
      <header className="vl-top">
        <a className="vl-merk" href="/">
          <VolgoMark size={22} />
          <span>Volgo</span>
        </a>
        <a className="vl-top__link" href={ingelogd ? "/dashboard" : "/login"}>
          {ingelogd ? t.dashboard : t.login}
        </a>
      </header>

      <main>
        <section aria-labelledby="vl-titel" className="vl-hero">
          <p className="vl-oog">{t.oog}</p>
          <h1 className="vl-titel" id="vl-titel">
            {t.titel}
          </h1>
          <p className="vl-sub">{t.sub}</p>
          <div className="vl-acties">
            <a className="vl-knop" href={naar} onClick={() => meet("abo_klik")}>
              {ingelogd ? t.dashboard : t.start} →
            </a>
            <a className="vl-knop vl-knop--stil" href="#pricing">
              {t.prijzen}
            </a>
          </div>
          <p className="vl-klein">{t.klein}</p>
        </section>

        <section aria-hidden="true" className="vl-beeld">
          <div className="vl-kaart vl-chat">
            <div className="vl-kaart__kop">
              <span className="vl-stip" />
              {t.chatKop}
            </div>
            <div className="vl-chat__body">
              <p className="vl-bel vl-bel--bez">{t.bez1}</p>
              <p className="vl-bel">{t.ava1}</p>
              <p className="vl-bel vl-bel--bez">{t.bez2}</p>
              <p className="vl-bel">{t.ava2}</p>
              <p className="vl-geboekt">✓ {t.geboekt}</p>
            </div>
          </div>
          <div className="vl-pijl">→</div>
          <div className="vl-kaart vl-app">
            <div className="vl-kaart__kop">
              <VolgoMark size={14} />
              {t.appKop}
            </div>
            <div className="vl-app__body">
              <p className="vl-app__label">{t.nieuw}</p>
              <p className="vl-app__wat">{t.afspraak}</p>
              <div className="vl-app__persoon">
                <span className="vl-av">AV</span>
                <span>
                  <b>{t.naam}</b>
                  <small>{t.adres}</small>
                </span>
              </div>
              <p className="vl-app__notitie">{t.notitie}</p>
              <span className="vl-app__knop">{t.bellen}</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="vl-stappen" className="vl-sectie">
          <h2 className="vl-h2" id="vl-stappen">
            {t.stappenKop}
          </h2>
          <ol className="vl-stappen">
            {t.stappen.map(([kop, tekst], i) => (
              <li key={kop}>
                <span className="vl-nr">{i + 1}</span>
                <h3>{kop}</h3>
                <p>{tekst}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="vl-app" className="vl-sectie">
          <h2 className="vl-h2" id="vl-app">
            {t.appTitel}
          </h2>
          <div className="vl-raster">
            {t.app.map(([kop, tekst], i) => (
              <article key={kop}>
                <Ico i={i} />
                <h3>{kop}</h3>
                <p>{tekst}</p>
              </article>
            ))}
          </div>
        </section>

        <Prijzen t={t} />

        <section aria-labelledby="vl-slot" className="vl-slot">
          <h2 className="vl-h2" id="vl-slot">
            {t.slotTitel}
          </h2>
          <p className="vl-sub">{t.slotSub}</p>
          <a className="vl-knop" href={naar} onClick={() => meet("abo_klik")}>
            {ingelogd ? t.dashboard : t.start} →
          </a>
        </section>
      </main>
      <Footer />
    </div>
  );
}

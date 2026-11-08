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
    filmLabel: "What Volgo does, in 36 seconds",
    titel: "Your assistant online. 24/7.",
    sub: "Volgo answers every visitor on your website, day and night, and books the appointment straight into your calendar. Then it sends the reminder, asks for the review and follows up. You just do the work.",
    start: "Start",
    prijzen: "See pricing",
    klein: "7 days for €1 · install it yourself in 2 minutes · cancel any time",
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
    watKop: "What is Volgo?",
    wat: "Volgo is an assistant that lives on your website. It talks to your visitors like a friendly employee would: it answers their questions, asks what you need to know, and plans the appointment. Everything lands in one simple app on your phone.",
    waaromKop: "Why businesses use it",
    waarom: [
      ["No missed customers", "Most people who visit your website never call or email. Volgo starts the conversation with them, also at 22:00 and on Sunday."],
      ["The fastest answer wins", "People ask several businesses at once. Volgo answers within seconds, so you're first."],
      ["No calling, no chasing", "Reminders, follow-ups, review requests and payment links go out by themselves. You don't have to remember anything."],
    ],
    stappenKop: "Running in 3 steps",
    stappen: [
      ["Sign up", "Choose your plan and answer 5 short questions about your business. Volgo learns your services, area and prices."],
      ["Paste one line of code", "Copy it from your dashboard and paste it in WordPress, Wix, Squarespace, Shopify or Webflow. Step by step, in 2 minutes. Prefer we do it? Just ask."],
      ["Customers book, you work", "Volgo chats, books and follows up. You see every conversation and appointment in the app, with a notification on your phone."],
    ],
    allesKop: "Everything Volgo does for you",
    alles: [
      ["Chat that books", "Answers every visitor 24/7 and books phone calls, visits or chat appointments in your calendar."],
      ["Never a double booking", "One appointment per time slot. Booked times disappear from the calendar straight away."],
      ["Reminder the day before", "Every customer gets a reminder 24 hours before the appointment. Fewer no-shows."],
      ["Reviews on autopilot", "After the appointment Volgo asks for a Google review, and writes your replies to reviews."],
      ["Follow-up after 1 and 3 days", "Left their details but didn't book? Volgo follows up, written for what they asked."],
      ["One inbox", "Website chat, contact form and email in one place. Answer from the app."],
      ["Payment requests", "Job done? Send a payment link in 10 seconds. Paid straight to your account."],
      ["Seasonal messages", "A short, useful message to earlier customers four times a year, so they come back."],
      ["Notifications on your phone", "Know right away when someone chats, books or pays."],
    ],
    zienKop: "See your own website in your dashboard",
    zien: "Fill in your website address and you see your real website with your Volgo chat on it, on a computer and on a phone. Choose your chat's name, photo, colour and the questions it asks. The rest we keep running for you.",
    zienPunten: ["Your real website, live", "Try the chat yourself", "Change how the chat looks", "Check that it's installed"],
    installKop: "Install it yourself. Or we do it.",
    install: "One line of code puts Volgo on every page. Your dashboard shows the exact steps for your website builder, and checks if it worked.",
    prijsTitel: "Two plans. No surprises.",
    prijsSub: "Excluding VAT. Monthly, cancel any time.",
    perMaand: "per month",
    plannen: {
      start: { naam: "Assistant", voor: "For businesses that already have a website.", extra: "7 days for €1", knop: "Start 7 days for €1", punten: ["Assistant on your website, 24/7, books in your calendar", "Reminders, follow-ups and review requests", "One inbox for chat, contact form and email", "Payment requests and phone notifications", "Install it yourself, or we do it for you"] },
      pro: { naam: "Complete", voor: "A new premium website, with your assistant inside.", extra: "+ €995 one-time for your website", knop: "Start Complete", punten: ["Everything in Assistant", "New premium website, built for you", "Photos, video and animations", "Your own chat photo and style", "Changes when you need them"] },
    },
    populair: "Most chosen",
    eenMoment: "One moment…",
    faqKop: "Questions",
    faq: [
      ["Do I need technical knowledge?", "No. You copy one line and paste it in your website builder, with steps for WordPress, Wix, Squarespace, Shopify and Webflow. Rather not? We install it for you."],
      ["What do my customers receive?", "Only useful messages from your business name: the appointment, a reminder, a follow-up if they didn't book, and a review request. Follow-ups and seasonal messages always have a stop link."],
      ["Can I change the chat myself?", "Yes: its name, photo, colour, style and the questions it asks. You see it live on your own website in the dashboard."],
      ["How do payments work?", "You send a payment request from the app. Your customer pays with iDEAL or card through your own Stripe account, or by bank transfer to your IBAN. Volgo never holds your money."],
      ["Can I stop?", "Yes, every month. No contract, no notice period."],
    ],
    slotTitel: "Never lose a customer in your inbox again.",
    slotSub: "Start today. Volgo can be on your website in 2 minutes.",
  },
  nl: {
    login: "Inloggen",
    dashboard: "Dashboard",
    oog: "AI-assistent voor je website",
    filmLabel: "Wat Volgo doet, in 36 seconden",
    titel: "Jouw assistent online. 24/7.",
    sub: "Volgo beantwoordt elke bezoeker op je website, dag en nacht, en zet de afspraak meteen in je agenda. Daarna stuurt het de herinnering, vraagt het om de review en volgt het op. Jij doet alleen het werk.",
    start: "Start",
    prijzen: "Bekijk de prijzen",
    klein: "7 dagen voor €1 · zelf te installeren in 2 minuten · maandelijks opzegbaar",
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
    watKop: "Wat is Volgo?",
    wat: "Volgo is een assistent die op je website woont. Het praat met je bezoekers zoals een vriendelijke medewerker dat zou doen: het beantwoordt vragen, vraagt wat jij moet weten en plant de afspraak. Alles komt binnen in één simpele app op je telefoon.",
    waaromKop: "Waarom bedrijven het gebruiken",
    waarom: [
      ["Geen gemiste klanten", "De meeste mensen die je website bekijken bellen of mailen nooit. Volgo begint het gesprek met ze, ook om 22:00 en op zondag."],
      ["Het snelste antwoord wint", "Mensen vragen bij meerdere bedrijven tegelijk. Volgo antwoordt binnen seconden, dus jij bent de eerste."],
      ["Niet bellen, niet najagen", "Herinneringen, opvolging, reviewverzoeken en betaallinks gaan vanzelf. Jij hoeft niks te onthouden."],
    ],
    stappenKop: "Draaiend in 3 stappen",
    stappen: [
      ["Meld je aan", "Kies je pakket en beantwoord 5 korte vragen over je bedrijf. Volgo leert je diensten, werkgebied en prijzen."],
      ["Plak één regel code", "Kopieer hem uit je dashboard en plak hem in WordPress, Wix, Squarespace, Shopify of Webflow. Stap voor stap, in 2 minuten. Liever dat wij het doen? Vraag het gewoon."],
      ["Klanten boeken, jij werkt", "Volgo chat, boekt en volgt op. Je ziet elk gesprek en elke afspraak in de app, met een melding op je telefoon."],
    ],
    allesKop: "Alles wat Volgo voor je doet",
    alles: [
      ["Chat die boekt", "Beantwoordt elke bezoeker 24/7 en boekt telefoongesprekken, bezoeken of chatafspraken in je agenda."],
      ["Nooit dubbel geboekt", "Eén afspraak per tijdslot. Geboekte tijden verdwijnen meteen uit de agenda."],
      ["Herinnering een dag van tevoren", "Elke klant krijgt 24 uur voor de afspraak een herinnering. Minder mensen die niet komen opdagen."],
      ["Reviews vanzelf", "Na de afspraak vraagt Volgo om een Google-review, en schrijft het je antwoorden op reviews."],
      ["Opvolging na 1 en 3 dagen", "Gegevens achtergelaten maar niet geboekt? Volgo volgt op, geschreven op wat ze vroegen."],
      ["Eén inbox", "Websitechat, contactformulier en mail op één plek. Antwoord vanuit de app."],
      ["Betaalverzoeken", "Klus klaar? Stuur in 10 seconden een betaallink. Direct op jouw rekening."],
      ["Seizoensberichten", "Vier keer per jaar een kort, nuttig bericht aan eerdere klanten, zodat ze terugkomen."],
      ["Meldingen op je telefoon", "Weet het meteen als iemand chat, boekt of betaalt."],
    ],
    zienKop: "Zie je eigen website in je dashboard",
    zien: "Vul je websiteadres in en je ziet je echte website met je Volgo-chat erop, op de computer en op de telefoon. Kies de naam, foto, kleur en de vragen van je chat. De rest houden wij voor je draaiend.",
    zienPunten: ["Je echte website, live", "Probeer de chat zelf", "Pas aan hoe de chat eruitziet", "Check of hij goed staat"],
    installKop: "Zelf installeren. Of wij doen het.",
    install: "Eén regel code zet Volgo op elke pagina. Je dashboard laat de precieze stappen zien voor jouw websitebouwer, en checkt of het gelukt is.",
    prijsTitel: "Twee pakketten. Geen verrassingen.",
    prijsSub: "Exclusief btw. Per maand, maandelijks opzegbaar.",
    perMaand: "per maand",
    plannen: {
      start: { naam: "Assistent", voor: "Voor bedrijven die al een website hebben.", extra: "7 dagen voor €1", knop: "Start 7 dagen voor €1", punten: ["Assistent op je website, 24/7, boekt in je agenda", "Herinneringen, opvolging en reviewverzoeken", "Eén inbox voor chat, contactformulier en mail", "Betaalverzoeken en meldingen op je telefoon", "Zelf installeren, of wij doen het voor je"] },
      pro: { naam: "Compleet", voor: "Een nieuwe premium website, met je assistent erin.", extra: "+ €995 eenmalig voor je website", knop: "Start Compleet", punten: ["Alles uit Assistent", "Nieuwe premium website, voor je gebouwd", "Foto's, video en animaties", "Eigen chatfoto en stijl", "Aanpassingen wanneer je wilt"] },
    },
    populair: "Meest gekozen",
    eenMoment: "Een moment…",
    faqKop: "Vragen",
    faq: [
      ["Heb ik technische kennis nodig?", "Nee. Je kopieert één regel en plakt die in je websitebouwer, met stappen voor WordPress, Wix, Squarespace, Shopify en Webflow. Liever niet? Dan installeren wij het."],
      ["Wat krijgen mijn klanten?", "Alleen nuttige berichten op naam van jouw bedrijf: de afspraak, een herinnering, een opvolging als ze niet boekten en een reviewverzoek. Opvolg- en seizoensberichten hebben altijd een afmeldlink."],
      ["Kan ik de chat zelf aanpassen?", "Ja: naam, foto, kleur, stijl en de vragen die hij stelt. Je ziet het live op je eigen website in het dashboard."],
      ["Hoe werkt betalen?", "Je stuurt een betaalverzoek vanuit de app. Je klant betaalt met iDEAL of kaart via je eigen Stripe-account, of met een overboeking naar je IBAN. Volgo komt nooit aan je geld."],
      ["Kan ik stoppen?", "Ja, elke maand. Geen contract, geen opzegtermijn."],
    ],
    slotTitel: "Nooit meer een klant kwijt in je mail.",
    slotSub: "Start vandaag. Volgo kan binnen 2 minuten op je website staan.",
  },
};

const PLATFORMS = ["WordPress", "Wix", "Squarespace", "Shopify", "Webflow", "HTML"];

function Ico({ i }: { i: number }) {
  const paden = [
    "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16A2.5 2.5 0 0 1 4 13.5z",
    "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4",
    "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
    "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
    "M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.7L4 15.5M4 20v-4.5h4.5",
    "M4 7l8 6 8-6M4 6h16v12H4z",
    "M3 7h18v10H3zM3 10.5h18M7 14h4",
    "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    "M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9zM10 19a2 2 0 0 0 4 0",
  ];
  return (
    <svg aria-hidden="true" className="vl-ico" viewBox="0 0 24 24">
      <path d={paden[i % paden.length]} />
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

/** The landing page: what Volgo is, why, how to install it, everything it does, the two plans, questions. Only what works today. */
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
  // Phones get the portrait version of the film, so the text stays readable.
  const [smal, setSmal] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 640px)");
    setSmal(m.matches);
    const op = () => setSmal(m.matches);
    m.addEventListener("change", op);
    return () => m.removeEventListener("change", op);
  }, []);
  const film = `${taal === "nl" ? "nl" : "en"}${smal ? "-m" : ""}`;
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
          <figure className="vl-film">
            <video
              aria-label={t.filmLabel}
              autoPlay
              controls
              className={smal ? "is-staand" : undefined}
              key={film}
              loop
              muted
              playsInline
              poster={`/film/poster-${film}.jpg`}
              preload="metadata"
              src={`/film/uitleg-${film}.mp4`}
            />
            <figcaption>{t.filmLabel}</figcaption>
          </figure>
        </section>

        <section aria-labelledby="vl-wat" className="vl-sectie vl-wat">
          <h2 className="vl-h2" id="vl-wat">
            {t.watKop}
          </h2>
          <p className="vl-sub vl-center vl-breed">{t.wat}</p>
          <h3 className="vl-h3">{t.waaromKop}</h3>
          <div className="vl-stappen">
            {t.waarom.map(([kop, tekst]) => (
              <article key={kop}>
                <h3>{kop}</h3>
                <p>{tekst}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="vl-stappen" className="vl-sectie" id="how">
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

        <section aria-labelledby="vl-alles" className="vl-sectie">
          <h2 className="vl-h2" id="vl-alles">
            {t.allesKop}
          </h2>
          <div className="vl-raster vl-raster--3">
            {t.alles.map(([kop, tekst], i) => (
              <article key={kop}>
                <Ico i={i} />
                <h3>{kop}</h3>
                <p>{tekst}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="vl-zien" className="vl-sectie">
          <div className="vl-duo">
            <div>
              <h2 className="vl-h2 vl-links" id="vl-zien">
                {t.zienKop}
              </h2>
              <p className="vl-sub vl-links">{t.zien}</p>
              <ul className="vl-vinkjes">
                {t.zienPunten.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div aria-hidden="true" className="vl-kaart vl-scherm">
              <div className="vl-kaart__kop">
                <i />
                <i />
                <i />
                <span>www.yourbusiness.com</span>
              </div>
              <div className="vl-scherm__site">
                <span className="vl-scherm__balk" />
                <span className="vl-scherm__titel" />
                <span className="vl-scherm__regel" />
                <span className="vl-scherm__regel vl-scherm__regel--kort" />
                <span className="vl-scherm__foto" />
                <div className="vl-scherm__chat">
                  <p className="vl-bel">{t.ava1}</p>
                  <p className="vl-bel vl-bel--bez">{t.bez2}</p>
                </div>
                <span className="vl-scherm__bol">
                  <VolgoMark size={18} />
                </span>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="vl-install" className="vl-sectie">
          <h2 className="vl-h2" id="vl-install">
            {t.installKop}
          </h2>
          <p className="vl-sub vl-center vl-breed">{t.install}</p>
          <pre aria-label="Install code" className="vl-code">{'<script src="https://thevolgo.app/ava.js" data-key="…" defer></script>'}</pre>
          <div className="vl-chips">
            {PLATFORMS.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </section>

        <Prijzen t={t} />

        <section aria-labelledby="vl-faq" className="vl-sectie vl-faq">
          <h2 className="vl-h2" id="vl-faq">
            {t.faqKop}
          </h2>
          {t.faq.map(([v, a]) => (
            <details key={v}>
              <summary>{v}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>

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

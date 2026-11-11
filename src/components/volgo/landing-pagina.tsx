import { useEffect, useState } from "react";

import { AvaChat, VOLGO_AVA_SLEUTEL } from "./ava-chat";
import { Footer } from "./footer";
import { VolgoMark } from "./logo";
import { type RouteTaal } from "./route-teksten";
import { TaalKiezer, Vertaler, kiesTaal, opgeslagenTaal, toonTaal } from "./taal";
import { regioTaal } from "@/lib/api/vertaal.functions";
import { PLANS } from "@/lib/plans";
import { TALEN, isTaal } from "@/lib/talen";
import "@/volgo-dialed.css";
import "@/volgo-landing.css";

/** Damien's number: every "Book a call" opens WhatsApp, "Bel" calls directly. */
const NUMMER = "31619752432";
const NUMMER_LEESBAAR = "+31 6 19 75 24 32";
const WHATSAPP = `https://wa.me/${NUMMER}?text=${encodeURIComponent("Hoi! Ik wil graag een call boeken over een website / systeem voor mijn bedrijf.")}`;
const BELLEN = `tel:+${NUMMER}`;

/** What Volgo does, step by step, in one conversation (like a human appointment setter would). */
const FLOW: [string, string, string][] = [
  ["1", "Begroet", "Elke bezoeker krijgt binnen een seconde antwoord. Ook om 22:00 en op zondag."],
  ["2", "Stelt jouw vragen", "Wat moet er gebeuren, hoe groot, waar, wanneer? Volgo vraagt wat jij wilt weten."],
  ["3", "Beantwoordt twijfels", "Prijs, werkgebied, hoe het werkt: Volgo antwoordt met de info van jouw bedrijf."],
  ["4", "Plant de afspraak", "De klant kiest een vrij moment. Het staat direct in je agenda, nooit dubbel geboekt."],
  ["5", "Herinnert", "Een dag van tevoren krijgt de klant een herinnering. Minder mensen die niet komen."],
  ["6", "Volgt op", "Niet geboekt? Na 1 en 3 dagen een persoonlijk bericht. Na de afspraak een reviewverzoek."],
];

const ZONDER_MET: [string, string][] = [
  ["Bezoekers kijken rond en gaan weg zonder iets te zeggen", "Elke bezoeker wordt meteen aangesproken en geholpen"],
  ["Aanvragen 's avonds en in het weekend blijven liggen", "24/7 antwoord, binnen een seconde"],
  ["Heen en weer bellen en mailen om een tijd te prikken", "De klant plant zelf een vrij moment in je agenda"],
  ["Mensen vergeten de afspraak", "Automatische herinnering de dag ervoor"],
  ["Wie niet boekt, hoor je nooit meer", "Volgo volgt automatisch op na 1 en 3 dagen"],
];

const CONTROLE: [string, string][] = [
  ["Alles in één app", "Gesprekken, aanvragen, afspraken met naam, nummer en adres. Op je telefoon en computer."],
  ["Meldingen op je telefoon", "Je weet het meteen als iemand chat of een afspraak boekt."],
  ["Zelf overnemen", "Lees elk gesprek live mee en neem het met één tik over."],
  ["Jouw stijl", "Kies de naam, foto, kleur en de vragen van je assistent."],
];

/** Monthly plans: exactly what Volgo does in each. Prices excl. VAT. */
const PLANNEN = [
  {
    id: "start",
    naam: "Assistent",
    voor: "Voor bedrijven die al een website hebben.",
    prijs: PLANS.start.prijsTekst,
    extra: "7 dagen proberen voor €1",
    knop: "Start voor €1",
    href: "/signup",
    punten: [
      "AI-appointment setter op je website, 24/7",
      "Stelt jouw vragen en plant afspraken direct in je agenda",
      "Telefoongesprek, bezoek op adres of chatafspraak",
      "Nooit dubbel geboekt",
      "Herinnering de dag voor de afspraak",
      "Opvolging na 1 en 3 dagen als iemand niet boekte",
      "Reviewverzoek na de afspraak",
      "Inbox, aanvragen en meldingen op je telefoon",
      "Zelf te installeren in 2 minuten, of wij doen het",
    ],
  },
  {
    id: "pro",
    naam: "Compleet",
    voor: "Een nieuwe premium website, met je appointment setter erin.",
    prijs: PLANS.pro.prijsTekst,
    extra: `+ €${(PLANS.pro.opstart / 100).toLocaleString("nl-NL")} eenmalig voor je website`,
    knop: "Book a call",
    href: "",
    punten: [
      "Alles uit Assistent",
      "Nieuwe website op maat, gebouwd door ons team",
      "Foto's, video en animaties met AI",
      "Eigen foto en stijl voor je assistent, zonder Volgo-logo",
      "Aanpassingen aan je website wanneer je wilt",
      "Live binnen 24 uur na akkoord",
    ],
  },
] as const;

const VOORBEELDEN = [
  { naam: "Badkamerstudio Noordzee", soort: "Badkamers · website met Volgo erin", href: "/voorbeeld/badkamer.html", beeld: "/voorbeeld/badkamer.jpg" },
  { naam: "Bluebonnet Build Co.", soort: "Aannemer · website met Volgo erin", href: "/voorbeeld/contractor.html", beeld: "/voorbeeld/contractor.jpg" },
];

const FAQ: [string, string][] = [
  ["Wat is een appointment setter?", "Iemand die nieuwe klanten te woord staat, uitzoekt wat ze nodig hebben en een afspraak met je inplant. Volgo doet precies dat, maar dan met AI in je website, dag en nacht."],
  ["Is het een chatbot?", "Volgo praat via een chat op je website, maar het doel is één ding: de afspraak. Het stelt jouw vragen, beantwoordt twijfels met de info van jouw bedrijf en zet de afspraak in je agenda. Daarna stuurt het de herinnering en volgt het op."],
  ["Moet ik technisch zijn?", "Nee. Je plakt één regel code in je website (stappen voor WordPress, Wix, Squarespace, Shopify en Webflow), of wij doen het voor je."],
  ["Werkt het ook met WhatsApp en telefoon?", "Knoppen om je te WhatsAppen of te bellen werken meteen. WhatsApp-berichten en gemiste oproepen automatisch in Volgo ontvangen kan via een koppeling die wij regelen."],
  ["Zit ik ergens aan vast?", "Nee. Je betaalt per maand en stopt wanneer je wilt."],
];

function WhatsAppIcoon() {
  return (
    <svg aria-hidden="true" className="vw-wa" viewBox="0 0 24 24">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2z" />
    </svg>
  );
}

function BookACall({ groot }: { groot?: boolean }) {
  return (
    <a className={`vl-knop vw-book${groot ? " vw-book--groot" : ""}`} href={WHATSAPP} rel="noopener noreferrer" target="_blank">
      <WhatsAppIcoon />
      Book a call
    </a>
  );
}

function Bel() {
  return (
    <a className="vl-knop vl-knop--stil" href={BELLEN}>
      Bel {NUMMER_LEESBAAR}
    </a>
  );
}

/** 36-second explainer under the hero; phones get the portrait version. */
function Film() {
  const [smal, setSmal] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 640px)");
    setSmal(m.matches);
    const op = () => setSmal(m.matches);
    m.addEventListener("change", op);
    return () => m.removeEventListener("change", op);
  }, []);
  const f = `nl${smal ? "-m" : ""}`;
  return (
    <figure className="vl-film" data-notranslate="">
      <video aria-label="Wat Volgo doet, in 36 seconden" autoPlay className={smal ? "is-staand" : undefined} controls key={f} loop muted playsInline poster={`/film/poster-${f}.jpg?v=2`} preload="metadata" src={`/film/uitleg-${f}.mp4?v=2`} />
    </figure>
  );
}

/** The page is written in Dutch; this is its source language for the translator. */
const BRON = "nl";

/**
 * First visit: show the page in the visitor's regional language. The Volgo consent popup (Accept) carries the
 * language picker; when that popup was already answered earlier, this small card asks instead.
 */
function TaalPopup() {
  const [open, setOpen] = useState(false);
  const [keuze, setKeuze] = useState(BRON);

  useEffect(() => {
    if (opgeslagenTaal()) return;
    let weg = false;
    const browser = (navigator.language || "").slice(0, 2).toLowerCase();
    regioTaal()
      .catch(() => ({ taal: null as string | null }))
      .then((r) => {
        if (weg) return;
        const taal = r.taal && isTaal(r.taal) ? r.taal : isTaal(browser) ? browser : BRON;
        (window as unknown as { __volgoRegioTaal?: string }).__volgoRegioTaal = taal;
        setKeuze(taal);
        if (taal !== BRON) toonTaal(taal);
        let consentAlGekozen = false;
        try {
          consentAlGekozen = Boolean(localStorage.getItem(`volgo-ok-${VOLGO_AVA_SLEUTEL}`));
        } catch {
          /* private mode */
        }
        if (consentAlGekozen) setOpen(true);
      });
    const op = (e: Event) => setKeuze((e as CustomEvent<string>).detail);
    window.addEventListener("volgo-taal", op);
    return () => {
      weg = true;
      window.removeEventListener("volgo-taal", op);
    };
  }, []);

  if (!open) return null;
  return (
    <div aria-labelledby="vw-taal-kop" className="vw-taalpop" role="dialog">
      <div className="vw-taalpop__kop">
        <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
        </svg>
        <b id="vw-taal-kop">Kies je taal</b>
      </div>
      <p>We tonen deze website in de taal van jouw regio. Je kunt het hier of bovenaan het scherm altijd aanpassen.</p>
      <div className="vw-taalpop__rij">
        <select
          aria-label="Language"
          className="vw-taalpop__select"
          data-notranslate=""
          onChange={(e) => {
            setKeuze(e.target.value);
            toonTaal(e.target.value);
          }}
          value={keuze}
        >
          {TALEN.map((t) => (
            <option key={t.code} value={t.code}>
              {t.naam}
            </option>
          ))}
        </select>
        <button
          className="vl-knop vw-taalpop__ok"
          onClick={() => {
            kiesTaal(keuze);
            setOpen(false);
          }}
          type="button"
        >
          Accepteren
        </button>
      </div>
    </div>
  );
}

/** The landing page: Volgo is an AI appointment setter inside your website. What it does, step by step, and the monthly plans. */
export function LandingPagina({ ingelogd, vast }: { ingelogd: boolean; vast?: RouteTaal }) {
  void vast;
  return (
    <div className="volgo volgo--simpel volgo--dialed vl vw" id="vd">
      <header className="vl-top">
        <a className="vl-merk" href="/">
          <VolgoMark size={22} />
          <span>Volgo</span>
        </a>
        <nav className="vl-top__rechts vw-top__rechts">
          <TaalKiezer bron={BRON} compact />
          <a className="vl-top__link" href={ingelogd ? "/dashboard" : "/login"}>
            {ingelogd ? "Dashboard" : "Inloggen"}
          </a>
        </nav>
      </header>

      <main>
        <section aria-labelledby="vl-titel" className="vl-hero vw-hero">
          <p className="vl-oog">AI-appointment setter in je website</p>
          <h1 className="vl-titel" id="vl-titel">
            Je website plant nu zelf afspraken in.
          </h1>
          <p className="vl-sub">
            Volgo praat met elke bezoeker op je website, stelt jouw vragen en zet de afspraak direct in je agenda. Daarna stuurt het de herinnering en volgt het op. 24/7, zonder dat jij iets doet.
          </p>
          <div className="vl-acties">
            <BookACall groot />
            <a className="vl-knop vl-knop--stil" href="#prijzen">
              Bekijk de prijzen
            </a>
          </div>
          <Film />
        </section>

        <section aria-labelledby="vl-wat" className="vl-sectie">
          <div className="vs-wat">
            <p className="vs-label">Wat Volgo is</p>
            <h2 className="vl-h2" id="vl-wat">
              Een appointment setter die nooit slaapt.
            </h2>
            <p className="vl-sub vl-center vl-breed">
              Een appointment setter vangt nieuwe klanten op, zoekt uit wat ze nodig hebben en plant de afspraak. Volgo doet dat met AI, in een chat op jouw website. Jij ziet alles in één simpele app en komt alleen nog op de afspraak.
            </p>
          </div>
        </section>

        <section aria-labelledby="vl-flow" className="vl-sectie">
          <h2 className="vl-h2" id="vl-flow">
            Van bezoeker tot afspraak, vanzelf
          </h2>
          <ol className="vs-flow">
            {FLOW.map(([nr, kop, tekst]) => (
              <li key={kop}>
                <span className="vs-flow__nr">{nr}</span>
                <h3>{kop}</h3>
                <p>{tekst}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="vl-zm" className="vl-sectie">
          <h2 className="vl-h2" id="vl-zm">
            Zonder Volgo, met Volgo
          </h2>
          <div className="vs-zm" role="table">
            <div className="vs-zm__kop" role="row">
              <span role="columnheader">Zonder Volgo</span>
              <span role="columnheader">Met Volgo</span>
            </div>
            {ZONDER_MET.map(([zonder, met]) => (
              <div className="vs-zm__rij" key={zonder} role="row">
                <span role="cell">{zonder}</span>
                <span role="cell">{met}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="vl-controle" className="vl-sectie">
          <h2 className="vl-h2" id="vl-controle">
            Jij houdt de controle
          </h2>
          <div className="vl-raster vw-diensten">
            {CONTROLE.map(([kop, tekst], i) => (
              <article key={kop}>
                <span className="vl-nr">{i + 1}</span>
                <h3>{kop}</h3>
                <p>{tekst}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="vl-prijs" className="vl-sectie" id="prijzen">
          <h2 className="vl-h2" id="vl-prijs">
            Prijzen per maand
          </h2>
          <p className="vl-sub vl-center">Minder dan wat een medewerker voor de telefoon kost. Excl. btw, maandelijks opzegbaar.</p>
          <div className="vl-plannen">
            {PLANNEN.map((p) => (
              <article className={`vl-plan${p.id === "pro" ? " is-uit" : ""}`} key={p.id}>
                <div className="vl-plan__kop">
                  <h3>{p.naam}</h3>
                  {p.id === "pro" ? <em>Meest gekozen</em> : null}
                </div>
                <p className="vl-plan__voor">{p.voor}</p>
                <p className="vl-plan__prijs">
                  <b>€{p.prijs}</b> <span>per maand</span>
                </p>
                <p className="vl-plan__extra">{p.extra}</p>
                {p.href ? (
                  <a className="vl-knop vl-knop--stil" href={ingelogd ? "/dashboard" : p.href}>
                    {p.knop} →
                  </a>
                ) : (
                  <BookACall />
                )}
                <ul>
                  {p.punten.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="vl-voorbeelden" className="vl-sectie">
          <h2 className="vl-h2" id="vl-voorbeelden">
            Websites met Volgo erin
          </h2>
          <p className="vl-sub vl-center vl-breed">Klik erop, open de chat rechtsonder en plan zelf een afspraak. Zo werkt het voor jouw klanten.</p>
          <div className="vw-voorbeelden">
            {VOORBEELDEN.map((v) => (
              <a className="vw-voorbeeld" href={v.href} key={v.naam} rel="noopener" target="_blank">
                <div className="vw-browser">
                  <div className="vl-kaart__kop">
                    <i />
                    <i />
                    <i />
                  </div>
                  <img alt={`Voorbeeldwebsite ${v.naam}`} loading="lazy" src={v.beeld} />
                </div>
                <div className="vw-voorbeeld__tekst">
                  <b>{v.naam}</b>
                  <span>{v.soort}</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section aria-labelledby="vl-faq" className="vl-sectie vl-faq">
          <h2 className="vl-h2" id="vl-faq">
            Vragen
          </h2>
          {FAQ.map(([v, a]) => (
            <details key={v}>
              <summary>{v}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>

        <section aria-labelledby="vl-slot" className="vl-slot">
          <h2 className="vl-h2" id="vl-slot">
            Laat je website vanavond al afspraken plannen.
          </h2>
          <p className="vl-sub">Plan een korte call, dan laten we zien hoe Volgo werkt voor jouw bedrijf.</p>
          <div className="vl-acties">
            <BookACall groot />
            <Bel />
          </div>
        </section>
      </main>
      <Footer />
      <TaalPopup />
      <Vertaler bron={BRON} />
      <AvaChat />
    </div>
  );
}

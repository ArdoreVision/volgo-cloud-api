import { useEffect, useState } from "react";

import { AvaChat, VOLGO_AVA_SLEUTEL } from "./ava-chat";
import { Footer } from "./footer";
import { VolgoMark } from "./logo";
import { type RouteTaal } from "./route-teksten";
import { TaalKiezer, Vertaler, kiesTaal, opgeslagenTaal, toonTaal } from "./taal";
import { regioTaal } from "@/lib/api/vertaal.functions";
import { INSTAGRAM_PROFIEL } from "@/lib/contact";
import { PLANS } from "@/lib/plans";
import { TALEN, isTaal } from "@/lib/talen";
import "@/volgo-dialed.css";
import "@/volgo-landing.css";


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
  ["Klanten verspreid over je mail, WhatsApp, DM's en losse appjes", "Al je warme klanten bij elkaar in één app"],
  ["Zelf uitvogelen wie wat vroeg en wie je nog moet terugbellen", "Per klant: naam, nummer, vraag en status op één plek"],
  ["Bezoekers kijken rond en gaan weg zonder iets te zeggen", "Elke bezoeker wordt meteen aangesproken en geholpen"],
  ["Aanvragen 's avonds en in het weekend blijven liggen", "24/7 antwoord, binnen een seconde"],
  ["Heen en weer bellen en mailen om een tijd te prikken", "De klant plant zelf een vrij moment in je agenda"],
  ["Mensen vergeten de afspraak", "Automatische herinnering de dag ervoor"],
  ["Wie niet boekt, hoor je nooit meer", "Volgo volgt automatisch op na 1 en 3 dagen"],
];

const CONTROLE: [string, string][] = [
  ["Alles in één app", "Geen gezoek meer in je mail of tussen al je appjes. Gesprekken, aanvragen en afspraken met naam, nummer en adres staan op één plek, op je telefoon en computer."],
  ["Meldingen op je telefoon", "Je weet het meteen als iemand chat of een afspraak boekt."],
  ["Zelf overnemen", "Lees elk gesprek live mee en neem het met één tik over."],
  ["Jouw stijl", "Kies de naam, foto, kleur en de vragen van je assistent."],
];

/** Monthly plans: exactly what Volgo does in each. Prices excl. VAT. */
const PLANNEN = [
  {
    id: "pro",
    naam: "Website + Volgo",
    voor: "Eén pakket: een nieuwe premium website met de Volgo-chatassistent erin.",
    prijs: "299",
    extra: "De eerste 3 maanden · daarna €499 per maand · geen opstartkosten",
    knop: "Book a call",
    href: "",
    punten: [
      "Chatassistent op je website, 24/7",
      "Al je warme klanten bij elkaar in één app",
      "Stelt jouw vragen en plant afspraken direct in je agenda",
      "Herinnering de dag voor de afspraak en opvolging als iemand niet boekte",
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
  ["Wat is Volgo precies?", "Volgo is een chatassistent op je website. Hij praat met elke bezoeker, stelt jouw vragen en plant de afspraak. Elke warme klant komt daarna in één app terecht, met naam, nummer en wat ze willen. Je hoeft niks meer uit te vogelen in je mail of tussen al je appjes."],
  ["Wat kost het?", "De eerste 3 maanden €299 per maand, daarna €499 per maand. Je krijgt een nieuwe premium website, gebouwd door ons team, met de Volgo-chatassistent erin. Plus de app waarin al je warme klanten bij elkaar staan. Geen opstartkosten, maandelijks opzegbaar. Buiten Europa is het $299 en daarna $499 per maand."],
  ["Moet ik technisch zijn?", "Nee. Je plakt één regel code in je website (stappen voor WordPress, Wix, Squarespace, Shopify en Webflow), of wij doen het voor je."],
  ["Werkt het ook met WhatsApp en telefoon?", "Knoppen om je te WhatsAppen of te bellen werken meteen. WhatsApp-berichten en gemiste oproepen automatisch in Volgo ontvangen kan via een koppeling die wij regelen."],
  ["Kan ik zien hoe het werkt?", "Ja. Open de chat rechtsonder op deze pagina: dat is Volgo. Vraag iets of plan een afspraak, precies zoals jouw klanten het straks doen."],
  ["Zit ik ergens aan vast?", "Nee. Je betaalt per maand en stopt wanneer je wilt."],
];

function InstagramIcoon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
      <rect height="18" rx="5" width="18" x="3" y="3" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" fill="currentColor" r="0.6" stroke="none" />
    </svg>
  );
}

/** Every "Book a call" goes to Volgo's Instagram page (@thevolgo.app). */
function BookACall({ groot }: { groot?: boolean }) {
  return (
    <a className={`vl-knop vw-book${groot ? " vw-book--groot" : ""}`} href={INSTAGRAM_PROFIEL} rel="noopener noreferrer" target="_blank">
      <InstagramIcoon />
      Book a call
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
          <p className="vl-oog">De chatassistent in je website</p>
          <h1 className="vl-titel" id="vl-titel">
            Al je warme klanten in één app.
          </h1>
          <p className="vl-sub">
            Volgo is een chatassistent op je website. Hij praat met elke bezoeker, stelt jouw vragen en plant de afspraak. Daarna staat elke klant in één app, met naam, nummer en wat ze willen. Geen gezoek meer in je mail of tussen al je appjes. Website + Volgo voor €299 per maand, de eerste 3 maanden.
          </p>
          <div className="vl-acties">
            <BookACall groot />
            <a className="vl-knop vl-knop--stil" href="#prijzen">
              Bekijk de prijzen
            </a>
          </div>
          <Film />
        </section>

        <section aria-labelledby="vl-voorbeeld" className="vl-sectie">
          <p className="vs-label vs-label--midden">Zo ziet het eruit</p>
          <h2 className="vl-h2" id="vl-voorbeeld">
            Links je klant. Rechts jij.
          </h2>
          <p className="vl-sub vl-center vl-breed">Een echt gesprek op je website, en wat jij daarna op je telefoon krijgt. Jij hebt niks gedaan.</p>
          <div className="vs-duo">
            <div className="vs-scherm">
              <div className="vs-scherm__kop">
                <span className="vs-dot" /> Op jouw website · 22:14
              </div>
              <div className="vs-chat">
                <p className="vs-b vs-b--klant">Hoi, wat kost een nieuwe schutting ongeveer?</p>
                <p className="vs-b">Dat hangt af van de lengte en het materiaal. Hoeveel meter ongeveer, en in welke plaats?</p>
                <p className="vs-b vs-b--klant">Zo'n 12 meter, in Goes.</p>
                <p className="vs-b">Dank je! Dan komen we graag langs om het op te meten. Wanneer komt het jou uit?</p>
                <div className="vs-tijden">
                  <span>Di 10:00</span>
                  <span className="is-aan">Wo 14:00</span>
                  <span>Do 09:00</span>
                </div>
                <p className="vs-b vs-b--klant">Woensdag 14:00. Ik ben Anna, 06 1234 5678.</p>
                <p className="vs-geboekt">✓ Afspraak gepland: woensdag 14:00</p>
              </div>
            </div>
            <div className="vs-pijl" aria-hidden="true">→</div>
            <div className="vs-scherm vs-scherm--app">
              <div className="vs-melding">
                <small>VOLGO · nu</small>
                <b>Nieuwe afspraak: Anna</b>
                <span>Langskomen · woensdag 14:00</span>
              </div>
              <div className="vs-afspraak">
                <p className="vs-afspraak__kop">In je agenda</p>
                <b>Langskomen · Anna</b>
                <span>Woensdag 14:00 – 15:00</span>
                <dl>
                  <dt>Telefoon</dt>
                  <dd>06 1234 5678</dd>
                  <dt>Plaats</dt>
                  <dd>Goes</dd>
                  <dt>Vraag</dt>
                  <dd>Nieuwe schutting, ±12 meter</dd>
                </dl>
                <div className="vs-afspraak__knoppen">
                  <span>Bellen</span>
                  <span>WhatsApp</span>
                </div>
              </div>
              <ul className="vs-straks">
                <li>Dinsdag: Volgo stuurt Anna een herinnering</li>
                <li>Na de afspraak: Volgo vraagt om een review</li>
              </ul>
            </div>
          </div>
          <p className="vl-klein vs-probeer">Wil je het zelf zien? Open de chat rechtsonder op deze pagina. Dat is Volgo.</p>
        </section>

        <section aria-labelledby="vl-wat" className="vl-sectie">
          <div className="vs-wat">
            <p className="vs-label">Wat Volgo is</p>
            <h2 className="vl-h2" id="vl-wat">
              Een chatassistent die je klanten voor je verzamelt.
            </h2>
            <p className="vl-sub vl-center vl-breed">
              Nu zitten je klanten overal: in je mail, op WhatsApp, in DM's, in losse appjes. Jij moet uitvogelen wie wat vroeg en wie je nog moet terugbellen. Volgo vangt elke bezoeker op je website op met een chat, vraagt wat ze nodig hebben en plant de afspraak. Elke warme klant staat daarna bij elkaar in één app. Jij opent die app en weet meteen wie je moet helpen.
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
            Het aanbod
          </h2>
          <p className="vl-sub vl-center">Eén pakket: website + Volgo. Startaanbod: €299 per maand voor de eerste 3 maanden, daarna €499 per maand ($299 en $499 buiten Europa). Excl. btw, geen opstartkosten, maandelijks opzegbaar.</p>
          <div className="vl-plannen">
            {PLANNEN.map((p) => (
              <article className={`vl-plan${p.id === "pro" ? " is-uit" : ""}`} key={p.id}>
                <div className="vl-plan__kop">
                  <h3>{p.naam}</h3>
                  {null}
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

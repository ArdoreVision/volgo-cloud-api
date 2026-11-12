import { useEffect, useState } from "react";

import { AvaChat, VOLGO_AVA_SLEUTEL } from "./ava-chat";
import { Footer } from "./footer";
import { VolgoMark } from "./logo";
import { type RouteTaal } from "./route-teksten";
import { TaalKiezer, Vertaler, kiesTaal, opgeslagenTaal, toonTaal } from "./taal";
import { regioTaal } from "@/lib/api/vertaal.functions";
import { startBetaling } from "@/lib/api/account.functions";
import { PLANS } from "@/lib/plans";
import { TALEN, isTaal } from "@/lib/talen";
import "@/volgo-dialed.css";
import "@/volgo-landing.css";


/** What Volgo does, step by step, in one conversation (like a human appointment setter would). */
const FLOW: [string, string, string][] = [
  ["1", "Begroet", "Elke bezoeker van je website krijgt binnen een seconde antwoord. Ook om 23:00, als jij offline bent."],
  ["2", "Stelt jouw vragen", "Wat is je doel, waar loop je op vast, wanneer wil je starten? Volgo vraagt wat jij wilt weten voor een call."],
  ["3", "Beantwoordt twijfels", "Hoe werkt je traject, voor wie is het, hoe lang duurt het: Volgo antwoordt met de info van jouw coaching."],
  ["4", "Plant de call", "De lead kiest zelf een vrij moment. Het staat direct in je agenda, nooit dubbel geboekt."],
  ["5", "Herinnert", "Een dag van tevoren krijgt de lead een herinnering. Minder no-shows."],
  ["6", "Volgt op", "Niet geboekt? Na 1 en 3 dagen een persoonlijk bericht. Na de call een reviewverzoek."],
];

const ZONDER_MET: [string, string][] = [
  ["Leads verspreid over je DM's, mail, WhatsApp en losse notities", "Al je warme leads bij elkaar in één app"],
  ["Zelf uitzoeken wie wat vroeg en wie je nog moet opvolgen", "Per lead: naam, nummer, doel en status op één plek"],
  ["Bezoekers lezen je pagina en gaan weg zonder iets te zeggen", "Elke bezoeker wordt meteen aangesproken en geholpen"],
  ["Vragen 's avonds en in het weekend blijven liggen", "24/7 antwoord, binnen een seconde"],
  ["Heen en weer appen om een moment voor de call te vinden", "De lead plant zelf een vrij moment in je agenda"],
  ["Mensen komen niet opdagen op de call", "Automatische herinnering de dag ervoor"],
  ["Wie niet boekt, hoor je nooit meer", "Volgo volgt automatisch op na 1 en 3 dagen"],
];

const CONTROLE: [string, string][] = [
  ["Alles in één app", "Geen gezoek meer in je DM's, mail of appjes. Gesprekken, aanvragen en calls met naam, nummer en doel staan op één plek, op je telefoon en computer."],
  ["Meldingen op je telefoon", "Je weet het meteen als iemand chat of een call boekt."],
  ["Zelf overnemen", "Lees elk gesprek live mee en neem het met één tik over."],
  ["Jouw stijl", "Kies de naam, foto, kleur en de vragen van je assistent, passend bij jouw merk."],
];

/** Monthly plans: exactly what Volgo does in each. Prices excl. VAT. */
const PLANNEN = [
  {
    id: "pro",
    naam: "Website + Volgo",
    voor: "Eén pakket voor coaches: een nieuwe premium website met de Volgo-chatassistent erin.",
    prijs: "299",
    extra: "De eerste 3 maanden · daarna €499 per maand · geen opstartkosten",
    punten: [
      "Chatassistent op je website, 24/7",
      "Al je warme leads bij elkaar in één app",
      "Stelt jouw intakevragen en plant calls direct in je agenda",
      "Herinnering de dag voor de call en opvolging als iemand niet boekte",
      "Nieuwe coachingwebsite op maat, gebouwd door ons team",
      "Foto's, video en animaties met AI",
      "Eigen foto en stijl voor je assistent, zonder Volgo-logo",
      "Aanpassingen aan je website wanneer je wilt",
      "Live binnen 24 uur na akkoord",
    ],
  },
] as const;

const VOORBEELDEN = [
  { naam: "Badkamerstudio Noordzee", soort: "Voorbeeld uit een andere branche · website met Volgo erin", href: "/voorbeeld/badkamer.html", beeld: "/voorbeeld/badkamer.jpg" },
  { naam: "Bluebonnet Build Co.", soort: "Voorbeeld uit een andere branche · website met Volgo erin", href: "/voorbeeld/contractor.html", beeld: "/voorbeeld/contractor.jpg" },
];

const FAQ: [string, string][] = [
  ["Voor wie is Volgo?", "Voor online coaches: fitness, business, mindset, lifestyle. Je krijgt leads via je content en verkoopt via een call. Volgo zorgt dat die calls geboekt worden en dat geen lead meer kwijtraakt."],
  ["Wat is Volgo precies?", "Een chatassistent op je website. Hij praat met elke bezoeker, stelt jouw intakevragen en plant de call. Elke warme lead komt daarna in één app terecht, met naam, nummer en doel. Je hoeft niks meer uit te zoeken in je DM's, mail of appjes."],
  ["Vervangt Volgo mijn setter?", "Volgo doet op je website wat een setter doet: antwoorden, vragen stellen, de call inplannen, herinneren en opvolgen. De call zelf en het sluiten doe jij."],
  ["Beantwoordt Volgo ook mijn Instagram-DM's?", "Nee. Volgo werkt op je website. Zet de link naar je website in je bio en stuur leads uit je DM's daarheen: daar neemt Volgo het over en plant de call."],
  ["Wat kost het?", "De eerste 3 maanden €299 per maand, daarna €499 per maand. Je krijgt een nieuwe premium website, gebouwd door ons team, met de Volgo-chatassistent erin. Plus de app waarin al je warme leads bij elkaar staan. Geen opstartkosten, maandelijks opzegbaar."],
  ["Hoe begin ik?", "Klik op de knop en betaal veilig via Stripe. Daarna maak je je account en opent je dashboard meteen. Daar beantwoord je vijf korte vragen over je coaching en zie je stap voor stap hoe alles wordt aangezet. Je website bouwen wij voor je."],
  ["Moet ik technisch zijn?", "Nee. Wij bouwen je website en zetten Volgo erin. Heb je al een website, dan plak je één regel code of doen wij het voor je."],
  ["Kan ik zien hoe het werkt?", "Ja. Open de chat rechtsonder op deze pagina: dat is Volgo. Vraag iets of plan een call, precies zoals jouw leads het straks doen."],
  ["Zit ik ergens aan vast?", "Nee. Je betaalt per maand en stopt wanneer je wilt."],
];

/**
 * The one button on the page: straight to the secure Stripe payment page for the package.
 * If Stripe can't be opened, the visitor lands on the pricing page instead, so the button never dead-ends.
 */
function StartKnop({ groot, ingelogd }: { groot?: boolean; ingelogd: boolean }) {
  const [bezig, setBezig] = useState(false);
  if (ingelogd)
    return (
      <a className={`vl-knop vw-book${groot ? " vw-book--groot" : ""}`} href="/dashboard">
        Naar je dashboard →
      </a>
    );
  async function start() {
    setBezig(true);
    try {
      const r = await startBetaling({ data: { plan: "pro" } });
      window.location.href = r.ok ? r.url : "/pricing";
    } catch {
      window.location.href = "/pricing";
    }
  }
  return (
    <button className={`vl-knop vw-book${groot ? " vw-book--groot" : ""}`} data-notranslate="" disabled={bezig} onClick={() => void start()} type="button">
      {bezig ? "One moment…" : "Start organizing your leads →"}
    </button>
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

/** The landing page, written for online coaches: Volgo is an AI appointment setter inside your website. What it does, step by step, and the monthly plans. */
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
          <p className="vl-oog">Voor online coaches</p>
          <h1 className="vl-titel" id="vl-titel">
            Al je warme leads in één app. Je website boekt de calls.
          </h1>
          <p className="vl-sub">
            Volgo is een chatassistent op je coachingwebsite. Hij praat met elke bezoeker, stelt jouw intakevragen en plant de call in je agenda. Daarna staat elke lead in één app, met naam, nummer en doel. Geen gezoek meer in je DM's, mail en appjes. Website + Volgo voor €299 per maand, de eerste 3 maanden.
          </p>
          <div className="vl-acties">
            <StartKnop groot ingelogd={ingelogd} />
          </div>
          <p className="vl-klein">Veilig betalen via Stripe · daarna maak je je account en opent je dashboard meteen · maandelijks opzegbaar</p>
          <Film />
        </section>

        <section aria-labelledby="vl-voorbeeld" className="vl-sectie">
          <p className="vs-label vs-label--midden">Zo ziet het eruit</p>
          <h2 className="vl-h2" id="vl-voorbeeld">
            Links je lead. Rechts jij.
          </h2>
          <p className="vl-sub vl-center vl-breed">Een echt gesprek op je website, en wat jij daarna op je telefoon krijgt. Jij hebt niks gedaan.</p>
          <div className="vs-duo">
            <div className="vs-scherm">
              <div className="vs-scherm__kop">
                <span className="vs-dot" /> Op jouw website · 23:07
              </div>
              <div className="vs-chat">
                <p className="vs-b vs-b--klant">Hoi, ik wil 10 kilo afvallen. Past jouw coaching bij mij?</p>
                <p className="vs-b">Goed dat je er bent! Wat heb je al geprobeerd, en wanneer zou je willen starten?</p>
                <p className="vs-b vs-b--klant">Van alles, maar ik hou het niet vol. Het liefst deze maand nog.</p>
                <p className="vs-b">Dat hoor ik vaker, en juist daar helpt het traject bij. Zullen we een gratis kennismakingscall plannen? Wanneer komt het jou uit?</p>
                <div className="vs-tijden">
                  <span>Di 10:00</span>
                  <span className="is-aan">Wo 14:00</span>
                  <span>Do 09:00</span>
                </div>
                <p className="vs-b vs-b--klant">Woensdag 14:00. Ik ben Anna, 06 1234 5678.</p>
                <p className="vs-geboekt">✓ Call gepland: woensdag 14:00</p>
              </div>
            </div>
            <div className="vs-pijl" aria-hidden="true">→</div>
            <div className="vs-scherm vs-scherm--app">
              <div className="vs-melding">
                <small>VOLGO · nu</small>
                <b>Nieuwe call: Anna</b>
                <span>Kennismaking · woensdag 14:00</span>
              </div>
              <div className="vs-afspraak">
                <p className="vs-afspraak__kop">In je agenda</p>
                <b>Kennismakingscall · Anna</b>
                <span>Woensdag 14:00 – 14:30</span>
                <dl>
                  <dt>Telefoon</dt>
                  <dd>06 1234 5678</dd>
                  <dt>Doel</dt>
                  <dd>10 kilo afvallen</dd>
                  <dt>Start</dt>
                  <dd>Deze maand</dd>
                </dl>
                <div className="vs-afspraak__knoppen">
                  <span>Bellen</span>
                  <span>WhatsApp</span>
                </div>
              </div>
              <ul className="vs-straks">
                <li>Dinsdag: Volgo stuurt Anna een herinnering</li>
                <li>Na de call: Volgo vraagt om een review</li>
              </ul>
            </div>
          </div>
          <p className="vl-klein vs-probeer">Dit is een voorbeeldgesprek. Wil je het zelf zien? Open de chat rechtsonder op deze pagina. Dat is Volgo.</p>
        </section>

        <section aria-labelledby="vl-wat" className="vl-sectie">
          <div className="vs-wat">
            <p className="vs-label">Wat Volgo is</p>
            <h2 className="vl-h2" id="vl-wat">
              Een chatassistent die je leads verzamelt en je calls boekt.
            </h2>
            <p className="vl-sub vl-center vl-breed">
              Nu zitten je leads overal: in je DM's, in je mail, op WhatsApp, in losse notities. Jij moet uitzoeken wie wat vroeg en wie je nog moet opvolgen. Dat kost uren die je liever aan je klanten besteedt. Volgo vangt elke bezoeker op je website op met een chat, stelt je intakevragen en plant de call. Elke warme lead staat daarna bij elkaar in één app. Jij opent die app en weet meteen met wie je gaat bellen.
            </p>
          </div>
        </section>

        <section aria-labelledby="vl-flow" className="vl-sectie">
          <h2 className="vl-h2" id="vl-flow">
            Van bezoeker tot geboekte call, vanzelf
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
          <p className="vl-sub vl-center">Eén pakket voor coaches: website + Volgo. Startaanbod: €299 per maand voor de eerste 3 maanden, daarna €499 per maand. Excl. btw, geen opstartkosten, maandelijks opzegbaar.</p>
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
                <StartKnop ingelogd={ingelogd} />
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
            Zo werkt Volgo op een website
          </h2>
          <p className="vl-sub vl-center vl-breed">Twee voorbeelden uit een andere branche. Klik erop, open de chat rechtsonder en plan zelf een afspraak. Op jouw coachingwebsite werkt het precies zo.</p>
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
            Laat je website vanavond al calls boeken.
          </h2>
          <p className="vl-sub">Betaal veilig via Stripe en maak je account. Je dashboard staat direct voor je klaar.</p>
          <div className="vl-acties">
            <StartKnop groot ingelogd={ingelogd} />
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

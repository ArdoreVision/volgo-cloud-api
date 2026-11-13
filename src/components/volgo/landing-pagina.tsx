import { useEffect, useState } from "react";

import { AvaChat, VOLGO_AVA_SLEUTEL } from "./ava-chat";
import { Footer } from "./footer";
import { VolgoMark } from "./logo";
import { type RouteTaal } from "./route-teksten";
import { TaalKiezer, Vertaler, kiesTaal, opgeslagenTaal, toonTaal } from "./taal";
import { startBetaling } from "@/lib/api/account.functions";
import { regioTaal } from "@/lib/api/vertaal.functions";
import { type PlanId } from "@/lib/plans";
import { TALEN, isTaal } from "@/lib/talen";
import "@/volgo-dialed.css";
import "@/volgo-landing.css";

/**
 * The two packages, in the order of the page: Start -> Website -> 3D website. Both include the same Volgo for the same monthly price.
 * The example images are AI-made examples of fictional businesses (made with Higgsfield), labelled as examples on the page.
 */
const PAKKETTEN: { plan: PlanId; soort: string; nr: string; naam: string; regel: string; prijs: string; beeld: string; alt: string; adres: string; bij: string; punten: string[]; knop: string; vandaag: string }[] = [
  {
    plan: "pro",
    soort: "gewoon",
    nr: "Pakket 1",
    naam: "Website",
    regel: "Een professionele website. Strak, modern en op maat gemaakt.",
    prijs: "€997",
    beeld: "/assets/volgo/voorbeeld-website.jpg",
    alt: "Voorbeeld van een professionele website voor een hovenier: grote foto van een tuin, een knop om een afspraak te plannen en de chat van Volgo rechtsonder",
    adres: "jouwbedrijf.nl",
    bij: "Voorbeeld: zo kan jouw professionele website eruitzien.",
    punten: ["Professionele website op maat", "Met foto's en video", "Volgo erin: plant je afspraken, 24/7", "Aanpassingen wanneer je ze nodig hebt"],
    knop: "Kies Website",
    vandaag: "Vandaag €1.046,99: je website + de eerste maand Volgo. Excl. btw.",
  },
  {
    plan: "premium",
    soort: "3d",
    nr: "Pakket 2",
    naam: "3D website",
    regel: "Een 3D-website die blijft hangen. Beelden die bewegen terwijl je scrolt.",
    prijs: "€1997",
    beeld: "/assets/volgo/voorbeeld-3d.jpg",
    alt: "Voorbeeld van een 3D-website voor een bouwbedrijf: een huis in 3D dat in beeld zweeft, een knop om een afspraak te plannen en de chat van Volgo rechtsonder",
    adres: "jouwbedrijf.nl",
    bij: "Voorbeeld: zo kan jouw 3D-website eruitzien.",
    punten: ["Alles uit pakket Website", "3D-beelden die bewegen als je scrolt", "Scroll-animaties door de hele site", "Volgo erin: plant je afspraken, 24/7"],
    knop: "Kies 3D website",
    vandaag: "Vandaag €2.046,99: je website + de eerste maand Volgo. Excl. btw.",
  },
];

const ZONDER = ["Aanvragen die verdwijnen", "Uren in je mail en appjes", "Zoeken wie wat vroeg", "No-shows", "Vergeten op te volgen"];
const MET = ["Elke bezoeker direct geholpen", "Afspraken staan vanzelf in je agenda", "Alles in één app", "Herinnering de dag ervoor", "Opvolging na 1 en 3 dagen"];

const FAQ: [string, string][] = [
  ["Voor wie is dit?", "Voor elk bedrijf dat klanten krijgt via aanvragen en afspraken. Van coaches en salons tot hoveniers, verbouwers en praktijken."],
  ["Wat is het verschil tussen Website en 3D website?", "Website is een professionele website op maat. De 3D website heeft daar bovenop 3D-beelden en scroll-animaties. In allebei zit Volgo."],
  ["Wat doet Volgo precies?", "Volgo is de assistent in je website. Hij antwoordt elke bezoeker, stelt jouw vragen en plant de afspraak. Elke klant staat daarna in één app."],
  ["Wat kost het?", "Website: €997 eenmalig. 3D website: €1997 eenmalig. Volgo zit er altijd in, voor €49,99 per maand. Excl. btw, Volgo is maandelijks opzegbaar. Je domeinnaam zit er niet bij."],
  ["Werkt het in mijn Instagram-DM's?", "Nee. Volgo werkt op je website. Zet je website in je bio en stuur mensen daarheen: daar neemt Volgo het over."],
  ["Wat gebeurt er na betalen?", "Je maakt je account, beantwoordt vijf korte vragen en je dashboard is open. Wij bouwen je website met Volgo erin."],
];

/** The Start button: takes the visitor down to the two packages. Logged-in customers go to their dashboard instead. */
function StartKnop({ ingelogd }: { ingelogd: boolean }) {
  return (
    <a className="vc-cta" href={ingelogd ? "/dashboard" : "#pakketten"}>
      <span>{ingelogd ? "Naar je dashboard" : "Start"}</span>
      <i aria-hidden="true">{ingelogd ? "→" : "↓"}</i>
    </a>
  );
}

/**
 * The button on a package: straight to the secure Stripe payment page for that package.
 * If Stripe can't be opened, the visitor lands on the pricing page instead, so the button never dead-ends.
 */
function KiesKnop({ ingelogd, plan, tekst }: { ingelogd: boolean; plan: PlanId; tekst: string }) {
  const [bezig, setBezig] = useState(false);
  if (ingelogd)
    return (
      <a className="vc-cta" href="/dashboard">
        <span>Naar je dashboard</span>
        <i aria-hidden="true">→</i>
      </a>
    );
  async function start() {
    setBezig(true);
    try {
      const r = await startBetaling({ data: { plan } });
      window.location.href = r.ok ? r.url : "/pricing";
    } catch {
      window.location.href = "/pricing";
    }
  }
  return (
    <button className="vc-cta" disabled={bezig} onClick={() => void start()} type="button">
      <span>{bezig ? "Een moment…" : tekst}</span>
      <i aria-hidden="true">→</i>
    </button>
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


/** Elements with data-rv fade and slide in when they scroll into view. Without JavaScript everything is simply visible. */
function useOnthul() {
  useEffect(() => {
    const root = document.getElementById("vd");
    if (!root || !("IntersectionObserver" in window)) return;
    root.classList.add("vc-js");
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) e.target.classList.add("is-in");
      },
      { threshold: 0.25 },
    );
    root.querySelectorAll("[data-rv]").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove("vc-js");
    };
  }, []);
}

/** The general landing page, for any business: Start, then the two packages (Website and 3D website) with an example of each, then what Volgo does. */
export function LandingPagina({ ingelogd, vast }: { ingelogd: boolean; vast?: RouteTaal }) {
  void vast;
  useOnthul();
  return (
    <div className="volgo volgo--simpel volgo--dialed vl vw vc" id="vd">
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
        <section aria-labelledby="vc-titel" className="vc-hero">
          <p className="vc-oog">Website laten maken · met Volgo erin</p>
          <h1 className="vc-titel" id="vc-titel">
            Jouw website.
            <br />
            <em>Met Volgo erin.</em>
          </h1>
          <p className="vc-sub">Wij bouwen je website. Volgo plant je afspraken. Vanzelf.</p>
          <StartKnop ingelogd={ingelogd} />
          <p className="vc-klein">Website €997 · 3D website €1997 · Volgo altijd inbegrepen, €49,99 p/m</p>
          <p aria-hidden="true" className="vc-scroll">
            ↓
          </p>
        </section>

        <section aria-labelledby="vc-pakketten" className="vc-pakketten" id="pakketten">
          <h2 className="vc-h2" data-rv="" id="vc-pakketten">
            Kies je <em>website.</em>
          </h2>
          <p className="vc-sub vc-sub--midden" data-rv="">
            Eén keer betalen voor je website. Volgo zit er altijd in.
          </p>
          {PAKKETTEN.map((p, i) => (
            <article aria-labelledby={`vc-pakket-${p.plan}`} className={`vc-pakket vc-pakket--${p.soort}${i % 2 ? " vc-pakket--om" : ""}`} id={i === 0 ? "prijzen" : undefined} key={p.plan}>
              <figure className="vc-venster" data-rv="">
                <div aria-hidden="true" className="vc-venster__balk">
                  <i />
                  <i />
                  <i />
                  <span>{p.adres}</span>
                </div>
                <img alt={p.alt} decoding="async" height={752} loading="lazy" src={p.beeld} width={1344} />
                <figcaption>{p.bij}</figcaption>
              </figure>
              <div className="vc-pakket__tekst" data-rv="">
                <p className="vc-oog">{p.nr}</p>
                <h3 id={`vc-pakket-${p.plan}`}>{p.naam}</h3>
                <p className="vc-pakket__regel">{p.regel}</p>
                <p className="vc-pakket__prijs">
                  <b>{p.prijs}</b> <span>eenmalig</span>
                </p>
                <p className="vc-volgo-rij">
                  <span>Volgo inbegrepen</span> <span>€49,99 p/m</span>
                </p>
                <ul>
                  {p.punten.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <KiesKnop ingelogd={ingelogd} plan={p.plan} tekst={p.knop} />
                <p className="vc-klein">{p.vandaag} Veilig betalen via Stripe.</p>
              </div>
            </article>
          ))}
        </section>

        <section aria-labelledby="vc-bouw" className="vc-bouw">
          <h2 className="vc-h2" data-rv="" id="vc-bouw">
            Volgo zit er
            <br />
            <em>altijd in.</em>
          </h2>
          <p className="vc-sub vc-sub--midden" data-rv="">
            De assistent in je website. Hij antwoordt elke bezoeker en plant de afspraak. €49,99 per maand, bij elk pakket.
          </p>
          <div aria-hidden="true" className="vc-anim" data-rv="">
            <div className="vc-site">
              <div className="vc-site__balk">
                <i />
                <i />
                <i />
                <span>jouwbedrijf.nl</span>
              </div>
              <div className="vc-site__blok vc-site__blok--kop" />
              <div className="vc-site__blok" />
              <div className="vc-site__blok vc-site__blok--kort" />
              <div className="vc-site__chat">
                <p className="is-lead">Kunnen jullie mij helpen?</p>
                <p>Zeker. Wat heb je nodig? Dan plan ik een afspraak.</p>
                <p className="is-ok">✓ Afspraak: woensdag 14:00</p>
              </div>
            </div>
            <div className="vc-lijn">
              <i />
              <i />
              <i />
            </div>
            <div className="vc-app">
              <div className="vc-app__kop">Volgo · je klanten</div>
              <div className="vc-lead">
                <b>Anna</b>
                <span>Offerte aangevraagd · afspraak wo 14:00</span>
              </div>
              <div className="vc-lead">
                <b>Mark</b>
                <span>Kennismaking · afspraak do 09:30</span>
              </div>
              <div className="vc-lead">
                <b>Sara</b>
                <span>Vraag over prijs · opvolging morgen</span>
              </div>
            </div>
          </div>
          <ol className="vc-drie" data-rv="">
            <li>
              <b>1</b> Wij bouwen je website
            </li>
            <li>
              <b>2</b> Je klanten landen daar
            </li>
            <li>
              <b>3</b> Geen één vergeten
            </li>
          </ol>
        </section>

        <section aria-labelledby="vc-zm" className="vc-zm">
          <h2 className="vc-h2" data-rv="" id="vc-zm">
            Zonder. <em>Met.</em>
          </h2>
          <div className="vc-zm__grid">
            <ul className="vc-zm__zonder" data-rv="">
              <li className="vc-zm__kop">Zonder Volgo</li>
              {ZONDER.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <ul className="vc-zm__met" data-rv="">
              <li className="vc-zm__kop">Met Volgo</li>
              {MET.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
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

        <section aria-labelledby="vc-slot" className="vc-slot">
          <h2 className="vc-titel" data-rv="" id="vc-slot">
            Jij werkt.
            <br />
            <em>Volgo plant.</em>
          </h2>
          <StartKnop ingelogd={ingelogd} />
          <p className="vc-klein">Liever eerst zien? Open de chat rechtsonder. Dat is Volgo.</p>
        </section>
      </main>
      <Footer />
      <TaalPopup />
      <Vertaler bron={BRON} />
      <AvaChat />
    </div>
  );
}

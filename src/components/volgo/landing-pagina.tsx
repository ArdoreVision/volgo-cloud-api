import { useEffect, useState } from "react";

import { AvaChat, VOLGO_AVA_SLEUTEL } from "./ava-chat";
import { Footer } from "./footer";
import { VolgoMark } from "./logo";
import { type RouteTaal } from "./route-teksten";
import { TaalKiezer, Vertaler, kiesTaal, opgeslagenTaal, toonTaal } from "./taal";
import { startBetaling } from "@/lib/api/account.functions";
import { regioTaal } from "@/lib/api/vertaal.functions";
import { TALEN, isTaal } from "@/lib/talen";
import "@/volgo-dialed.css";
import "@/volgo-landing.css";

/**
 * Five pains of an online fitness coach, one per screen while scrolling: how it is now, and how it is with Volgo.
 * Every "with Volgo" line is something the product really does (website chat, intake questions, calendar, reminder, follow-up).
 */
const PIJN: { nu: string[]; met: string; hoe: string }[] = [
  { nu: ["Lead om 23:07.", "Jij antwoordt om 13:40.", "Weg."], met: "Antwoord in 1 seconde.", hoe: "Volgo antwoordt elke bezoeker van je website. Dag en nacht." },
  { nu: ["DM's. Mail. WhatsApp.", "Waar stond die lead?"], met: "Alles in één app.", hoe: "Naam, nummer en doel van elke lead. Op één plek." },
  { nu: ["Een setter is duur.", "En slaapt."], met: "Je website boekt de calls.", hoe: "Volgo stelt jouw intakevragen en zet de call in je agenda." },
  { nu: ["Call gepland.", "Niemand komt."], met: "Herinnering. Automatisch.", hoe: "De dag ervoor krijgt je lead een bericht." },
  { nu: ["\"Ik denk er nog even over na.\"", "Nooit meer iets gehoord."], met: "Opvolging. Vanzelf.", hoe: "Niet geboekt? Na 1 en 3 dagen een persoonlijk bericht." },
];

const ZONDER = ["Leads die verdwijnen", "Uren in je DM's", "Zoeken wie wat vroeg", "No-shows", "Vergeten op te volgen"];
const MET = ["Elke lead direct geholpen", "Calls staan vanzelf in je agenda", "Alles in één app", "Herinnering de dag ervoor", "Opvolging na 1 en 3 dagen"];

const KRIJGT = ["Nieuwe website, door ons gebouwd", "Assistent erin die je calls boekt, 24/7", "Eén app met al je warme leads", "Herinneringen en opvolging, automatisch"];

const FAQ: [string, string][] = [
  ["Voor wie is dit?", "Voor online coaches, vooral fitness coaches, die leads via content krijgen en verkopen via een call."],
  ["Wat doet Volgo precies?", "Een chatassistent op je website. Hij antwoordt elke bezoeker, stelt jouw intakevragen en plant de call. Elke lead staat daarna in één app."],
  ["Werkt het in mijn Instagram-DM's?", "Nee. Volgo werkt op je website. Zet je website in je bio en stuur leads daarheen: daar neemt Volgo het over."],
  ["Wat kost het?", "€299 per maand voor de eerste 3 maanden, daarna €499 per maand. Excl. btw, geen opstartkosten, maandelijks opzegbaar. Je domeinnaam zit er niet bij."],
  ["Wat gebeurt er na betalen?", "Je maakt je account, beantwoordt vijf korte vragen en je dashboard is open. Wij bouwen je website met Volgo erin."],
];

/**
 * The one button on the page: straight to the secure Stripe payment page for the package.
 * If Stripe can't be opened, the visitor lands on the pricing page instead, so the button never dead-ends.
 */
function StartKnop({ ingelogd }: { ingelogd: boolean }) {
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
      const r = await startBetaling({ data: { plan: "pro" } });
      window.location.href = r.ok ? r.url : "/pricing";
    } catch {
      window.location.href = "/pricing";
    }
  }
  return (
    <button className="vc-cta" data-notranslate="" disabled={bezig} onClick={() => void start()} type="button">
      <span>{bezig ? "One moment…" : "Start organizing your leads"}</span>
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

/** The landing page for online fitness coaches: one pain per screen, few words, one button to the payment page. */
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
          <p className="vc-oog">Voor fitness coaches</p>
          <h1 className="vc-titel" id="vc-titel">
            Je verliest leads
            <br />
            <em>terwijl je traint.</em>
          </h1>
          <p className="vc-sub">Volgo vangt ze op en boekt de call. Vanzelf.</p>
          <StartKnop ingelogd={ingelogd} />
          <p className="vc-klein">Website + Volgo · €299 per maand, eerste 3 maanden · maandelijks opzegbaar</p>
          <p aria-hidden="true" className="vc-scroll">
            ↓
          </p>
        </section>

        {PIJN.map((p, i) => (
          <section aria-label={`Probleem ${i + 1}`} className="vc-pijn" key={p.met}>
            <p className="vc-nr" data-rv="">
              0{i + 1} <span>/ 05</span>
            </p>
            <div className="vc-nu" data-rv="">
              <small>Nu</small>
              <p>
                {p.nu.map((r) => (
                  <span key={r}>{r}</span>
                ))}
              </p>
            </div>
            <div className="vc-met" data-rv="">
              <small>Met Volgo</small>
              <h2>{p.met}</h2>
              <p>{p.hoe}</p>
            </div>
          </section>
        ))}

        <section aria-labelledby="vc-bouw" className="vc-bouw">
          <h2 className="vc-h2" data-rv="" id="vc-bouw">
            Wij bouwen je website.
            <br />
            <em>Daar landen je leads.</em>
          </h2>
          <div aria-hidden="true" className="vc-anim" data-rv="">
            <div className="vc-site">
              <div className="vc-site__balk">
                <i />
                <i />
                <i />
                <span>jouwcoaching.nl</span>
              </div>
              <div className="vc-site__blok vc-site__blok--kop" />
              <div className="vc-site__blok" />
              <div className="vc-site__blok vc-site__blok--kort" />
              <div className="vc-site__chat">
                <p className="is-lead">Past jouw coaching bij mij?</p>
                <p>Wat is je doel? Dan plan ik je call.</p>
                <p className="is-ok">✓ Call: woensdag 14:00</p>
              </div>
            </div>
            <div className="vc-lijn">
              <i />
              <i />
              <i />
            </div>
            <div className="vc-app">
              <div className="vc-app__kop">Volgo · je leads</div>
              <div className="vc-lead">
                <b>Anna</b>
                <span>10 kilo afvallen · call wo 14:00</span>
              </div>
              <div className="vc-lead">
                <b>Mark</b>
                <span>Spiermassa · call do 09:30</span>
              </div>
              <div className="vc-lead">
                <b>Sara</b>
                <span>Fit na zwangerschap · opvolging morgen</span>
              </div>
            </div>
          </div>
          <ol className="vc-drie" data-rv="">
            <li>
              <b>1</b> Wij bouwen je website
            </li>
            <li>
              <b>2</b> Je leads landen daar
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

        <section aria-labelledby="vc-aanbod" className="vc-aanbod" id="prijzen">
          <div className="vc-kaart" data-rv="">
            <p className="vc-oog">Startaanbod voor de eerste klanten</p>
            <h2 id="vc-aanbod">Website + Volgo</h2>
            <p className="vc-prijs">
              <s>€499</s> <b>€299</b> <span>per maand</span>
            </p>
            <p className="vc-klein">Eerste 3 maanden, daarna €499 · excl. btw · geen opstartkosten · maandelijks opzegbaar</p>
            <ul>
              {KRIJGT.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <StartKnop ingelogd={ingelogd} />
            <p className="vc-klein">Veilig betalen via Stripe. Daarna opent je dashboard meteen.</p>
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
            Jij traint.
            <br />
            <em>Volgo boekt.</em>
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

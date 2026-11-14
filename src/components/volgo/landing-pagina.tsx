import { useEffect, useState } from "react";

import { AvaChat, VOLGO_AVA_SLEUTEL } from "./ava-chat";
import { Footer } from "./footer";
import { VolgoMark } from "./logo";
import { type RouteTaal } from "./route-teksten";
import { TaalKiezer, Vertaler, kiesTaal, opgeslagenTaal, toonTaal } from "./taal";
import { startBetaling } from "@/lib/api/account.functions";
import { regioTaal } from "@/lib/api/vertaal.functions";
import { INSTALL_SECONDEN, PLATFORMS, installRegel } from "@/lib/installatie";
import { PLANS, type PlanId } from "@/lib/plans";
import { TALEN, isTaal } from "@/lib/talen";
import "@/volgo-dialed.css";
import "@/volgo-landing.css";

/** The one plan that is sold: Volgo in your own website. No website is built or included. */
const PLAN: PlanId = "start";
const PRIJS = `€${PLANS[PLAN].prijsTekst}`;
/** What the customer pastes into their website. The real line, with their own code, is in the dashboard. */
const VOORBEELD_REGEL = installRegel("https://thevolgo.app", "JOUW-CODE");

/** What Volgo does, in the order a visitor goes through it. Every line is something the app really does. */
const STAPPEN: [string, string][] = [
  ["Bezoeker opent de chat", "Op je eigen website. Dag en nacht."],
  ["Volgo stelt jouw vragen", "Wat je wilt weten vóór de afspraak. Jij kiest de vragen."],
  ["Bezoeker kiest dag en tijd", "Alleen jouw vrije tijden. Nooit dubbel geboekt."],
  ["Afspraak staat in je agenda", "Met naam, nummer en alle antwoorden erbij."],
  ["Bevestiging en herinnering", "Direct een bevestiging. De dag ervoor een herinnering."],
  ["Niet geboekt? Volgo volgt op", "Na 1 en na 3 dagen. Vanzelf."],
];

const ALLES = [
  "Antwoordt elke bezoeker, 24/7",
  "Jouw eigen vragen vóór de afspraak",
  "Jouw openingstijden en afspraakduur",
  "Bellen, langskomen, op kantoor of chat",
  "Nooit dubbel geboekt",
  "Bevestiging direct na het boeken",
  "Herinnering de dag ervoor",
  "Opvolging na 1 en 3 dagen",
  "Melding op je telefoon bij elke afspraak",
  "Alle klanten en afspraken in één app",
  "Chat live meelezen en zelf overnemen",
  "Eigen naam, foto en kleur van je chat",
];

const ZONDER = ["Aanvragen die verdwijnen", "Heen en weer mailen over een tijd", "Zoeken wie wat vroeg", "No-shows", "Vergeten op te volgen"];
const MET = ["Elke bezoeker direct geholpen", "Afspraken staan vanzelf in je agenda", "Alles in één app", "Herinnering de dag ervoor", "Opvolging na 1 en 3 dagen"];

const FAQ: [string, string][] = [
  ["Wat is Volgo?", "Een afspraak-setter voor in je eigen website. Volgo antwoordt elke bezoeker, stelt jouw vragen en laat de bezoeker zelf een dag en tijd kiezen. De afspraak staat daarna in je agenda."],
  ["Heb ik een nieuwe website nodig?", "Nee. Volgo komt in de website die je al hebt. Je plakt één regel code en hij staat op elke pagina."],
  ["Hoe zet ik het in mijn website?", `Dat is ongeveer ${INSTALL_SECONDEN} seconden werk. Je kopieert één regel uit je dashboard en plakt hem in je website. In je dashboard staat per platform waar: WordPress, Wix, Shopify, Squarespace, Webflow of eigen HTML. Daarna checkt Volgo zelf of hij goed staat.`],
  ["Ik ben niet technisch. Lukt dat?", "Ja. Het is kopiëren en plakken, in drie stappen. Lukt het niet? Mail ons je regel, dan zetten wij hem er voor je in."],
  ["Wat kost het?", `${PRIJS} per maand, excl. btw. Maandelijks opzegbaar. Er zit geen website bij en er zijn geen opstartkosten.`],
  ["Voor wie is dit?", "Voor elk bedrijf dat klanten krijgt via afspraken. Van coaches en salons tot hoveniers, verbouwers en praktijken."],
  ["Werkt het in mijn Instagram-DM's?", "Nee. Volgo werkt op je website. Zet je website in je bio en stuur mensen daarheen: daar neemt Volgo het over."],
  ["Wat gebeurt er na betalen?", "Je maakt je account, beantwoordt vijf korte vragen en je dashboard is open. Daar staat je regel code klaar om te plakken."],
];

/** The Start button: takes the visitor down to the price. Logged-in customers go to their dashboard instead. */
function StartKnop({ ingelogd }: { ingelogd: boolean }) {
  return (
    <a className="vc-cta" href={ingelogd ? "/dashboard" : "#prijzen"}>
      <span>{ingelogd ? "Naar je dashboard" : "Start"}</span>
      <i aria-hidden="true">{ingelogd ? "→" : "↓"}</i>
    </a>
  );
}

/**
 * The button on the price card: straight to the secure Stripe payment page.
 * If Stripe can't be opened, the visitor lands on the pricing page instead, so the button never dead-ends.
 */
function KiesKnop({ ingelogd, tekst }: { ingelogd: boolean; tekst: string }) {
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
      const r = await startBetaling({ data: { plan: PLAN } });
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

/** The install block: what the one line looks like, the three steps, and where to paste it per platform. */
function Installeren() {
  const [platform, setPlatform] = useState(PLATFORMS[0].id);
  const p = PLATFORMS.find((x) => x.id === platform) ?? PLATFORMS[0];
  return (
    <section aria-labelledby="vc-install" className="vc-install" id="installeren">
      <p className="vc-oog" data-rv="">
        Installeren
      </p>
      <h2 className="vc-h2" data-rv="" id="vc-install">
        Eén regel plakken.
        <br />
        <em>Klaar.</em>
      </h2>
      <p className="vc-sub vc-sub--midden" data-rv="">
        Volgo komt in de website die je al hebt. Geen nieuwe website. Geen programmeur.
      </p>
      <p className="vc-tijd" data-rv="">
        <b>± {INSTALL_SECONDEN}</b>
        <span>
          seconden werk
          <small>kopiëren, plakken, opslaan</small>
        </span>
      </p>
      <div className="vc-regel" data-rv="">
        <code data-notranslate="">{VOORBEELD_REGEL}</code>
      </div>
      <p className="vc-klein vc-klein--midden" data-rv="">
        Zo ziet je regel eruit. Die van jou staat klaar in je dashboard, met een kopieerknop.
      </p>
      <ol className="vc-stap3" data-rv="">
        <li>
          <b>1</b>
          <strong>Kopieer</strong>
          <span>Je regel staat in je dashboard.</span>
        </li>
        <li>
          <b>2</b>
          <strong>Plak</strong>
          <span>Eén keer, in je website.</span>
        </li>
        <li>
          <b>3</b>
          <strong>Check</strong>
          <span>Volgo kijkt zelf of hij goed staat.</span>
        </li>
      </ol>
      <div className="vc-platform" data-rv="">
        <p className="vc-platform__kop">Waar plak je hem? Kies je website:</p>
        <div className="vc-platform__tabs" role="tablist">
          {PLATFORMS.map((x) => (
            <button aria-selected={platform === x.id} data-notranslate={x.id === "anders" ? undefined : ""} key={x.id} onClick={() => setPlatform(x.id)} role="tab" type="button">
              {x.naam}
            </button>
          ))}
        </div>
        <ol className="vc-platform__stappen">
          {p.stappen.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
        {p.noot ? <p className="vc-platform__noot">{p.noot}</p> : null}
        <p className="vc-platform__hulp">Lukt het niet? Mail ons je regel. Dan zetten wij hem er voor je in.</p>
      </div>
    </section>
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

/** The landing page, for any business: Volgo is an appointment setter you paste into your own website. What it does, how you install it, what it costs. */
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
          <p className="vc-oog">Afspraak-setter voor je website</p>
          <h1 className="vc-titel" id="vc-titel">
            Afspraken.
            <br />
            <em>Vanzelf geboekt.</em>
          </h1>
          <p className="vc-sub">Volgo is de afspraak-setter in je website. Eén regel code plakken. Klaar.</p>
          <StartKnop ingelogd={ingelogd} />
          <p className="vc-klein">{PRIJS} per maand · Zelf installeren: ± {INSTALL_SECONDEN} seconden · Geen nieuwe website nodig</p>
          <p aria-hidden="true" className="vc-scroll">
            ↓
          </p>
        </section>

        <section aria-labelledby="vc-bouw" className="vc-bouw">
          <h2 className="vc-h2" data-rv="" id="vc-bouw">
            Bezoeker erin.
            <br />
            <em>Afspraak eruit.</em>
          </h2>
          <p className="vc-sub vc-sub--midden" data-rv="">
            Volgo zit rechtsonder op je website. Hij stelt jouw vragen en plant de afspraak.
          </p>
          <div aria-hidden="true" className="vc-anim" data-rv="">
            <div className="vc-site">
              <div className="vc-site__balk">
                <i />
                <i />
                <i />
                <span>jouwwebsite.nl</span>
              </div>
              <div className="vc-site__blok vc-site__blok--kop" />
              <div className="vc-site__blok" />
              <div className="vc-site__blok vc-site__blok--kort" />
              <div className="vc-site__chat">
                <p className="is-lead">Kunnen jullie mij helpen?</p>
                <p>Zeker. Wat heb je nodig? Kies daarna een tijd.</p>
                <p className="is-ok">✓ Afspraak: woensdag 14:00</p>
              </div>
            </div>
            <div className="vc-lijn">
              <i />
              <i />
              <i />
            </div>
            <div className="vc-app">
              <div className="vc-app__kop">Volgo · je agenda</div>
              <div className="vc-lead">
                <b>Anna</b>
                <span>Telefoongesprek · wo 14:00</span>
              </div>
              <div className="vc-lead">
                <b>Mark</b>
                <span>Langskomen · do 09:30</span>
              </div>
              <div className="vc-lead">
                <b>Sara</b>
                <span>Nog niet geboekt · opvolging morgen</span>
              </div>
            </div>
          </div>
          <ol className="vc-flow">
            {STAPPEN.map(([titel, tekst], i) => (
              <li data-rv="" key={titel}>
                <b>{i + 1}</b>
                <h3>{titel}</h3>
                <p>{tekst}</p>
              </li>
            ))}
          </ol>
        </section>

        <Installeren />

        <section aria-labelledby="vc-alles" className="vc-alles">
          <h2 className="vc-h2" data-rv="" id="vc-alles">
            Alles wat een
            <br />
            <em>setter moet kunnen.</em>
          </h2>
          <ul className="vc-alles__lijst" data-rv="">
            {ALLES.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
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

        <section aria-labelledby="vc-prijs" className="vc-aanbod" id="prijzen">
          <div className="vc-kaart" data-rv="">
            <p className="vc-oog">Eén prijs · alles erin</p>
            <h2 id="vc-prijs">Volgo in je website</h2>
            <p className="vc-prijs">
              <b>{PRIJS}</b> per maand
            </p>
            <ul>
              <li>Afspraak-setter in je eigen website</li>
              <li>Eén regel code, of wij zetten hem erin</li>
              <li>Bevestiging, herinnering en opvolging</li>
              <li>Alle afspraken en klanten in één app</li>
              <li>Maandelijks opzegbaar</li>
            </ul>
            <KiesKnop ingelogd={ingelogd} tekst="Start met Volgo" />
            <p className="vc-klein">Excl. btw. Geen opstartkosten, geen website erbij. Veilig betalen via Stripe.</p>
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
          <p className="vc-klein">Eerst zien? Open de chat rechtsonder. Dat is Volgo, zo komt hij op jouw website.</p>
        </section>
      </main>
      <Footer />
      <TaalPopup />
      <Vertaler bron={BRON} />
      <AvaChat />
    </div>
  );
}

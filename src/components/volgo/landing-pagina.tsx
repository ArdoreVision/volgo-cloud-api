import { useEffect, useState } from "react";

import { AvaChat } from "./ava-chat";
import { Footer } from "./footer";
import { VolgoMark } from "./logo";
import { type RouteTaal } from "./route-teksten";
import { TaalKiezer, Vertaler, kiesTaal, opgeslagenTaal, toonTaal } from "./taal";
import { regioTaal } from "@/lib/api/vertaal.functions";
import { TALEN, isTaal } from "@/lib/talen";
import "@/volgo-dialed.css";
import "@/volgo-landing.css";

/** Damien's number: every "Book a call" opens WhatsApp, "Bel" calls directly. */
const NUMMER = "31619752432";
const NUMMER_LEESBAAR = "+31 6 19 75 24 32";
const WHATSAPP = `https://wa.me/${NUMMER}?text=${encodeURIComponent("Hoi! Ik wil graag een call boeken over een website / systeem voor mijn bedrijf.")}`;
const BELLEN = `tel:+${NUMMER}`;

const DIENSTEN: [string, string][] = [
  ["Websites op maat", "Een snelle, moderne website die precies past bij jouw bedrijf. Geen template, maar gebouwd op wat jij nodig hebt."],
  ["Systemen die automatisch werken", "Leads binnenhalen, opvolgen, afspraken plannen en herinneringen sturen. Je website werkt voor je, ook als jij slaapt."],
  ["Foto's en video's met AI", "Productfoto's, video's en animaties zonder dure fotoshoot. Wij maken ze met AI, in de stijl van jouw merk."],
  ["Alles wat je nodig hebt", "Formulieren, betalingen, chat, koppelingen met je agenda of mail. Wat je ook nodig hebt, wij regelen het."],
];

const VOORBEELDEN = [
  { naam: "Badkamerstudio Noordzee", soort: "Badkamers · website + automatische aanvragen", href: "/voorbeeld/badkamer.html", beeld: "/voorbeeld/badkamer.jpg" },
  { naam: "Bluebonnet Build Co.", soort: "Aannemer · website + afspraken plannen", href: "/voorbeeld/contractor.html", beeld: "/voorbeeld/contractor.jpg" },
];

const STAPPEN: [string, string][] = [
  ["Book a call", "Stuur ons een WhatsApp of bel. In een kort gesprek horen we wat je bedrijf nodig heeft."],
  ["Wij bouwen", "Ons internationale team van developers bouwt je website en systemen, precies zoals afgesproken."],
  ["Live in 24 uur", "Binnen 24 uur staat alles online en werkt het. Daarna komen de leads vanzelf binnen."],
];

const CIJFERS: [string, string][] = [
  ["24 uur", "van gesprek tot live"],
  ["24/7", "leads automatisch opgevolgd"],
  ["Internationaal", "team van developers"],
  ["AI", "foto's, video's en teksten"],
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

/** The page is written in Dutch; this is its source language for the translator. */
const BRON = "nl";

/** First visit: show the page in the visitor's regional language and ask them to accept or pick another one. */
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
        setKeuze(taal);
        if (taal !== BRON) toonTaal(taal);
        setOpen(true);
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

/** The landing page: we build websites and systems that work automatically. One action: Book a call (WhatsApp). */
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
          <p className="vl-oog">Websites en systemen voor jouw bedrijf</p>
          <h1 className="vl-titel" id="vl-titel">
            We bouwen exact wat jouw bedrijf nodig heeft.
          </h1>
          <p className="vl-sub">
            Websites met systemen erin die automatisch werken: ze halen leads binnen, volgen ze op en plannen de afspraak. Live binnen 24 uur.
          </p>
          <div className="vl-acties">
            <BookACall groot />
          </div>
          <p className="vl-klein">Reactie via WhatsApp · of bel direct: <a href={BELLEN}>{NUMMER_LEESBAAR}</a></p>
        </section>

        <section aria-label="In het kort" className="vl-sectie vw-cijfers-wrap">
          <div className="vw-cijfers">
            {CIJFERS.map(([groot, klein]) => (
              <div key={klein}>
                <b>{groot}</b>
                <span>{klein}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="vl-wat" className="vl-sectie">
          <h2 className="vl-h2" id="vl-wat">
            Wat we voor je doen
          </h2>
          <div className="vl-raster vw-diensten">
            {DIENSTEN.map(([kop, tekst], i) => (
              <article key={kop}>
                <span className="vl-nr">{i + 1}</span>
                <h3>{kop}</h3>
                <p>{tekst}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="vl-voorbeelden" className="vl-sectie">
          <h2 className="vl-h2" id="vl-voorbeelden">
            Voorbeelden van ons werk
          </h2>
          <p className="vl-sub vl-center vl-breed">Klik erop en bekijk de echte website. Zo kan die van jou er ook uitzien.</p>
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
            <a className="vw-voorbeeld vw-voorbeeld--jij" href={WHATSAPP} rel="noopener noreferrer" target="_blank">
              <div className="vw-browser vw-browser--leeg">
                <div className="vl-kaart__kop">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="vw-jij">
                  <span>+</span>
                  <p>Jouw bedrijf hier</p>
                </div>
              </div>
              <div className="vw-voorbeeld__tekst">
                <b>Jouw website</b>
                <span>Book a call en zie hem binnen 24 uur live</span>
              </div>
            </a>
          </div>
        </section>

        <section aria-labelledby="vl-stappen" className="vl-sectie">
          <h2 className="vl-h2" id="vl-stappen">
            Zo werkt het
          </h2>
          <ol className="vl-stappen">
            {STAPPEN.map(([kop, tekst], i) => (
              <li key={kop}>
                <span className="vl-nr">{i + 1}</span>
                <h3>{kop}</h3>
                <p>{tekst}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="vl-team" className="vl-sectie">
          <div className="vw-team">
            <h2 className="vl-h2" id="vl-team">
              Eén aanspreekpunt. Een heel team erachter.
            </h2>
            <p className="vl-sub vl-center">
              We werken met developers uit verschillende landen, dus er wordt dag en nacht gebouwd. Jij hebt één contactpersoon en hoeft zelf niks technisch te doen. Wat je ook nodig hebt, wij regelen het.
            </p>
          </div>
        </section>

        <section aria-labelledby="vl-slot" className="vl-slot">
          <h2 className="vl-h2" id="vl-slot">
            Klaar voor meer leads?
          </h2>
          <p className="vl-sub">Plan een korte call. Binnen 24 uur staat jouw website met systeem live.</p>
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

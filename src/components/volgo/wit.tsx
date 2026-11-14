import { useEffect, useState } from "react";

import { VolgoMark } from "./logo";
import { stopVogelLader, toonVogelLader } from "./post-vogel";
import { Tracking } from "./tracking";
import { startBetaling } from "@/lib/api/account.functions";
import { ABONNEMENTEN, COMPLEET, PLANS, type PlanId, planTitel } from "@/lib/plans";
import "@/volgo-wit.css";

/**
 * The white public pages (landing page and pricing): the shared header, the plan cards and how it works.
 * Everything here is written in English; the translator shows it in the visitor's own language.
 */

/** Who is looking at the page. A visitor, or a customer who is logged in (then the buttons lead to the dashboard or switch plans). */
export type Kijker = { ingelogd: boolean; toegang?: boolean; plan?: string; eigenaar?: boolean };

/** The bar on top: logo, the sections of the page, language, log in and one Start button. */
export function Kop({ kijker, links = true }: { kijker: Kijker; links?: boolean }) {
  const [vast, setVast] = useState(false);
  useEffect(() => {
    const op = () => setVast(window.scrollY > 8);
    op();
    window.addEventListener("scroll", op, { passive: true });
    return () => window.removeEventListener("scroll", op);
  }, []);
  const basis = links ? "" : "/";
  return (
    <header className={`vn-top${vast ? " is-vast" : ""}`}>
      <div className="vn-top__in">
        <a className="vn-merk" href="/">
          <VolgoMark size={26} />
          <span>Volgo</span>
        </a>
        <nav aria-label="Page" className="vn-top__nav">
          <a href={`${basis}#features`}>Features</a>
          <a href={`${basis}#install`}>How it works</a>
          <a href={links ? "#pricing" : "/pricing"}>Pricing</a>
          <a href={`${basis}#faq`}>FAQ</a>
        </nav>
        <div className="vn-top__rechts">
          {kijker.ingelogd ? null : (
            <a className="vn-top__login" href="/login">
              Log in
            </a>
          )}
          <a className="vn-knop vn-knop--klein" href={kijker.ingelogd ? "/dashboard" : links ? "#pricing" : "/pricing#pricing"}>
            {kijker.ingelogd ? "Dashboard" : "Get started"}
          </a>
        </div>
      </div>
    </header>
  );
}

/** The bar for pages that stand apart from the landing page (legal pages): with the tracking the old bar carried. */
export function KopLos() {
  return (
    <>
      <Kop kijker={{ ingelogd: false }} links={false} />
      <Tracking />
    </>
  );
}

/**
 * The button on a price card: straight to the secure Stripe payment page.
 * If Stripe can't be opened, the visitor lands on the pricing page with the reason, so the button never dead-ends.
 */
function KiesKnop({ id, kijker, licht = false, opFout }: { id: PlanId; kijker: Kijker; licht?: boolean; opFout?: (m: string) => void }) {
  const [bezig, setBezig] = useState(false);
  const p = PLANS[id];
  const klant = Boolean(kijker.ingelogd && kijker.toegang);
  const huidig = klant && kijker.plan === id;
  // A customer on one of the earlier website packages keeps that package: nothing to switch here.
  const ouder = klant && PLANS[kijker.plan as PlanId]?.verborgen === true && PLANS[kijker.plan as PlanId].limieten.website;
  const uit = bezig || huidig || ouder || (klant && kijker.eigenaar === false);
  async function start() {
    setBezig(true);
    toonVogelLader(planTitel(p));
    try {
      const r = await startBetaling({ data: { plan: id } });
      if (r.ok) {
        window.location.href = r.url;
        return;
      }
      stopVogelLader();
      if (opFout) opFout(r.message);
      else window.location.href = "/pricing";
    } catch {
      stopVogelLader();
      if (opFout) opFout("Something went wrong. Please try again.");
      else window.location.href = "/pricing";
    }
    setBezig(false);
  }
  const tekst = bezig ? "One moment…" : huidig ? "Your current plan" : ouder ? "You already have a package" : klant ? `Switch to ${p.naam}` : `Start with ${p.naam}`;
  return (
    <button className={`vn-knop vn-knop--breed${licht ? " vn-knop--licht" : ""} v-plan__cta--${id}`} disabled={uit} onClick={() => void start()} type="button">
      {tekst}
    </button>
  );
}

/**
 * What a website from the Complete package can look like. All four are examples with invented companies:
 * two are working sample sites you can open (with Volgo on them), two are design examples.
 */
const VOORBEELDEN: { naam: string; soort: string; tekst: string; beeld: string; b: number; h: number; link?: string }[] = [
  { naam: "Bluebonnet Build Co.", soort: "Service business", tekst: "Dark and bold, with a clear button to book. A working sample: try the Volgo chat on it.", beeld: "/voorbeeld/contractor.jpg", b: 1440, h: 900, link: "/voorbeeld/contractor" },
];

/** The three monthly plans, each with a professional website, and under them the 3D website made to measure. */
export function Prijzen({ kijker, kop = true }: { kijker: Kijker; kop?: boolean }) {
  const [fout, setFout] = useState("");
  const c = PLANS[COMPLEET];
  return (
    <section aria-labelledby="vn-prijs" className="vn-sectie vn-prijzen" data-vogel="Pick a plan. I'll take it from here." id="pricing">
      {kop ? (
        <header className="vn-sectie__kop" data-rv="">
          <p className="vn-oog">Pricing</p>
          <h2 className="vn-h2" id="vn-prijs">
            Pick what fits your business.
          </h2>
          <p className="vn-sub">Every plan comes with a complete professional website, built for you, with Volgo inside. For serious businesses there is a 3D website made to measure.</p>
        </header>
      ) : (
        <h2 className="vn-sr" id="vn-prijs">
          Pricing
        </h2>
      )}
      <div className="vn-plannen">
        {ABONNEMENTEN.map((id) => {
          const p = PLANS[id];
          return (
            <article className={`vn-plan${p.badge ? " is-top" : ""}`} data-rv="" key={id}>
              {p.badge ? <p className="vn-plan__badge">{p.badge}</p> : null}
              <h3>{p.naam}</h3>
              <p className="vn-plan__voor">{p.voor}</p>
              <p className="vn-plan__prijs">
                <b>€{p.prijsTekst}</b>
                <span>per month</span>
              </p>
              <KiesKnop id={id} kijker={kijker} licht={!p.badge} opFout={setFout} />
              <ul className="vn-plan__kern">
                {p.kern.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
              <ul className="vn-plan__lijst">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
      <article className="vn-compleet" data-rv="">
        <div className="vn-compleet__tekst">
          <p className="vn-oog">For serious businesses</p>
          <h3>{c.naam}: an extremely beautiful 3D website, everything included</h3>
          <p>{c.tagline}</p>
          <ul>
            {c.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <div className="vn-compleet__prijs">
          <p className="vn-plan__prijs">
            <b>€{c.opstart / 100}</b>
            <span>one-time</span>
          </p>
          <p className="vn-compleet__plus">
            + <b>€{c.prijsTekst}</b> per month
          </p>
          <KiesKnop id={COMPLEET} kijker={kijker} opFout={setFout} />
          <p className="vn-klein">Today you pay for the 3D website and the first month. After that €{c.prijsTekst} per month for hosting and maintenance.</p>
        </div>
      </article>
      <div className="vn-vb" data-rv="">
        <div className="vn-vb__kop">
          <h3>What your website can look like</h3>
          <p>An example of the kind of website Volgo builds. This company does not exist; yours is built from what you tell us about your own business.</p>
        </div>
        <div className="vn-vb__grid">
          {VOORBEELDEN.map((v) => (
            <figure className="vn-vb__kaart" key={v.naam}>
              {v.link ? (
                <a href={v.link} rel="noopener noreferrer" target="_blank">
                  <img alt={`Example website: ${v.naam}`} height={v.h} loading="lazy" src={v.beeld} width={v.b} />
                </a>
              ) : (
                <img alt={`Example website: ${v.naam}`} height={v.h} loading="lazy" src={v.beeld} width={v.b} />
              )}
              <figcaption>
                <strong>{v.soort}</strong>
                <span>{v.tekst}</span>
                {v.link ? (
                  <a href={v.link} rel="noopener noreferrer" target="_blank">
                    Open this example ↗
                  </a>
                ) : (
                  <em>Design example</em>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      {fout ? (
        <p className="vn-fout" role="alert">
          {fout}
        </p>
      ) : null}
      <p className="vn-klein vn-midden">Prices excl. VAT. Cancel any month. Secure payment via Stripe.</p>
    </section>
  );
}

/**
 * How it starts: tell Volgo about the business, give your own domain, Volgo builds the website. Kept under the old name
 * and anchor (#install), so existing links to this section keep working.
 */
export function InstallUitleg() {
  return (
    <section aria-labelledby="vn-install" className="vn-sectie vn-install" data-vogel="Tell me about your business. I build the rest." id="install">
      <header className="vn-sectie__kop" data-rv="">
        <p className="vn-oog">How it works</p>
        <h2 className="vn-h2" id="vn-install">
          You tell us about your business. Volgo builds your website.
        </h2>
        <p className="vn-sub">A complete new website with every plan, with the appointment setter already inside. No code, nothing to install.</p>
      </header>
      <ol className="vn-stappen" data-rv="">
        <li>
          <b>1</b>
          <strong>Answer 5 questions</strong>
          <span>What kind of business you are and how Volgo should sound.</span>
        </li>
        <li>
          <b>2</b>
          <strong>Tell us about your business</strong>
          <span>What you do, your services, how customers reach you.</span>
        </li>
        <li>
          <b>3</b>
          <strong>Fill in your domain</strong>
          <span>Your own domain name. You get the two lines to pass on to whoever manages it.</span>
        </li>
        <li>
          <b>4</b>
          <strong>Volgo builds it</strong>
          <span>Your website is ready in one to two minutes. Change what you want by chat, then press Publish.</span>
        </li>
      </ol>
      <div className="vn-liever" data-rv="">
        <div>
          <strong>Want something changed?</strong>
          <span>Type it in the chat in your dashboard: another text, an extra section, a different colour. Volgo changes your website while you watch.</span>
        </div>
        <div>
          <strong>Want a website people remember?</strong>
          <span>Complete is a 3D website made to measure, with a 1-on-1 call with the founder or someone from the team.</span>
        </div>
      </div>
    </section>
  );
}

/** Elements with data-rv fade and slide in when they scroll into view. Without JavaScript everything is simply visible. */
export function useOnthul(id: string) {
  useEffect(() => {
    const root = document.getElementById(id);
    if (!root || !("IntersectionObserver" in window)) return;
    root.classList.add("vn-js");
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    root.querySelectorAll("[data-rv]").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove("vn-js");
    };
  }, [id]);
}

export { planTitel };

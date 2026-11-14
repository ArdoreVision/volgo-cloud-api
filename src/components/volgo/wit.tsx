import { useEffect, useState } from "react";

import { VolgoMark } from "./logo";
import { TaalKiezer, Vertaler } from "./taal";
import { Tracking } from "./tracking";
import { startBetaling } from "@/lib/api/account.functions";
import { INSTALL_MINUTEN, INSTALL_SECONDEN, PLATFORMS, WEBSITE_SOORTEN, installRegel } from "@/lib/installatie";
import { ABONNEMENTEN, COMPLEET, PLANS, type PlanId, planTitel } from "@/lib/plans";
import "@/volgo-wit.css";

/**
 * The white public pages (landing page and pricing): the shared header, the plan cards and the install explanation.
 * Everything here is written in English; the translator shows it in the visitor's own language.
 */

/** Who is looking at the page. A visitor, or a customer who is logged in (then the buttons lead to the dashboard or switch plans). */
export type Kijker = { ingelogd: boolean; toegang?: boolean; plan?: string; eigenaar?: boolean };

/** The bar on top: logo, the sections of the page, language, log in and one Start button. */
export function Kop({ kijker, links = true, bron }: { kijker: Kijker; links?: boolean; bron?: string }) {
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
          <a href={`${basis}#install`}>Install</a>
          <a href={links ? "#pricing" : "/pricing"}>Pricing</a>
          <a href={`${basis}#faq`}>FAQ</a>
        </nav>
        <div className="vn-top__rechts">
          <TaalKiezer bron={bron} compact />
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

/** The bar for pages that stand apart from the landing page (legal pages): with the translator and tracking the old bar carried. */
export function KopLos() {
  return (
    <>
      <Kop kijker={{ ingelogd: false }} links={false} />
      <Vertaler />
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
    try {
      const r = await startBetaling({ data: { plan: id } });
      if (r.ok) {
        window.location.href = r.url;
        return;
      }
      if (opFout) opFout(r.message);
      else window.location.href = "/pricing";
    } catch {
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
  { naam: "Badkamerstudio Noordzee", soort: "Showroom or studio", tekst: "Light and calm, built around trust and a price indication. A working sample, in Dutch.", beeld: "/voorbeeld/badkamer.jpg", b: 1440, h: 900, link: "/voorbeeld/badkamer" },
  { naam: "Groenhof", soort: "Photo-led website", tekst: "Large photos of your work, your services in three blocks and one button to book.", beeld: "/assets/volgo/voorbeeld-website.jpg", b: 1344, h: 752 },
  { naam: "Bouwhuis", soort: "3D and scroll animation", tekst: "A website that moves as you scroll, for a business that wants to stand out.", beeld: "/assets/volgo/voorbeeld-3d.jpg", b: 1344, h: 752 },
];

/** The three plans for a website you already have, and under them the package where we build the website too. */
export function Prijzen({ kijker, kop = true }: { kijker: Kijker; kop?: boolean }) {
  const [fout, setFout] = useState("");
  const c = PLANS[COMPLEET];
  return (
    <section aria-labelledby="vn-prijs" className="vn-sectie vn-prijzen" id="pricing">
      {kop ? (
        <header className="vn-sectie__kop" data-rv="">
          <p className="vn-oog">Pricing</p>
          <h2 className="vn-h2" id="vn-prijs">
            Pick what fits your business.
          </h2>
          <p className="vn-sub">Three plans for the website you already have. Or let us build your complete website, with Volgo inside.</p>
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
          <p className="vn-oog">No website yet? Or ready for a new one?</p>
          <h3>{c.naam}: your website, Volgo and your domain</h3>
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
          <p className="vn-klein">Today you pay for the website and the first month. After that €{c.prijsTekst} per month.</p>
        </div>
      </article>
      <div className="vn-vb" data-rv="">
        <div className="vn-vb__kop">
          <h3>What your website can look like</h3>
          <p>Four examples of the kinds of websites we build with Complete. These companies do not exist; yours is made to measure, with your own photos and texts.</p>
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

/** What the customer pastes into their website. The real line, with their own code, is in the dashboard. */
const VOORBEELD_REGEL = installRegel("https://thevolgo.app", "YOUR-CODE");

/** Installing: how long it takes, the four steps, where the line goes per kind of website, and the two ways to not do it yourself. */
export function InstallUitleg() {
  const [platform, setPlatform] = useState(PLATFORMS[0].id);
  const p = PLATFORMS.find((x) => x.id === platform) ?? PLATFORMS[0];
  return (
    <section aria-labelledby="vn-install" className="vn-sectie vn-install" id="install">
      <header className="vn-sectie__kop" data-rv="">
        <p className="vn-oog">Install</p>
        <h2 className="vn-h2" id="vn-install">
          Installed by yourself in about {INSTALL_MINUTEN} minutes.
        </h2>
        <p className="vn-sub">Even if you know nothing about code. Your dashboard walks you through it step by step, and checks by itself that it works.</p>
      </header>
      <ol className="vn-stappen" data-rv="">
        <li>
          <b>1</b>
          <strong>Answer 5 questions</strong>
          <span>About your business, so Volgo knows what to ask.</span>
        </li>
        <li>
          <b>2</b>
          <strong>Set your hours</strong>
          <span>When you are open and how long an appointment takes.</span>
        </li>
        <li>
          <b>3</b>
          <strong>Paste one line</strong>
          <span>Copy, paste, save. About {INSTALL_SECONDEN} seconds.</span>
        </li>
        <li>
          <b>4</b>
          <strong>Press Check</strong>
          <span>Volgo looks at your website and tells you it is live.</span>
        </li>
      </ol>
      <div className="vn-install__grid">
        <div className="vn-kaart" data-rv="">
          <h3>Which websites?</h3>
          <p>Any website where you can paste one line of code. That is almost all of them:</p>
          <ul className="vn-chips" data-notranslate="">
            {WEBSITE_SOORTEN.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="vn-kaart__kop">This is the line:</p>
          <code className="vn-regel" data-notranslate="">
            {VOORBEELD_REGEL}
          </code>
          <p className="vn-klein">Yours is ready in your dashboard, with a copy button.</p>
        </div>
        <div className="vn-kaart" data-rv="">
          <h3>Where do you paste it?</h3>
          <div className="vn-tabs" role="tablist">
            {PLATFORMS.map((x) => (
              <button aria-selected={platform === x.id} data-notranslate={x.id === "anders" ? undefined : ""} key={x.id} onClick={() => setPlatform(x.id)} role="tab" type="button">
                {x.naam}
              </button>
            ))}
          </div>
          <ol className="vn-tabs__stappen">
            {p.stappen.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          {p.noot ? <p className="vn-klein">{p.noot}</p> : null}
        </div>
      </div>
      <div className="vn-liever" data-rv="">
        <div>
          <strong>Does someone else manage your website?</strong>
          <span>One button in your dashboard sends the line, with instructions, to your web developer. It takes them two minutes.</span>
        </div>
        <div>
          <strong>Rather do nothing at all?</strong>
          <span>On Growth and Pro we put Volgo in your website for you. On Complete we build your whole website.</span>
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

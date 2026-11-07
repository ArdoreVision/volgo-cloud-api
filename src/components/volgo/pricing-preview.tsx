import { useState } from "react";
import type { CSSProperties } from "react";

import { startBetaling } from "@/lib/api/account.functions";

import { INSTAGRAM, INSTAGRAM_DM } from "@/lib/contact";
import { PLANS, START_STAPPEN, type PlanId, ZICHTBAAR } from "@/lib/plans";

export function PricingPreview() {
  const [bezig, setBezig] = useState<PlanId | null>(null);
  async function kies(plan: PlanId) {
    if (bezig) return;
    setBezig(plan);
    try {
      const res = await startBetaling({ data: { plan } });
      if (res.ok) {
        window.location.href = res.url;
        return;
      }
    } catch {
      /* fall through */
    }
    window.location.href = "/pricing#plans";
  }
  return (
    <section aria-labelledby="price-title" className="v-pricing v-pricing--home" id="pricing">
      <header className="v-pricing__head" data-reveal="">
        <h2 className="v-h2 v-center" id="price-title">
          Simple pricing.
        </h2>
        <p className="v-lede v-center">Assistant: Volgo on the website you already have, 7 days for €1. Complete: we build you a new premium website with Volgo inside. Monthly, cancel any time.</p>
      </header>
      <div className="v-plans" id="plans">
        {ZICHTBAAR.map((id) => {
          const p = PLANS[id];
          return (
            <article className={`v-plan v-plan--${id}`} data-reveal="" key={id} style={{ "--d": `${["start", "pro", "premium"].indexOf(id) * 110}ms` } as CSSProperties}>
              {p.badge ? <p className="v-plan__badge">{p.badge}</p> : null}
              <h3 className="v-plan__name">{p.naam}</h3>
              <p className="v-plan__tag">{p.tagline}</p>
              <p className="v-plan__price">
                <span>€{p.prijsTekst}</span> per month
              </p>
              {p.opstart ? <p className="v-plan__kaart">+ €{p.opstart / 100} one-time setup for your website</p> : null}
              <button className={`v-plan__cta v-plan__cta--${id}`} disabled={bezig !== null} onClick={() => void kies(id)} type="button">
                {bezig === id ? "One moment…" : p.proefDagen ? `Start ${p.proefDagen} days for €1 →` : `Start ${p.naam} →`}
              </button>
              <p className="v-plan__kaart">{p.proefDagen ? `First ${p.proefDagen} days €1, then €${p.prijsTekst}/month · Cancel within ${p.proefDagen} days, pay nothing more` : `Today €${(p.prijs + p.opstart) / 100} (setup + first month), then €${p.prijsTekst}/month · Cancel any time`}</p>
              <ul className="v-plan__kern">
                {p.kern.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="v-plan__hoe">{START_STAPPEN[id].titel}</p>
              <ul className="v-plan__list">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
      <p className="v-pricing__note">
        Prices per month, excluding VAT. Domain name not included. <a href="/pricing#after-title">How it works after you subscribe</a>
      </p>
    </section>
  );
}

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="v-final" data-reveal="">
      <h2 className="v-h2 v-center" id="cta-title">
        More customers. Less chasing.
      </h2>
      <p className="v-lede v-center">Volgo on your website, 24/7. Start with 7 days for €1. Questions first? Ask Volgo in the corner, or book a call with the team right in the chat. Prefer Instagram? DM @{INSTAGRAM}.</p>
      <div className="v-final__actions">
        <a className="v-cta-primary" href="/pricing#plans">
          Get started
        </a>
        <a className="v-cta-ghost" data-ava-book="" href={INSTAGRAM_DM} rel="noopener noreferrer" target="_blank">
          Book a call
        </a>
      </div>
    </section>
  );
}

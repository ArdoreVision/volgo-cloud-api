import type { CSSProperties } from "react";

import { INSTAGRAM, INSTAGRAM_DM } from "@/lib/contact";
import { PLANS, START_STAPPEN, type PlanId } from "@/lib/plans";

export function PricingPreview() {
  return (
    <section aria-labelledby="price-title" className="v-pricing v-pricing--home" id="pricing">
      <header className="v-pricing__head" data-reveal="">
        <h2 className="v-h2 v-center" id="price-title">
          Simple pricing.
        </h2>
        <p className="v-lede v-center">Start: AVA on your own website. Pro and Premium: we build your website for you, with AVA inside. Monthly, cancel any time.</p>
      </header>
      <div className="v-plans">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const p = PLANS[id];
          return (
            <article className={`v-plan v-plan--${id}`} data-reveal="" key={id} style={{ "--d": `${["start", "pro", "premium"].indexOf(id) * 110}ms` } as CSSProperties}>
              {p.badge ? <p className="v-plan__badge">{p.badge}</p> : null}
              <h3 className="v-plan__name">{p.naam}</h3>
              <p className="v-plan__tag">{p.tagline}</p>
              <p className="v-plan__price">
                <span>€{p.prijsTekst}</span> per month
              </p>
              <a className={`v-plan__cta v-plan__cta--${id}`} data-ava-ask={`I'd like to start with Volgo ${p.naam}.`} href="/pricing">
                Choose {p.naam}
              </a>
              <p className="v-plan__kaart">Billed monthly · Cancel any time</p>
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
      <p className="v-lede v-center">AVA live on your website in 5 minutes, from €147 a month. Questions first? Ask AVA in the corner, or book a call with the team right in the chat. Prefer Instagram? DM @{INSTAGRAM}.</p>
      <div className="v-final__actions">
        <a className="v-cta-primary" data-ava-ask="I'd like to get started with Volgo. Which plan fits my business?" href="/pricing">
          Get started
        </a>
        <a className="v-cta-ghost" data-ava-book="" href={INSTAGRAM_DM} rel="noopener noreferrer" target="_blank">
          Book a call
        </a>
      </div>
    </section>
  );
}

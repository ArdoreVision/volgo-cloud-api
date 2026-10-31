import { PLANS, type PlanId } from "@/lib/plans";

export function PricingPreview() {
  return (
    <section aria-labelledby="price-title" className="v-pricing v-pricing--home" id="pricing">
      <header className="v-pricing__head">
        <h2 className="v-h2 v-center" id="price-title">
          Simple pricing.
        </h2>
        <p className="v-lede v-center">One monthly price. Your website, AVA and the dashboard included. Cancel any month.</p>
      </header>
      <div className="v-plans">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const p = PLANS[id];
          return (
            <article className={`v-plan v-plan--${id}`} key={id}>
              {id === "pro" ? <p className="v-plan__badge">Most popular</p> : null}
              <h3 className="v-plan__name">{p.naam}</h3>
              <p className="v-plan__tag">{p.tagline}</p>
              <p className="v-plan__price">
                <span>€{p.prijsTekst}</span> per month
              </p>
              <p className="v-plan__trial">{p.proefDagen ? `First ${p.proefDagen} days free` : "Starts right away"}</p>
              <a className={`v-plan__cta v-plan__cta--${id}`} href="/pricing">
                {p.proefDagen ? "Start free trial" : `Choose ${p.naam}`}
              </a>
              <ul className="v-plan__list">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
      <p className="v-pricing__note">Prices per month, excluding VAT.</p>
    </section>
  );
}

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="v-final">
      <h2 className="v-h2 v-center" id="cta-title">
        Let your website do the follow-up.
      </h2>
      <p className="v-lede v-center">Try Volgo Start free for 7 days. Questions first? Ask AVA in the corner, or email us.</p>
      <div className="v-final__actions">
        <a className="v-cta-primary" href="/pricing">
          Start 7-day free trial
        </a>
        <a className="v-cta-ghost" href="mailto:hanssenscornerstone@outlook.com">
          Email us
        </a>
      </div>
    </section>
  );
}

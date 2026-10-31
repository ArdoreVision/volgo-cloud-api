export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="v-hero" id="top">
      <div className="v-hero__card">
        <div className="v-hero__copy">
          <p className="v-pill-label">
            <span aria-hidden="true" className="v-pill-label__dot" />
            Leads and quotes, on autopilot
          </p>
          <h1 className="v-hero__title" id="hero-title">
            Never miss a lead again.
          </h1>
          <p className="v-hero__sub">
            Add AVA to your website with one line of code, or let us build you a new website with AVA inside. AVA answers every visitor
            day and night, collects their details and puts the hottest leads on top, ready for your quote.
          </p>
          <div className="v-hero__actions">
            <a className="v-cta-primary" href="/pricing">
              Start 7-day free trial
            </a>
            <a className="v-cta-ghost" href="/login">
              Log in
            </a>
          </div>
          <p className="v-hero__fine">7 days free · Works on any website · Cancel any time</p>
        </div>
        <div className="v-hero__art">
          <img alt="AVA, Volgo's AI assistant, next to a phone with messages" height={900} src="/assets/volgo/hero.jpg" width={900} />
        </div>
      </div>
    </section>
  );
}

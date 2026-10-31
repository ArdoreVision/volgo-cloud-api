export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="v-hero" id="top">
      <div className="v-hero__card">
        <div className="v-hero__copy">
          <p className="v-pill-label">
            <span aria-hidden="true" className="v-pill-label__dot" />
            Website + AI assistant, in one
          </p>
          <h1 className="v-hero__title" id="hero-title">
            Your website now follows up on every customer.
          </h1>
          <p className="v-hero__sub">
            Volgo builds your website with AVA inside. AVA chats with every visitor, day and night, collects their details and puts
            your hottest leads at the top of your dashboard.
          </p>
          <div className="v-hero__actions">
            <a className="v-cta-primary" href="/pricing">
              Start 7-day free trial
            </a>
            <a className="v-cta-ghost" href="/login">
              Log in
            </a>
          </div>
          <p className="v-hero__fine">No setup on your side · Cancel any month</p>
        </div>
        <div className="v-hero__art">
          <img alt="AVA, Volgo's AI assistant, next to a phone with messages" height={900} src="/assets/volgo/hero.jpg" width={900} />
        </div>
      </div>
    </section>
  );
}

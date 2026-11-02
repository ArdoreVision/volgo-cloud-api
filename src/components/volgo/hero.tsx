const PROOF = ["Published prices, no sales call", "Monthly, cancel any time", "Live on your website in 5 minutes", "Books appointments inside the chat", "Website built for you on Pro"];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="v-hero" id="top">
      <div className="v-hero__card">
        <div className="v-hero__copy">
          <p className="v-pill-label">
            <span aria-hidden="true" className="v-pill-label__dot" />
            The AI front desk for businesses that live from quotes
          </p>
          <h1 className="v-hero__title" id="hero-title">
            Answer first. Win the job.
          </h1>
          <p className="v-hero__sub">
            Volgo puts AVA on your website: an AI assistant that replies to every visitor within seconds, day and night, collects their details, books the
            appointment and ranks every lead by how ready they are to buy. You open your dashboard in the morning and call the buyers first.
          </p>
          <div className="v-hero__actions">
            <a className="v-cta-primary" href="/pricing#plans">
              Get started
            </a>
            <a className="v-cta-ghost" href="#video">
              Watch the 48-second demo
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="M8 3v10M4 9l4 4 4-4" />
              </svg>
            </a>
          </div>
          <ul aria-label="What you can count on" className="v-hero__proof">
            {PROOF.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div className="v-hero__art">
          <img alt="AVA, Volgo's AI assistant, next to a phone with messages" height={900} src="/assets/volgo/hero.jpg" width={900} />
          <div aria-hidden="true" className="vx-zweef vx-zweef--1">
            <span className="vx-zweef__score">92</span>
            <span>
              <b>New hot lead</b>
              <small>Sarah · walk-in shower · January</small>
            </span>
          </div>
          <div aria-hidden="true" className="vx-zweef vx-zweef--2">
            <span className="vx-zweef__dot" />
            <span>
              <b>AVA replied in 4 sec</b>
              <small>Sunday 10:41 PM</small>
            </span>
          </div>
          <div aria-hidden="true" className="vx-zweef vx-zweef--3">
            <span className="vx-zweef__mail">@</span>
            <span>
              <b>Call Sarah first</b>
              <small>Your morning summary</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

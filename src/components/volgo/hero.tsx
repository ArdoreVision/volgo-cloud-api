export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="v-hero" id="top">
      <div className="v-hero__card">
        <div className="v-hero__copy">
          <p className="v-pill-label">
            <span aria-hidden="true" className="v-pill-label__dot" />
            For businesses that live from quotes
          </p>
          <h1 className="v-hero__title" id="hero-title">
            More customers. Less chasing.
          </h1>
          <p className="v-hero__sub">
            AVA answers every visitor on your website within seconds, day and night. It asks the right questions, collects their details and puts the people
            ready to buy at the top of your list. You spend less time on emails and calls, and only call the buyers.
          </p>
          <div className="v-hero__actions">
            <a className="v-cta-primary" href="/pricing">
              Start 7-day free trial
            </a>
            <a className="v-cta-ghost" href="#demo">
              Try the live demo
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="M8 3v10M4 9l4 4 4-4" />
              </svg>
            </a>
          </div>
          <p className="v-hero__fine">7 days free · Live on your website in 5 minutes · Cancel any time</p>
        </div>
        <div className="v-hero__art">
          <img alt="AVA, Volgo's AI assistant, next to a phone with messages" height={900} src="/assets/volgo/hero.jpg" width={900} />
          <div aria-hidden="true" className="vx-zweef vx-zweef--1">
            <span className="vx-zweef__score">92</span>
            <span>
              <b>New hot lead</b>
              <small>Sanne · walk-in shower · January</small>
            </span>
          </div>
          <div aria-hidden="true" className="vx-zweef vx-zweef--2">
            <span className="vx-zweef__dot" />
            <span>
              <b>AVA replied in 4 sec</b>
              <small>Sunday 22:41</small>
            </span>
          </div>
          <div aria-hidden="true" className="vx-zweef vx-zweef--3">
            <span className="vx-zweef__mail">@</span>
            <span>
              <b>Call Sanne first</b>
              <small>Your morning summary · 07:00</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

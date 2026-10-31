export function Hero() {
  return (
    <section aria-labelledby="hero-titel" className="v-hero" id="top">
      <div className="v-hero__card">
        <div className="v-hero__copy">
          <p className="v-pill-label">
            <span aria-hidden="true" className="v-pill-label__dot" />
            Website + AI-opvolging in één
          </p>
          <h1 className="v-hero__title" id="hero-titel">
            Je website volgt nu zelf je klanten op.
          </h1>
          <p className="v-hero__sub">
            Wij bouwen je een nieuwe website met AVA erin: een AI-assistent die elke aanvraag binnen een minuut
            beantwoordt en opvolgt tot de afspraak staat.
          </p>
          <div className="v-hero__actions">
            <a className="v-cta-primary" href="/abonnement">
              Probeer 7 dagen gratis
            </a>
            <a className="v-cta-ghost" href="/inloggen">
              Ik heb al een account
            </a>
          </div>
        </div>
        <div className="v-hero__art">
          <img alt="AVA, de AI-assistent van Volgo, naast een telefoon met berichten" height={900} src="/assets/volgo/hero.jpg" width={900} />
        </div>
      </div>
    </section>
  );
}

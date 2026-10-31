import { VolgoMark } from "./logo";

export function Nav() {
  return (
    <header className="v-nav">
      <div className="v-nav__inner">
        <a aria-label="Volgo, naar boven" className="v-nav__brand" href="/#top">
          <VolgoMark />
          <span>Volgo</span>
        </a>
        <nav aria-label="Hoofdmenu" className="v-nav__links">
          <a href="/#hoe">Hoe het werkt</a>
          <a href="/abonnement">Abonnementen</a>
          <a href="/#vragen">Vragen</a>
          <a href="/inloggen">Inloggen</a>
        </nav>
        <a className="v-nav__login" href="/inloggen">
          Inloggen
        </a>
        <a className="v-nav__cta" href="/abonnement">
          Probeer gratis
        </a>
      </div>
    </header>
  );
}

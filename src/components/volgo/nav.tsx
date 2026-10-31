import { VolgoMark } from "./logo";

export function Nav({ ingelogd = false }: { ingelogd?: boolean }) {
  return (
    <header className="v-nav">
      <div className="v-nav__inner">
        <a aria-label="Volgo, naar boven" className="v-nav__brand" href="/#top">
          <VolgoMark />
          <span>Volgo</span>
        </a>
        <nav aria-label="Hoofdmenu" className="v-nav__links">
          <a href="/#hoe">Hoe het werkt</a>
          <a href="/pricing">Abonnementen</a>
          <a href="/#vragen">Vragen</a>
          {ingelogd ? null : <a href="/login">Inloggen</a>}
        </nav>
        {ingelogd ? null : (
          <a className="v-nav__login" href="/login">
            Inloggen
          </a>
        )}
        {ingelogd ? (
          <a className="v-nav__cta" href="/dashboard">
            Naar dashboard
          </a>
        ) : (
          <a className="v-nav__cta" href="/pricing">
            Probeer gratis
          </a>
        )}
      </div>
    </header>
  );
}

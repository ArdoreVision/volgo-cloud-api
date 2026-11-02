import { VolgoMark } from "./logo";
import { TaalKiezer, Vertaler } from "./taal";

export function Nav({ ingelogd = false }: { ingelogd?: boolean }) {
  return (
    <header className="v-nav">
      <div className="v-nav__inner">
        <a aria-label="Volgo, back to top" className="v-nav__brand" href="/#top">
          <VolgoMark />
          <span>Volgo</span>
        </a>
        <nav aria-label="Main menu" className="v-nav__links">
          <a href="/#why-volgo">Why Volgo</a>
          <a href="/#demo">Live demo</a>
          <a href="/#compare">Compare</a>
          <a href="/#how">How it works</a>
          <a href="/pricing">Pricing</a>
          <a href="/#faq">FAQ</a>
          {ingelogd ? null : <a href="/login">Log in</a>}
        </nav>
        <TaalKiezer compact />
        <Vertaler />
        {ingelogd ? null : (
          <a className="v-nav__login" href="/login">
            Log in
          </a>
        )}
        {ingelogd ? (
          <a className="v-nav__cta" href="/dashboard">
            Go to dashboard
          </a>
        ) : (
          <a className="v-nav__cta" data-ava-ask="I'd like to start the 7-day free trial. Which plan fits my business?" href="/pricing">
            Start free trial
          </a>
        )}
      </div>
    </header>
  );
}

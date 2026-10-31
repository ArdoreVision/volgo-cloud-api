import { VolgoMark } from "./logo";

export function Nav({ ingelogd = false }: { ingelogd?: boolean }) {
  return (
    <header className="v-nav">
      <div className="v-nav__inner">
        <a aria-label="Volgo, back to top" className="v-nav__brand" href="/#top">
          <VolgoMark />
          <span>Volgo</span>
        </a>
        <nav aria-label="Main menu" className="v-nav__links">
          <a href="/#why">Why Volgo</a>
          <a href="/#examples">Examples</a>
          <a href="/#how">How it works</a>
          <a href="/pricing">Pricing</a>
          <a href="/#faq">FAQ</a>
          {ingelogd ? null : <a href="/login">Log in</a>}
        </nav>
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
          <a className="v-nav__cta" href="/pricing">
            Start free trial
          </a>
        )}
      </div>
    </header>
  );
}

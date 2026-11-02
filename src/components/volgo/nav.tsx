import { VolgoMark } from "./logo";
import { TaalKiezer, Vertaler } from "./taal";
import { Tracking } from "./tracking";

/** Simple bar: logo on the left, one Start button on the right. */
export function Nav({ ingelogd = false }: { ingelogd?: boolean }) {
  return (
    <header className="v-nav v-nav--simpel">
      <div className="v-nav__inner">
        <a aria-label="Volgo, back to top" className="v-nav__brand" href="/#top">
          <VolgoMark />
          <span>Volgo</span>
        </a>
        <div className="v-nav__rechts">
          <TaalKiezer compact />
          <Vertaler />
          <Tracking />
          {ingelogd ? null : (
            <a className="v-nav__login" href="/login">
              Log in
            </a>
          )}
          {ingelogd ? (
            <a className="vs-start" href="/dashboard">
              Go to dashboard
            </a>
          ) : (
            <a className="vs-start" href="/pricing#plans">
              Start now
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

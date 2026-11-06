import { VolgoMark } from "./logo";
import { TaalKiezer, Vertaler } from "./taal";
import { Tracking, meet } from "./tracking";

/**
 * Simple bar: logo on the left, one main button on the right.
 * On the ad landing page the main button is "Try AVA live" (to the demo on the same page); elsewhere it stays "Start now".
 */
export function Nav({ ingelogd = false, probeer }: { ingelogd?: boolean; probeer?: { tekst: string; kort?: string; handgeschreven?: boolean; onKlik?: () => void } }) {
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
          ) : probeer ? (
            <a
              className="vs-start v-nav__probeer"
              data-notranslate={probeer.handgeschreven ? "" : undefined}
              href="#demo"
              onClick={() => {
                meet("demo_klik");
                probeer.onKlik?.();
              }}
            >
              <span className="v-nav__lang">{probeer.tekst}</span>
              <span className="v-nav__kort">{probeer.kort ?? probeer.tekst}</span>
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

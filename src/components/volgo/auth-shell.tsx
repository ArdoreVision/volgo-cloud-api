import type { ReactNode } from "react";

import { VolgoMark } from "./logo";
import { Tracking } from "./tracking";

/** Rustige, gecentreerde pagina voor betalen, aanmelden en inloggen. */
export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="volgo v-auth">
      <header className="v-auth__top">
        <a className="v-nav__brand" href="/">
          <VolgoMark />
          <span>Volgo</span>
        </a>
      </header>
      <main className={`v-auth__card${wide ? " v-auth__card--wide" : ""}`}>{children}</main>
      <Tracking />
      <p className="v-auth__foot">
        A service by Hanssens Cornerstone Capital · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
      </p>
    </div>
  );
}

export function Steps({ actief }: { actief: 1 | 2 | 3 | 4 }) {
  const stappen = ["Plan", "Payment", "Account", "Log in"];
  return (
    <ol aria-label="Steps" className="v-stepper">
      {stappen.map((s, i) => (
        <li data-state={i + 1 < actief ? "klaar" : i + 1 === actief ? "nu" : "straks"} key={s}>
          <span>{i + 1 < actief ? "✓" : i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

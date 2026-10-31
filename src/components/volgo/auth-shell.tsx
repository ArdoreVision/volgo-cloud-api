import type { ReactNode } from "react";

import { VolgoMark } from "./logo";

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
      <p className="v-auth__foot">
        Een dienst van Hanssens Cornerstone Capital · <a href="/terms">Voorwaarden</a> · <a href="/privacy">Privacy</a>
      </p>
    </div>
  );
}

export function Steps({ actief }: { actief: 1 | 2 | 3 | 4 }) {
  const stappen = ["Abonnement", "Betalen", "Account", "Inloggen"];
  return (
    <ol aria-label="Stappen" className="v-stepper">
      {stappen.map((s, i) => (
        <li data-state={i + 1 < actief ? "klaar" : i + 1 === actief ? "nu" : "straks"} key={s}>
          <span>{i + 1 < actief ? "✓" : i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

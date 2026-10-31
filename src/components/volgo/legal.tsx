import type { ReactNode } from "react";

import { Footer } from "./footer";
import { Nav } from "./nav";

export function LegalPage({ titel, bijgewerkt, intro, children }: { titel: string; bijgewerkt: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="volgo">
      <Nav />
      <main className="v-legal">
        <h1 className="v-h2">{titel}</h1>
        <p className="v-legal__meta">Last updated: {bijgewerkt}</p>
        {intro ? <div className="v-legal__intro">{intro}</div> : null}
        {children}
        <p className="v-legal__meta v-legal__eind">
          Questions about this document? Email <a href="mailto:hanssenscornerstone@outlook.com">hanssenscornerstone@outlook.com</a>.
        </p>
      </main>
      <Footer />
    </div>
  );
}

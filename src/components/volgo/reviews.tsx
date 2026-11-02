import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

import { haalReviews } from "@/lib/api/admin.functions";

type Review = Awaited<ReturnType<typeof haalReviews>>[number];

function Sterren({ n }: { n: number }) {
  return (
    <span aria-label={`${n} out of 5 stars`} className="vx-rev__sterren">
      {"★★★★★".slice(0, n)}
      <i>{"★★★★★".slice(n)}</i>
    </span>
  );
}

/** Real customer reviews. Renders nothing until the first one is added in the admin. */
export function Reviews() {
  const [lijst, setLijst] = useState<Review[] | null>(null);
  useEffect(() => {
    void haalReviews()
      .then(setLijst)
      .catch(() => setLijst([]));
  }, []);
  if (!lijst || lijst.length === 0) return null;
  const gem = Math.round((lijst.reduce((a, r) => a + r.sterren, 0) / lijst.length) * 10) / 10;
  return (
    <section aria-labelledby="rev-titel" className="vx-sectie vx-rev" id="reviews">
      <header className="vx-kop vx-kop--midden" data-reveal="">
        <p className="vx-label">
          {gem} / 5 · {lijst.length} {lijst.length === 1 ? "review" : "reviews"}
        </p>
        <h2 className="v-h2" id="rev-titel">
          What customers say.
        </h2>
        <p className="v-lede">Real businesses, real names. We ask every customer for an honest review after their first month.</p>
      </header>
      <div className="vx-rev__grid">
        {lijst.map((r, i) => (
          <article data-reveal="" key={r.id} style={{ "--d": `${(i % 3) * 110}ms` } as CSSProperties}>
            <Sterren n={r.sterren} />
            <p className="vx-rev__tekst">“{r.tekst}”</p>
            {r.resultaat ? <p className="vx-rev__resultaat">{r.resultaat}</p> : null}
            <footer>
              <strong>{r.naam}</strong>
              <span>
                {r.bedrijf}
                {r.plaats ? ` · ${r.plaats}` : ""}
                {r.branche ? ` · ${r.branche}` : ""}
              </span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

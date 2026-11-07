import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { alleReviews, bewaarReview, verwijderReview } from "@/lib/api/admin.functions";

type R = Awaited<ReturnType<typeof alleReviews>>[number];

/** Admin: add and manage real customer reviews shown on the landing page. */
export function AdminReviews() {
  const [lijst, setLijst] = useState<R[]>([]);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState("");
  const laad = () => void alleReviews().then(setLijst).catch(() => setLijst([]));
  useEffect(laad, []);

  async function opslaan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    if (v("tekst").length < 20) return setMelding("The review text needs at least 20 characters.");
    setBezig(true);
    setMelding("");
    const r = await bewaarReview({
      data: { naam: v("naam"), bedrijf: v("bedrijf"), plaats: v("plaats"), branche: v("branche"), tekst: v("tekst"), sterren: Number(v("sterren") || 5), resultaat: v("resultaat"), zichtbaar: true },
    }).catch(() => ({ ok: false as const }));
    setBezig(false);
    if (!r.ok) return setMelding("Couldn’t save. Are you still logged in as admin?");
    e.currentTarget.reset();
    setMelding("Saved. It’s live on the landing page.");
    laad();
  }

  return (
    <section className="v-dash__panel v-admin__reviews">
      <div>
        <h2 className="v-admin__h2">Customer reviews</h2>
        <p className="v-muted v-small">Only real reviews from real customers, with their permission. The section on the landing page appears automatically once there is one.</p>
      </div>
      <form className="v-admin__revform" onSubmit={(e) => void opslaan(e)}>
        <div className="v-fld">
          <label htmlFor="rv-naam">Name</label>
          <input id="rv-naam" name="naam" placeholder="Jan de Vries" required />
        </div>
        <div className="v-fld">
          <label htmlFor="rv-bedrijf">Company</label>
          <input id="rv-bedrijf" name="bedrijf" placeholder="De Vries Installatietechniek" required />
        </div>
        <div className="v-fld">
          <label htmlFor="rv-plaats">Town</label>
          <input id="rv-plaats" name="plaats" placeholder="Middelburg" />
        </div>
        <div className="v-fld">
          <label htmlFor="rv-branche">Trade</label>
          <input id="rv-branche" name="branche" placeholder="Heating & solar" />
        </div>
        <div className="v-fld v-fld--breed">
          <label htmlFor="rv-tekst">Review (their words)</label>
          <textarea id="rv-tekst" name="tekst" placeholder="“Within the first week Volgo caught two quote requests that came in after 8 PM…”" required />
        </div>
        <div className="v-fld">
          <label htmlFor="rv-resultaat">Result badge (optional)</label>
          <input id="rv-resultaat" name="resultaat" placeholder="3 extra quotes in month one" />
        </div>
        <div className="v-fld">
          <label htmlFor="rv-sterren">Stars</label>
          <select className="v-select" defaultValue="5" id="rv-sterren" name="sterren">
            {[5, 4, 3].map((n) => (
              <option key={n} value={n}>
                {n} ★
              </option>
            ))}
          </select>
        </div>
        <div className="v-fld v-fld--breed">
          <button className="v-btn-blauw" disabled={bezig} type="submit">
            {bezig ? "Saving…" : "Add review"}
          </button>
          {melding ? <p className="v-hint">{melding}</p> : null}
        </div>
      </form>
      <div className="v-admin__revlijst">
        {lijst.length === 0 ? <p className="v-muted v-small">No reviews yet.</p> : null}
        {lijst.map((r) => (
          <div key={r.id}>
            <span>
              <strong>{r.naam}</strong> · {r.bedrijf} · {r.sterren}★
              <small>{r.tekst}</small>
            </span>
            <button
              onClick={() => {
                void verwijderReview({ data: { id: r.id } }).then(laad);
              }}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

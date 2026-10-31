import { useEffect, useState } from "react";

import { haalOnboarding, markeerOnboarding } from "@/lib/api/assistent.functions";

type Data = NonNullable<Awaited<ReturnType<typeof haalOnboarding>>>;

/** Drie stappen voor een nieuwe klant. Verdwijnt als alles klaar is of als je hem wegklikt. */
export function AanDeSlag({ openTab }: { openTab: (t: "ava" | "team") => void }) {
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    void haalOnboarding().then((r) => r && setD(r));
  }, []);
  if (!d || d.verborgen) return null;
  const klaar = Object.values(d.stappen).filter(Boolean).length;
  if (klaar === 3) return null;

  const stappen = [
    { key: "info", klaar: d.stappen.info, titel: "Vertel AVA over je bedrijf", uitleg: "Diensten, werkgebied en openingstijden. Twee minuten werk.", knop: "Invullen", doe: () => openTab("ava") },
    {
      key: "getest",
      klaar: d.stappen.getest,
      titel: "Praat zelf met AVA",
      uitleg: "Doe alsof je een klant bent en kijk hoe AVA reageert.",
      knop: "Proberen",
      doe: () => {
        window.open(`/demo/${d.sleutel}`, "_blank", "noopener");
        void markeerOnboarding({ data: { actie: "getest" } });
        setD({ ...d, stappen: { ...d.stappen, getest: true } });
      },
    },
    { key: "team", klaar: d.stappen.team, titel: "Nodig je team uit", uitleg: "Collega's zien de leads en kunnen meechatten.", knop: "Uitnodigen", doe: () => openTab("team") },
  ];

  return (
    <section aria-label="Aan de slag" className="v-start">
      <header className="v-start__kop">
        <div>
          <strong>Aan de slag</strong>
          <span>{klaar} van 3 klaar</span>
        </div>
        <div aria-hidden="true" className="v-start__balk">
          <i style={{ width: `${(klaar / 3) * 100}%` }} />
        </div>
        <button
          aria-label="Verbergen"
          className="v-start__weg"
          onClick={() => {
            setD({ ...d, verborgen: true });
            void markeerOnboarding({ data: { actie: "verbergen" } });
          }}
          type="button"
        >
          ×
        </button>
      </header>
      <ol className="v-start__lijst">
        {stappen.map((s) => (
          <li className={s.klaar ? "is-klaar" : ""} key={s.key}>
            <span aria-hidden="true" className="v-start__vink">
              {s.klaar ? "✓" : ""}
            </span>
            <div>
              <strong>{s.titel}</strong>
              <small>{s.uitleg}</small>
            </div>
            {s.klaar ? <em>Klaar</em> : <button onClick={s.doe} type="button">{s.knop}</button>}
          </li>
        ))}
      </ol>
    </section>
  );
}

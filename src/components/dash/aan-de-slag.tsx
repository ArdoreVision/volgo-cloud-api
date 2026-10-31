import { useEffect, useState } from "react";

import { haalOnboarding, markeerOnboarding } from "@/lib/api/assistent.functions";

type Data = NonNullable<Awaited<ReturnType<typeof haalOnboarding>>>;

/** Drie stappen voor een nieuwe klant. Verdwijnt als alles klaar is of als je hem wegklikt. */
export function AanDeSlag({ openTab }: { openTab: (t: string) => void }) {
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    void haalOnboarding().then((r) => r && setD(r));
  }, []);
  if (!d || d.verborgen) return null;
  const alle = [
    { key: "info", klaar: d.stappen.info, titel: "Tell AVA about your business", uitleg: "Services, service area and opening hours. Takes two minutes.", knop: "Fill in", doe: () => openTab("ava") },
    {
      key: "getest",
      klaar: d.stappen.getest,
      titel: "Talk to AVA yourself",
      uitleg: "Pretend to be a customer and see how AVA responds.",
      knop: "Try it",
      doe: () => {
        window.open(`/demo/${d.sleutel}`, "_blank", "noopener");
        void markeerOnboarding({ data: { actie: "getest" } });
        setD({ ...d, stappen: { ...d.stappen, getest: true } });
      },
    },
    {
      key: "geinstalleerd",
      klaar: d.stappen.geinstalleerd,
      titel: "Add AVA to your website",
      uitleg: "Copy one line of code to your site, or let us do it for you.",
      knop: "Get the code",
      doe: () => openTab("installeren"),
    },
    { key: "team", klaar: d.stappen.team, titel: "Invite your team", uitleg: "Colleagues see the leads and can join the chat.", knop: "Invite", doe: () => openTab("team") },
  ];
  // Start is for one person: no team step.
  const stappen = d.teamMogelijk ? alle : alle.filter((s) => s.key !== "team");
  const totaal = stappen.length;
  const klaar = stappen.filter((s) => s.klaar).length;
  if (klaar === totaal) return null;

  return (
    <section aria-label="Get started" className="v-start">
      <header className="v-start__kop">
        <div>
          <strong>Get started</strong>
          <span>{klaar} of {totaal} done</span>
        </div>
        <div aria-hidden="true" className="v-start__balk">
          <i style={{ width: `${(klaar / totaal) * 100}%` }} />
        </div>
        <button
          aria-label="Hide"
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
            {s.klaar ? <em>Done</em> : <button onClick={s.doe} type="button">{s.knop}</button>}
          </li>
        ))}
      </ol>
    </section>
  );
}

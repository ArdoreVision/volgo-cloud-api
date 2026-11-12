import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { vraagHulp } from "@/lib/api/hulp.functions";

type Actie = { soort: "open"; tab: string; label: string } | { soort: "website" } | { soort: "chat" };
type Bericht = { rol: "ik" | "volgo"; tekst: string; acties?: Actie[] };

const OPSLAG = "volgo-hulp";

/** A few questions that fit the page you are on, so you never start with an empty box. */
const IDEEEN: Record<string, string[]> = {
  home: ["Wie moet ik vandaag als eerste bellen?", "Wat staat er deze week in mijn agenda?"],
  gesprekken: ["Hoe neem ik een gesprek zelf over?", "Waar vroegen bezoekers de laatste tijd naar?"],
  aanvragen: ["Schrijf een kort opvolgbericht voor mijn warmste aanvraag", "Wat betekent de warmte?"],
  agenda: ["Hoe stel ik in wanneer klanten kunnen boeken?", "Wat staat er deze week gepland?"],
  website: ["Maak de knop bovenaan opvallender", "Voeg een blok met veelgestelde vragen toe", "Hoe zet ik mijn website online?"],
  mijnsite: ["Hoe zet ik de chat op mijn website?", "Hoe weet ik of de chat goed staat?"],
  ava: ["Verander de begroeting van mijn chat", "Welke vragen stelt mijn chat nu?"],
  kanalen: ["Hoe koppel ik WhatsApp?"],
  betalingen: ["Hoe stuur ik een betaalverzoek?"],
  reviews: ["Hoe krijg ik meer Google-reviews?"],
};
const ALTIJD = "Wat kan ik op deze pagina doen?";

function laad(): Bericht[] {
  try {
    const d = JSON.parse(sessionStorage.getItem(OPSLAG) || "[]") as Bericht[];
    return Array.isArray(d) ? d.filter((b) => b && typeof b.tekst === "string").slice(-30) : [];
  } catch {
    return [];
  }
}

/**
 * Help on every page of the dashboard: ask Volgo how something works, or let it change your website and chat.
 * One button in the top bar, one panel; what it changed is always shown with a button to go and look.
 */
export function Hulp({ open, sluit, pagina, openTab, gewijzigd }: { open: boolean; sluit: () => void; pagina: string; openTab: (t: string) => void; gewijzigd: () => void }) {
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const veld = useRef<HTMLTextAreaElement>(null);
  const eind = useRef<HTMLDivElement>(null);

  useEffect(() => setBerichten(laad()), []);
  useEffect(() => {
    try {
      sessionStorage.setItem(OPSLAG, JSON.stringify(berichten.slice(-30)));
    } catch {
      /* private mode */
    }
  }, [berichten]);
  useEffect(() => {
    if (!open) return;
    veld.current?.focus();
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") sluit();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (open) eind.current?.scrollIntoView({ block: "end" });
  }, [berichten, bezig, open]);

  async function stuur(vraag: string) {
    const v = vraag.trim();
    if (!v || bezig) return;
    const historie = berichten.slice(-12).map(({ rol, tekst: t }) => ({ rol, tekst: t.slice(0, 4000) }));
    setBerichten((b) => [...b, { rol: "ik", tekst: v }]);
    setTekst("");
    setBezig(true);
    const r = await vraagHulp({ data: { vraag: v, historie, pagina } }).catch(() => ({ ok: false as const, antwoord: "Er ging iets mis. Probeer het opnieuw.", acties: [] as Actie[] }));
    setBezig(false);
    const acties = r.acties as Actie[];
    setBerichten((b) => [...b, { rol: "volgo", tekst: r.antwoord, acties }]);
    if (acties.some((a) => a.soort !== "open")) gewijzigd();
    veld.current?.focus();
  }
  const verstuur = (e: FormEvent) => {
    e.preventDefault();
    void stuur(tekst);
  };
  const toets = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void stuur(tekst);
    }
  };
  const ga = (tab: string) => {
    openTab(tab);
    // On a phone the panel covers the page: close it so you see where you went.
    if (window.matchMedia("(max-width: 900px)").matches) sluit();
  };
  const ideeen = [...(IDEEEN[pagina] ?? []), ALTIJD];

  if (!open) return null;
  return (
        <aside aria-label="Hulp van Volgo" className="v-hulp v-rimpel-uit" role="dialog">
          <header className="v-hulp__kop">
            <div>
              <strong>Vraag het Volgo</strong>
              <small>Uitleg, of laat je website en chat aanpassen.</small>
            </div>
            {berichten.length ? (
              <button className="v-hulp__stil" onClick={() => setBerichten([])} type="button">
                Nieuw
              </button>
            ) : null}
            <button aria-label="Hulp sluiten" className="v-hulp__sluit" onClick={sluit} type="button">
              <svg aria-hidden="true" viewBox="0 0 20 20">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </header>
          <div aria-live="polite" className="v-hulp__berichten">
            {berichten.length === 0 ? (
              <div className="v-hulp__start">
                <strong>Waar kan ik mee helpen?</strong>
                <p>Vraag hoe iets werkt, of zeg wat je anders wilt op je website of in je chat. Ik pas het voor je aan en laat zien wat er veranderd is.</p>
              </div>
            ) : null}
            {berichten.map((b, i) => (
              <div className={`v-hulp__rij v-hulp__rij--${b.rol}`} key={i}>
                <p className={`v-bw__b v-bw__b--${b.rol}`}>{b.tekst}</p>
                {b.acties?.length ? (
                  <div className="v-hulp__acties">
                    {b.acties.map((a, j) =>
                      a.soort === "open" ? (
                        <button key={j} onClick={() => ga(a.tab)} type="button">
                          Open {a.label} →
                        </button>
                      ) : a.soort === "website" ? (
                        <button key={j} onClick={() => ga("website")} type="button">
                          Bekijk je website →
                        </button>
                      ) : (
                        <button key={j} onClick={() => ga("ava")} type="button">
                          Bekijk je chat →
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            ))}
            {bezig ? (
              <p className="v-bw__b v-bw__b--volgo v-bw__b--bezig">
                <i />
                <i />
                <i />
                <span>Volgo is bezig…</span>
              </p>
            ) : null}
            <div ref={eind} />
          </div>
          {!bezig && berichten.length < 2 ? (
            <div className="v-bw__ideeen">
              {ideeen.map((v) => (
                <button key={v} onClick={() => void stuur(v)} type="button">
                  {v}
                </button>
              ))}
            </div>
          ) : null}
          <form className="v-bw__invoer" onSubmit={verstuur}>
            <textarea aria-label="Je vraag aan Volgo" maxLength={1500} onChange={(e) => setTekst(e.target.value)} onKeyDown={toets} placeholder="Typ je vraag of wat je wilt aanpassen" ref={veld} rows={1} value={tekst} />
            <button aria-label="Versturen" disabled={bezig || !tekst.trim()} type="submit">
              ↑
            </button>
          </form>
        </aside>
  );
}

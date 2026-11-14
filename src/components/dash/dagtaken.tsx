import { useEffect, useState } from "react";

type Taak = { id: string; titel: string; tab: string };

/** Small things that take a minute and keep the app useful. Five are picked per day. */
const ALLE: Taak[] = [
  { id: "chats", titel: "Open your live conversations", tab: "gesprekken" },
  { id: "agenda", titel: "Look at your calendar", tab: "agenda" },
  { id: "terugbellen", titel: "Call one request back", tab: "aanvragen" },
  { id: "bezoekers", titel: "See who visited your website", tab: "verkeer" },
  { id: "naam", titel: "Give your assistant a name", tab: "ava" },
  { id: "foto", titel: "Add a photo to your chat", tab: "ava" },
  { id: "kleur", titel: "Pick a colour for your chat", tab: "ava" },
  { id: "vraag", titel: "Add a question your assistant asks", tab: "ava" },
  { id: "begroeting", titel: "Change your first chat message", tab: "ava" },
  { id: "profiel", titel: "Update your profile", tab: "account" },
  { id: "antwoord", titel: "Answer a customer in the chat", tab: "gesprekken" },
];
const VAST = ["chats", "agenda", "terugbellen"];

function vandaagKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
/** Same five tasks all day, different ones tomorrow: three daily habits plus two that rotate. */
function takenVoor(dag: string): Taak[] {
  const n = Number(dag.replace(/-/g, ""));
  const rest = ALLE.filter((t) => !VAST.includes(t.id));
  const a = rest[n % rest.length];
  const b = rest[(n * 7 + 3) % rest.length];
  const extra = a.id === b.id ? [a, rest[(n + 1) % rest.length]] : [a, b];
  return [...ALLE.filter((t) => VAST.includes(t.id)), ...extra];
}
function lees(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function Dagtaken({ openTab }: { openTab: (t: string) => void }) {
  const dag = vandaagKey();
  const key = `volgo-taken-${dag}`;
  const taken = takenVoor(dag);
  const [klaar, setKlaar] = useState<string[]>([]);
  useEffect(() => setKlaar(lees(key)), [key]);

  function doe(t: Taak) {
    const nieuw = [...new Set([...klaar, t.id])];
    setKlaar(nieuw);
    try {
      localStorage.setItem(key, JSON.stringify(nieuw));
    } catch {
      /* private mode */
    }
    openTab(t.tab);
  }
  const aantal = taken.filter((t) => klaar.includes(t.id)).length;

  return (
    <section aria-labelledby="vd-taken" className="v-vd__blok v-taken">
      <div className="v-vd__blokkop">
        <h2 id="vd-taken">Your 5 for today</h2>
        <span className="v-taken__teller">
          {aantal}/5{aantal === 5 ? " · all done" : ""}
        </span>
      </div>
      <div aria-hidden="true" className="v-taken__balk">
        <i style={{ width: `${(aantal / 5) * 100}%` }} />
      </div>
      <ul className="v-vd__lijst">
        {taken.map((t) => {
          const af = klaar.includes(t.id);
          return (
            <li key={t.id}>
              <button className={`v-taken__rij${af ? " is-af" : ""}`} onClick={() => doe(t)} type="button">
                <span aria-hidden="true" className="v-taken__vink">
                  {af ? (
                    <svg viewBox="0 0 24 24">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : null}
                </span>
                <span className="v-taken__titel">{t.titel}</span>
                <span aria-hidden="true" className="v-taken__pijl">
                  →
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

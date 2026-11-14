import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { vraagAssistent } from "@/lib/api/assistent.functions";

type Bericht = { rol: "ik" | "ava"; tekst: string };

/** Pages Ask Volgo can send you to, with the label on the button. */
const PAGINA: Record<string, string> = {
  gesprekken: "Open Inbox",
  agenda: "Open Calendar",
  "agenda-instellen": "Open calendar settings",
  aanvragen: "Open Requests",
  home: "Open Today",
  automatisch: "Open Follow-up",
  reviews: "Open Reviews",
  betalingen: "Open Payments",
  installeren: "Open Install",
  website: "Open Website",
  mijnsite: "Open My website",
  kanalen: "Open Connections",
  ava: "Open Your chat",
  verkeer: "Open Visitors",
  meldingen: "Open Notifications",
  account: "Open Account",
  abonnement: "Open Subscription",
};

const VOORBEELDEN = [
  "Who should I call back first?",
  "What is on my calendar this week?",
  "How many visitors did my website have this month?",
  "Help me set up Volgo",
  "Find everything about Anna",
  "Write a reply to my newest request",
];

/** Text with [[open:id]] markers → paragraphs and buttons that go to that page. */
function Antwoord({ tekst, open }: { tekst: string; open: (t: string) => void }) {
  const knoppen: string[] = [];
  const schoon = tekst.replace(/\[\[open:([a-z-]+)\]\]/g, (_, id: string) => {
    if (PAGINA[id] && !knoppen.includes(id)) knoppen.push(id);
    return "";
  });
  return (
    <>
      {schoon
        .trim()
        .split(/\n{2,}/)
        .map((blok, i) => (
          <p key={i}>
            {blok.split("\n").map((r, j) => (
              <span key={j}>
                {j ? <br /> : null}
                {r.replace(/\*\*(.+?)\*\*/g, "$1")}
              </span>
            ))}
          </p>
        ))}
      {knoppen.length ? (
        <div className="v-vv__knoppen">
          {knoppen.map((id) => (
            <button key={id} onClick={() => open(id)} type="button">
              {PAGINA[id]} →
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

/**
 * Ask Volgo: a button bottom right in the dashboard that opens an assistant which knows the whole account.
 * It finds customers, conversations and appointments, reads the website analytics, and helps with the setup by
 * sending you to the right page. It never changes settings itself.
 */
export function VraagVolgo({ openTab, voornaam }: { openTab: (t: string) => void; voornaam: string }) {
  const [open, setOpen] = useState(false);
  const [lijst, setLijst] = useState<Bericht[]>([]);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const eind = useRef<HTMLDivElement | null>(null);
  const veld = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    eind.current?.scrollIntoView({ block: "end" });
  }, [lijst, bezig]);
  useEffect(() => {
    if (open) setTimeout(() => veld.current?.focus(), 60);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    const kort = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((x) => !x);
      }
    };
    window.addEventListener("keydown", kort);
    const opVraag = (e: Event) => {
      setOpen(true);
      const v = (e as CustomEvent<string>).detail;
      if (v) void stuur(v);
    };
    window.addEventListener("vraag-volgo", opVraag);
    return () => {
      window.removeEventListener("keydown", esc);
      window.removeEventListener("keydown", kort);
      window.removeEventListener("vraag-volgo", opVraag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lijst]);

  async function stuur(vraag: string) {
    const v = vraag.trim();
    if (!v || bezig) return;
    setTekst("");
    const historie = lijst.slice(-10);
    setLijst((l) => [...l, { rol: "ik", tekst: v }]);
    setBezig(true);
    const r = await vraagAssistent({ data: { vraag: v, historie } }).catch(() => ({ ok: false as const, antwoord: "Volgo is temporarily unavailable. Please try again in a minute." }));
    setLijst((l) => [...l, { rol: "ava", tekst: r.antwoord }]);
    setBezig(false);
  }
  const verstuur = (e: FormEvent) => {
    e.preventDefault();
    void stuur(tekst);
  };
  const ga = (id: string) => {
    openTab(id);
    if (window.innerWidth < 760) setOpen(false);
  };

  return (
    <>
      <button aria-expanded={open} aria-label="Ask Volgo" className={`v-vv__knop${open ? " is-open" : ""}`} onClick={() => setOpen(!open)} type="button">
        <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
          <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
          <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
        </svg>
        <span>Ask Volgo</span>
      </button>
      {open ? (
        <aside aria-label="Ask Volgo" className="v-vv">
          <header className="v-vv__kop">
            <div>
              <strong>Ask Volgo</strong>
              <small>Knows your customers, calendar, numbers and settings</small>
            </div>
            <button aria-label="Close" onClick={() => setOpen(false)} type="button">
              ×
            </button>
          </header>
          <div className="v-vv__lijst">
            {lijst.length === 0 ? (
              <div className="v-vv__leeg">
                <p>
                  Hi {voornaam}. Ask me anything about your business: a customer, an appointment, your visitors, or how to set something up. I can find it and take you there.
                </p>
                <div className="v-vv__chips">
                  {VOORBEELDEN.map((v) => (
                    <button key={v} onClick={() => void stuur(v)} type="button">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {lijst.map((b, i) => (
              <div className={`v-vv__b v-vv__b--${b.rol}`} key={i}>
                {b.rol === "ava" ? <Antwoord open={ga} tekst={b.tekst} /> : <p>{b.tekst}</p>}
              </div>
            ))}
            {bezig ? (
              <div className="v-vv__b v-vv__b--ava v-vv__denkt" aria-live="polite">
                <i />
                <i />
                <i />
              </div>
            ) : null}
            <div ref={eind} />
          </div>
          <form className="v-vv__vorm" onSubmit={verstuur}>
            <textarea
              aria-label="Your question"
              onChange={(e) => setTekst(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void stuur(tekst);
                }
              }}
              placeholder="Ask about a customer, your calendar, your numbers…"
              ref={veld}
              rows={1}
              value={tekst}
            />
            <button disabled={bezig || !tekst.trim()} type="submit">
              Ask
            </button>
          </form>
        </aside>
      ) : null}
    </>
  );
}

/** Open Ask Volgo from anywhere in the dashboard, optionally with a question. */
export const vraagVolgo = (vraag = "") => window.dispatchEvent(new CustomEvent("vraag-volgo", { detail: vraag }));

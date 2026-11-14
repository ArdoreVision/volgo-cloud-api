import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { vraagAssistent } from "@/lib/api/assistent.functions";

type Bericht = { rol: "ik" | "ava"; tekst: string; gewijzigd?: string[] };

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
  "Switch on the review request",
  "Read my website and fill in what the chat should know",
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
 * Ask Volgo: its own page in the dashboard, with an assistant that knows the whole account.
 * It finds customers, conversations and appointments, reads the website analytics, reads a link you give it, and
 * changes settings when you ask, within what the plan allows. Every change it makes is listed under its answer.
 * It cannot change the dashboard itself; for anything outside the settings it sends you to the right page.
 * It stays mounted while you visit other pages, so the conversation is still there when you come back.
 */
export function VraagVolgo({ actief, openTab, voornaam }: { actief: boolean; openTab: (t: string) => void; voornaam: string }) {
  const [lijst, setLijst] = useState<Bericht[]>([]);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const eind = useRef<HTMLDivElement | null>(null);
  const veld = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (actief) eind.current?.scrollIntoView({ block: "end" });
  }, [lijst, bezig, actief]);
  useEffect(() => {
    if (actief && window.innerWidth > 760) setTimeout(() => veld.current?.focus(), 60);
  }, [actief]);
  useEffect(() => {
    // Ctrl/Cmd+K opens this page from anywhere in the dashboard.
    const kort = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openTab("vraag");
      }
    };
    window.addEventListener("keydown", kort);
    // Other pages can send a question here ("Ask Volgo to help").
    const opVraag = (e: Event) => {
      openTab("vraag");
      const v = (e as CustomEvent<string>).detail;
      if (v) void stuur(v);
    };
    window.addEventListener("vraag-volgo", opVraag);
    return () => {
      window.removeEventListener("keydown", kort);
      window.removeEventListener("vraag-volgo", opVraag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lijst, bezig]);

  async function stuur(vraag: string) {
    const v = vraag.trim();
    if (!v || bezig) return;
    setTekst("");
    setLijst((l) => [...l, { rol: "ik", tekst: v }]);
    setBezig(true);
    const historie = lijst.slice(-10).map(({ rol, tekst }) => ({ rol, tekst }));
    const r: { antwoord: string; gewijzigd?: string[] } = await vraagAssistent({ data: { vraag: v, historie } }).catch(() => ({ antwoord: "Volgo is temporarily unavailable. Please try again in a minute." }));
    const gewijzigd = r.gewijzigd ?? [];
    setLijst((l) => [...l, { rol: "ava", tekst: r.antwoord, gewijzigd }]);
    // Another page may show a setting that just changed: let the dashboard load it again.
    if (gewijzigd.length) window.dispatchEvent(new Event("volgo-instellingen-gewijzigd"));
    setBezig(false);
  }
  const verstuur = (e: FormEvent) => {
    e.preventDefault();
    void stuur(tekst);
  };

  return (
    <section aria-label="Ask Volgo" className="v-vp" hidden={!actief}>
      <header className="v-vp__kop">
        <div>
          <h1>Ask Volgo</h1>
          <p>Ask a question, or tell Volgo what to change. It searches your account, reads a link you paste and changes your settings, within your plan.</p>
        </div>
        {lijst.length ? (
          <button className="v-vp__nieuw" disabled={bezig} onClick={() => setLijst([])} type="button">
            New conversation
          </button>
        ) : null}
      </header>
      <div className="v-vp__vlak">
        <div className="v-vv__lijst">
          {lijst.length === 0 ? (
            <div className="v-vv__leeg">
              <p>Hi {voornaam}. What can I do for you? A few things you can ask:</p>
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
              {b.rol === "ava" ? <Antwoord open={openTab} tekst={b.tekst} /> : <p>{b.tekst}</p>}
              {b.gewijzigd?.length ? (
                <div className="v-vv__gewijzigd">
                  <strong>Changed in your settings</strong>
                  <ul>
                    {b.gewijzigd.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
            placeholder="Ask, or tell me what to change…"
            ref={veld}
            rows={1}
            value={tekst}
          />
          <button disabled={bezig || !tekst.trim()} type="submit">
            Ask
          </button>
        </form>
      </div>
      <p className="v-vp__noot">Volgo cannot change your plan, payments, password or team. For those it sends you to the right page.</p>
    </section>
  );
}

/** Open Ask Volgo from anywhere in the dashboard, optionally with a question. */
export const vraagVolgo = (vraag = "") => window.dispatchEvent(new CustomEvent("vraag-volgo", { detail: vraag }));

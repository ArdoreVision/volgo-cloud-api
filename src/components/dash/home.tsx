import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { vraagAssistent } from "@/lib/api/assistent.functions";

import { AanDeSlag } from "./aan-de-slag";

const VOORBEELDEN = [
  "Which leads should I call first today?",
  "What's on my calendar this week?",
  "What have visitors been asking about lately?",
  "Write a short follow-up email for my hottest lead.",
];

function groet(d: Date) {
  const uur = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Amsterdam" }).format(d));
  if (uur < 6) return "Good night";
  if (uur < 12) return "Good morning";
  if (uur < 18) return "Good afternoon";
  return "Good evening";
}

type Bericht = { rol: "ik" | "ava"; tekst: string };

export function Home({ voornaam, bedrijf, openTab }: { voornaam: string; bedrijf: string; openTab: (t: string) => void }) {
  const [nu, setNu] = useState(() => new Date());
  const [tekst, setTekst] = useState("");
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [bezig, setBezig] = useState(false);
  const [vb, setVb] = useState(0);
  const lijst = useRef<HTMLDivElement>(null);
  const veld = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNu(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);
  // Voorbeeldvraag in het balkje wisselt rustig.
  useEffect(() => {
    if (berichten.length) return;
    const id = window.setInterval(() => setVb((i) => (i + 1) % VOORBEELDEN.length), 4500);
    return () => window.clearInterval(id);
  }, [berichten.length]);
  useEffect(() => {
    lijst.current?.scrollTo({ top: lijst.current.scrollHeight, behavior: "smooth" });
  }, [berichten, bezig]);

  const tijd = nu.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
  const datum = nu.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" });

  async function stuur(vraag: string) {
    const v = vraag.trim();
    if (!v || bezig) return;
    const historie = berichten.slice(-12);
    setBerichten((b) => [...b, { rol: "ik", tekst: v }]);
    setTekst("");
    setBezig(true);
    try {
      const r = await vraagAssistent({ data: { vraag: v, historie } });
      setBerichten((b) => [...b, { rol: "ava", tekst: r.antwoord }]);
    } catch {
      setBerichten((b) => [...b, { rol: "ava", tekst: "Something went wrong. Please try again." }]);
    } finally {
      setBezig(false);
      veld.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Leeg balkje + verzenden = de voorbeeldvraag stellen.
    void stuur(tekst || (berichten.length ? "" : VOORBEELDEN[vb]));
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
    if (e.key === "Tab" && !tekst && !berichten.length) {
      e.preventDefault();
      setTekst(VOORBEELDEN[vb]);
    }
  }

  const leeg = berichten.length === 0;

  return (
    <section className={`v-home${leeg ? " v-home--leeg" : ""}`}>
      <header className="v-home__groet">
        <p className="v-home__tijd">
          <span>{tijd}</span> · {datum}
        </p>
        <h1>
          {groet(nu)}, {voornaam}
        </h1>
        {leeg ? <p className="v-home__sub">Ask AVA anything about {bedrijf}'s customers, conversations and calendar.</p> : null}
      </header>

      {!leeg ? (
        <div className="v-home__chat" ref={lijst}>
          {berichten.map((b, i) => (
            <div className={`v-home__msg v-home__msg--${b.rol}`} key={i}>
              {b.rol === "ava" ? <span className="v-home__ava" aria-hidden="true">A</span> : null}
              <p>{b.tekst}</p>
            </div>
          ))}
          {bezig ? (
            <div className="v-home__msg v-home__msg--ava">
              <span className="v-home__ava" aria-hidden="true">A</span>
              <p className="v-home__typen" aria-label="AVA is thinking">
                <i />
                <i />
                <i />
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <form className="v-home__balk" onSubmit={onSubmit}>
        <textarea
          aria-label="Ask AVA"
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={onKey}
          placeholder={leeg ? VOORBEELDEN[vb] : "Ask AVA another question"}
          ref={veld}
          rows={1}
          value={tekst}
        />
        <button aria-label="Send" disabled={bezig} type="submit">
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <path d="M10 16V4M5 9l5-5 5 5" />
          </svg>
        </button>
      </form>

      {leeg ? (
        <div className="v-home__tips">
          {VOORBEELDEN.map((v) => (
            <button key={v} onClick={() => void stuur(v)} type="button">
              {v}
            </button>
          ))}
        </div>
      ) : null}

      {leeg ? <AanDeSlag openTab={openTab} /> : null}
    </section>
  );
}

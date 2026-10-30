import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { chatMetAva } from "@/lib/api/chat.functions";

type Msg = { role: "user" | "assistant"; content: string };

const WELKOM: Msg = {
  role: "assistant",
  content: "Hoi! Ik ben AVA, de AI-assistent van Volgo. Waar kan ik je mee helpen?",
};
const SUGGESTIES = ["Hoe werkt AVA?", "Wat kost het?", "Ik wil een demo"];
const KEY = "volgo-ava-chat";

export function openAva() {
  window.dispatchEvent(new Event("ava:open"));
}

export function AvaChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELKOM]);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [gezien, setGezien] = useState(true);
  const lijst = useRef<HTMLDivElement>(null);
  const invoer = useRef<HTMLTextAreaElement>(null);
  const knop = useRef<HTMLButtonElement>(null);

  // Gesprek bewaren zolang het tabblad open is.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setMsgs(JSON.parse(raw) as Msg[]);
      else setGezien(false);
    } catch {
      setGezien(false);
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("ava:open", onOpen);
    return () => window.removeEventListener("ava:open", onOpen);
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* geen opslag beschikbaar */
    }
    lijst.current?.scrollTo({ top: lijst.current.scrollHeight, behavior: "smooth" });
  }, [msgs, bezig]);
  useEffect(() => {
    if (open) {
      setGezien(true);
      window.setTimeout(() => invoer.current?.focus(), 250);
    }
  }, [open]);

  const sluit = useCallback(() => {
    setOpen(false);
    knop.current?.focus();
  }, []);

  async function verstuur(inhoud: string) {
    const t = inhoud.trim().slice(0, 1500);
    if (!t || bezig) return;
    const volgende: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs(volgende);
    setTekst("");
    setBezig(true);
    try {
      const res = await chatMetAva({ data: { messages: volgende.filter((m) => m !== WELKOM).slice(-20) } });
      setMsgs((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Er ging iets mis met de verbinding. Probeer het nog eens, of gebruik het formulier hieronder." },
      ]);
    } finally {
      setBezig(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void verstuur(tekst);
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void verstuur(tekst);
    }
    if (e.key === "Escape") sluit();
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-label={open ? "Chat met AVA sluiten" : "Chat met AVA openen"}
        className="ava-fab"
        data-open={open ? "1" : "0"}
        onClick={() => (open ? sluit() : setOpen(true))}
        ref={knop}
        type="button"
      >
        <img alt="" height={56} src="/assets/volgo/ava.png" width={56} />
        <span className="ava-fab__label">Vraag het AVA</span>
        {!gezien ? <i aria-hidden="true" className="ava-fab__dot" /> : null}
      </button>

      <section aria-label="Chat met AVA" aria-modal="false" className="ava-panel" data-open={open ? "1" : "0"} role="dialog">
        <header className="ava-panel__head">
          <img alt="" height={40} src="/assets/volgo/ava.png" width={40} />
          <div>
            <strong>AVA</strong>
            <small>
              <i aria-hidden="true" /> AI-assistent van Volgo
            </small>
          </div>
          <button aria-label="Sluiten" className="ava-panel__close" onClick={sluit} type="button">
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        <div aria-live="polite" className="ava-log" ref={lijst} role="log">
          {msgs.map((m, i) => (
            <p className={`ava-bubble ava-bubble--${m.role}`} key={i}>
              {m.content}
            </p>
          ))}
          {bezig ? (
            <p aria-label="AVA typt" className="ava-bubble ava-bubble--assistant ava-typing">
              <span />
              <span />
              <span />
            </p>
          ) : null}
          {msgs.length <= 1 && !bezig ? (
            <div className="ava-sugg">
              {SUGGESTIES.map((s) => (
                <button key={s} onClick={() => void verstuur(s)} type="button">
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <form className="ava-input" onSubmit={onSubmit}>
          <label className="ava-sr" htmlFor="ava-tekst">
            Bericht aan AVA
          </label>
          <textarea
            id="ava-tekst"
            maxLength={1500}
            onChange={(e) => setTekst(e.target.value)}
            onKeyDown={onKey}
            placeholder="Typ je vraag..."
            ref={invoer}
            rows={1}
            value={tekst}
          />
          <button aria-label="Versturen" className="ava-send" disabled={!tekst.trim() || bezig} type="submit">
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="M8 13V3.5M4 7l4-4 4 4" />
            </svg>
          </button>
        </form>
        <p className="ava-note">AVA is een AI en kan fouten maken. Deel geen gevoelige gegevens.</p>
      </section>
    </>
  );
}

export function TryAvaButton() {
  return (
    <button className="v-try-ava" onClick={openAva} type="button">
      <img alt="" height={28} src="/assets/volgo/ava.png" width={28} />
      Probeer AVA zelf
    </button>
  );
}

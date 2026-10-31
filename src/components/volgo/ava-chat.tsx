import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { chatMetAva } from "@/lib/api/chat.functions";

type Msg = { role: "user" | "assistant"; content: string };

const WELKOM: Msg = {
  role: "assistant",
  content: "Hi! I'm AVA, Volgo's AI assistant. How can I help?",
};
const SUGGESTIES = ["How does AVA work?", "What does it cost?", "How do I get started?"];
const KEY = "volgo-ava-chat-en";

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
        { role: "assistant", content: "Something went wrong with the connection. Please try again." },
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
        aria-label={open ? "Close chat with AVA" : "Open chat with AVA"}
        className="ava-fab"
        data-open={open ? "1" : "0"}
        onClick={() => (open ? sluit() : setOpen(true))}
        ref={knop}
        type="button"
      >
        <img alt="" height={56} src="/assets/volgo/ava.png" width={56} />
        <span className="ava-fab__label">Ask AVA</span>
        {!gezien ? <i aria-hidden="true" className="ava-fab__dot" /> : null}
      </button>

      <section aria-label="Chat with AVA" aria-modal="false" className="ava-panel" data-open={open ? "1" : "0"} role="dialog">
        <header className="ava-panel__head">
          <img alt="" height={40} src="/assets/volgo/ava.png" width={40} />
          <div>
            <strong>AVA</strong>
            <small>
              <i aria-hidden="true" /> Volgo's AI assistant
            </small>
          </div>
          <button aria-label="Close" className="ava-panel__close" onClick={sluit} type="button">
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
            <p aria-label="AVA is typing" className="ava-bubble ava-bubble--assistant ava-typing">
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
            Message to AVA
          </label>
          <textarea
            id="ava-tekst"
            maxLength={1500}
            onChange={(e) => setTekst(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type your question..."
            ref={invoer}
            rows={1}
            value={tekst}
          />
          <button aria-label="Send" className="ava-send" disabled={!tekst.trim() || bezig} type="submit">
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="M8 13V3.5M4 7l4-4 4 4" />
            </svg>
          </button>
        </form>
        <p className="ava-note">AVA is an AI and can make mistakes. Please don't share sensitive information.</p>
      </section>
    </>
  );
}

export function TryAvaButton() {
  return (
    <button className="v-try-ava" onClick={openAva} type="button">
      <img alt="" height={28} src="/assets/volgo/ava.png" width={28} />
      Try AVA yourself
    </button>
  );
}

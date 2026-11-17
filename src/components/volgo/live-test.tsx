import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { testVolgo } from "@/lib/api/test.functions";
import { TEST_BEDRIJF } from "@/lib/test-bedrijf";

/**
 * The live test: one button on the landing page opens a full-screen chat that slides up.
 * Left is your own screen as a visitor of an example business, right is the owner's screen:
 * the Volgo inbox, filling in live with the same conversation. Nothing is stored or booked.
 */

type Bericht = { id: number; rol: "bezoeker" | "volgo"; tekst: string; tijd: string };
type Geboekt = { naam: string; contact: string; tijd: string };

const nuTijd = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const BEGIN = `Hi! I'm Volgo, the assistant of ${TEST_BEDRIJF}. Ask me anything, or book a free visit right here.`;
const SNEL = ["What do you do?", "What does a bathroom cost?", "Book an appointment"];

/** The next two working days, morning and afternoon. */
function tijden() {
  const uit: string[] = [];
  const d = new Date();
  while (uit.length < 4) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dag = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
    uit.push(`${dag}, 10:00 am`, `${dag}, 2:00 pm`);
  }
  return uit;
}

export function LiveTestKnop({ tekst = "Test Volgo live" }: { tekst?: string }) {
  return (
    <button className="vn-knop vn-lt__start" onClick={() => window.dispatchEvent(new Event("volgo-test"))} type="button">
      {tekst}
    </button>
  );
}

export function LiveTest() {
  const [open, setOpen] = useState(false);
  const [gestart, setGestart] = useState(false);
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [kies, setKies] = useState(false);
  const [boekt, setBoekt] = useState(false);
  const [geboekt, setGeboekt] = useState<Geboekt | null>(null);
  const [scherm, setScherm] = useState<"chat" | "eigenaar">("chat");
  const [nieuw, setNieuw] = useState(false);
  const teller = useRef(0);
  const chatEind = useRef<HTMLDivElement>(null);
  const inboxEind = useRef<HTMLDivElement>(null);
  const veld = useRef<HTMLTextAreaElement>(null);

  const erbij = useCallback((rol: Bericht["rol"], t: string) => {
    teller.current += 1;
    const b = { id: teller.current, rol, tekst: t, tijd: nuTijd() };
    setBerichten((oud) => [...oud, b]);
    return b;
  }, []);

  useEffect(() => {
    const start = () => {
      setOpen(true);
      setGestart(true);
    };
    window.addEventListener("volgo-test", start);
    return () => window.removeEventListener("volgo-test", start);
  }, []);

  // First open: Volgo greets. The page behind does not scroll while the test is open.
  useEffect(() => {
    if (gestart && berichten.length === 0) erbij("volgo", BEGIN);
  }, [gestart, berichten.length, erbij]);
  useEffect(() => {
    if (!open) return;
    const oud = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", esc);
    const t = window.setTimeout(() => veld.current?.focus({ preventScroll: true }), 650);
    return () => {
      document.documentElement.style.overflow = oud;
      window.removeEventListener("keydown", esc);
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    const naarEind = () => {
      for (const el of [chatEind.current, inboxEind.current]) {
        const lijst = el?.parentElement;
        if (lijst) lijst.scrollTop = lijst.scrollHeight;
      }
    };
    naarEind();
    // Once more after the new card has slid in.
    const t = window.setTimeout(naarEind, 450);
    return () => window.clearTimeout(t);
  }, [berichten.length, bezig, kies, geboekt, scherm]);

  async function stuur(t: string) {
    const schoon = t.trim().slice(0, 600);
    if (!schoon || bezig) return;
    setFout("");
    setTekst("");
    setKies(false);
    const mijn = erbij("bezoeker", schoon);
    setBezig(true);
    const historie = [...berichten, mijn].map((b) => ({ rol: b.rol, tekst: b.tekst }));
    const r = await testVolgo({ data: { berichten: historie } }).catch(() => ({ ok: false as const, message: "No connection. Please try again." }));
    setBezig(false);
    if (!r.ok) {
      setFout(r.message);
      return;
    }
    erbij("volgo", r.tekst);
    if (scherm === "chat") setNieuw(true);
    if (r.tijden) {
      setKies(true);
      setBoekt(true);
      setScherm("chat");
    }
    if (r.geboekt) {
      setGeboekt(r.geboekt);
      setBoekt(false);
    }
    veld.current?.focus({ preventScroll: true });
  }

  function opnieuw() {
    setBerichten([]);
    setGeboekt(null);
    setKies(false);
    setBoekt(false);
    setFout("");
    setTekst("");
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

  const naam = geboekt?.naam || "Website visitor";
  const letters = geboekt
    ? geboekt.naam
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";
  const laatste = berichten[berichten.length - 1];
  const alleenBegin = berichten.length <= 1;

  return (
    <div aria-hidden={!open} aria-label="Live test of Volgo" aria-modal="true" className={`vn-lt${open ? " is-open" : ""}${boekt ? " is-boekt" : ""} is-${scherm}`} role="dialog">
      <header className="vn-lt__balk">
        <span className="vn-lt__merk">
          <b>Live test</b>
          <span>Nothing is stored or really booked</span>
        </span>
        <div aria-label="Which screen" className="vn-lt__wissel" role="group">
          <button aria-pressed={scherm === "chat"} onClick={() => setScherm("chat")} type="button">
            Your chat
          </button>
          <button
            aria-pressed={scherm === "eigenaar"}
            onClick={() => {
              setScherm("eigenaar");
              setNieuw(false);
            }}
            type="button"
          >
            Owner's screen{nieuw ? <i aria-label="New" /> : null}
          </button>
        </div>
        <button aria-label="Close the test" className="vn-lt__sluit" onClick={() => setOpen(false)} type="button">
          <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="vn-lt__vlak">
        {/* Your own screen: the visitor */}
        <section aria-label="Your screen as a visitor" className="vn-lt__jij">
          <p className="vn-lt__label">
            <b>Your screen</b> · you are a visitor of {TEST_BEDRIJF}
          </p>
          <div className="vn-lt__chat">
            <div className="vn-lt__kop">
              <span className="vn-lt__av">V</span>
              <span>
                <b>Volgo</b>
                <small>Answers right away, day and night</small>
              </span>
            </div>
            <div aria-live="polite" className="vn-lt__berichten" role="log">
              {berichten.map((b) => (
                <div className={`vn-lt__b vn-lt__b--${b.rol}`} key={b.id}>
                  <p>{b.tekst}</p>
                </div>
              ))}
              {bezig ? (
                <div className="vn-lt__b vn-lt__b--volgo vn-lt__typt" aria-label="Volgo is typing">
                  <p>
                    <i />
                    <i />
                    <i />
                  </p>
                </div>
              ) : null}
              {alleenBegin && !bezig ? (
                <div className="vn-lt__snel">
                  {SNEL.map((s) => (
                    <button key={s} onClick={() => void stuur(s)} type="button">
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
              {kies && !bezig ? (
                <div className="vn-lt__tijden">
                  <p>Pick a time</p>
                  <div>
                    {tijden().map((t) => (
                      <button key={t} onClick={() => void stuur(t)} type="button">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {geboekt ? (
                <div className="vn-lt__klaar">
                  <b>Test appointment</b>
                  <span>{geboekt.tijd}</span>
                  <small>Not really booked. On your own website this lands in your calendar and inbox.</small>
                  <div>
                    <a className="vn-knop" href="#pricing" onClick={() => setOpen(false)}>
                      Get Volgo for my business
                    </a>
                    <button onClick={opnieuw} type="button">
                      Test again
                    </button>
                  </div>
                </div>
              ) : null}
              {fout ? <p className="vn-lt__fout">{fout}</p> : null}
              <div ref={chatEind} />
            </div>
            <form className="vn-lt__invoer" onSubmit={verstuur}>
              <textarea aria-label="Your message" maxLength={600} onChange={(e) => setTekst(e.target.value)} onKeyDown={toets} placeholder="Type a message…" ref={veld} rows={1} value={tekst} />
              <button aria-label="Send" disabled={bezig || !tekst.trim()} type="submit">
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24" width="18">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </form>
          </div>
        </section>

        {/* The owner's screen: the Volgo dashboard with the inbox */}
        <section aria-label="Example of the owner's screen" className="vn-lt__eigenaar">
          <p className="vn-lt__label">
            <b>The owner's screen</b> · this is Volgo from the inside
          </p>
          <div className="vn-lt__dash">
            <div className="vn-lt__top">
              <b>Volgo</b>
              <span>{TEST_BEDRIJF}</span>
            </div>
            <div className="vn-lt__in">
              <nav aria-hidden="true" className="vn-lt__menu">
                <span className="is-aan">Inbox</span>
                <span>
                  Calendar{geboekt ? <em>1</em> : null}
                </span>
                <span>
                  Requests{geboekt ? <em>1</em> : null}
                </span>
                <span>Analytics</span>
                <span>Ask Volgo</span>
              </nav>
              <div className="vn-lt__lijst">
                <p>Inbox</p>
                {berichten.some((b) => b.rol === "bezoeker") ? (
                  <div className="vn-lt__contact">
                    <span className="vn-lt__av">{letters}</span>
                    <span>
                      <b>{naam}</b>
                      <small>
                        {laatste ? (laatste.rol === "volgo" ? "Volgo: " : "") + laatste.tekst : ""}
                      </small>
                    </span>
                    <time>{laatste?.tijd}</time>
                  </div>
                ) : (
                  <small className="vn-lt__leeg">Everyone who messages you shows up here. Send a message on the left.</small>
                )}
              </div>
              <div className="vn-lt__gesprek">
                {berichten.some((b) => b.rol === "bezoeker") ? (
                  <>
                    <div className="vn-lt__gkop">
                      <span className="vn-lt__av">{letters}</span>
                      <span>
                        <b>{naam}</b>
                        <small>{geboekt ? geboekt.contact : "Online now"}</small>
                      </span>
                    </div>
                    <div className="vn-lt__glijst">
                      {berichten.map((b) => (
                        <div className={`vn-lt__g vn-lt__g--${b.rol}`} key={b.id}>
                          <p>{b.tekst}</p>
                          <time>
                            {b.rol === "volgo" ? "Volgo · " : ""}
                            {b.tijd}
                          </time>
                        </div>
                      ))}
                      {bezig ? <p className="vn-lt__gtypt">Volgo is answering…</p> : null}
                      {geboekt ? (
                        <div className="vn-lt__melding">
                          <b>New appointment</b>
                          <span>
                            {geboekt.naam} · {geboekt.tijd}
                          </span>
                          <small>Saved as a request, added to the calendar and confirmed to the customer. In this test nothing is sent.</small>
                        </div>
                      ) : null}
                      <div ref={inboxEind} />
                    </div>
                    <div className="vn-lt__gvoet">Volgo answers. The owner can type here to take over.</div>
                  </>
                ) : (
                  <p className="vn-lt__leeg">The chat opens here as soon as a visitor writes.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

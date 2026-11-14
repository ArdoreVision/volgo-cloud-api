import { useEffect, useRef, useState } from "react";

/**
 * The pain, while you scroll: one inbox after another appears, each with the request that is waiting there.
 * At the end they all slide into one Volgo inbox. The stage stays in place (sticky) while the page scrolls.
 * Without JavaScript, or with reduced motion, everything is simply shown at once.
 */
const INBOXEN: { id: string; naam: string; teller: string; wie: string; bericht: string; pijn: string; titel: string; tekst: string }[] = [
  {
    id: "mail",
    naam: "Email",
    teller: "14 unread",
    wie: "Anna de Vries",
    bericht: "Hi, do you still have room next week?",
    pijn: "Sent 2 days ago",
    titel: "Your email.",
    tekst: "A request between invoices and newsletters. You open it two days later. Anna already booked somewhere else.",
  },
  {
    id: "whatsapp",
    naam: "WhatsApp",
    teller: "6 chats",
    wie: "Mark",
    bericht: "Is Saturday still free? 🙏",
    pijn: "Read 3 hours ago, no reply",
    titel: "WhatsApp.",
    tekst: "You read it between two jobs and think: I'll answer tonight. Tonight you forget.",
  },
  {
    id: "instagram",
    naam: "Instagram DMs",
    teller: "9 requests",
    wie: "sara.amrani",
    bericht: "How much for the full package?",
    pijn: "In Requests, never seen",
    titel: "Instagram.",
    tekst: "New people land in Requests. You don't even get a notification for them.",
  },
  {
    id: "bellen",
    naam: "Phone",
    teller: "3 missed",
    wie: "+31 6 •• •• 42 17",
    bericht: "Missed call · no voicemail",
    pijn: "While you were working",
    titel: "Your phone.",
    tekst: "Three missed calls while your hands were busy. Who were they? You'll never know.",
  },
  {
    id: "formulier",
    naam: "Contact form",
    teller: "4 new",
    wie: "Tom Bakker",
    bericht: "Quote request: full interior",
    pijn: "In another mailbox for 4 days",
    titel: "Your contact form.",
    tekst: "It sends to an address you rarely check. The request is warm on day one, cold on day four.",
  },
];
const STAPPEN = INBOXEN.length + 1;

export function PijnScroll() {
  const ref = useRef<HTMLElement | null>(null);
  const [stap, setStap] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setStap(STAPPEN);
      return;
    }
    let raf = 0;
    const meet = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const ruimte = r.height - window.innerHeight;
      const p = ruimte > 0 ? Math.min(1, Math.max(0, -r.top / ruimte)) : 1;
      // First step shows as soon as the section reaches the top; the last one (all together) in the final part.
      setStap(Math.min(STAPPEN - 1, Math.floor(p * STAPPEN)));
    };
    const op = () => {
      if (!raf) raf = requestAnimationFrame(meet);
    };
    meet();
    window.addEventListener("scroll", op, { passive: true });
    window.addEventListener("resize", op);
    return () => {
      window.removeEventListener("scroll", op);
      window.removeEventListener("resize", op);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const samen = stap >= STAPPEN - 1;
  const huidig = INBOXEN[Math.max(0, Math.min(stap, INBOXEN.length - 1))];
  const statisch = stap === STAPPEN;

  return (
    <section aria-labelledby="vn-pijn-titel" className={`vn-pijn${statisch ? " is-statisch" : ""}${samen ? " is-samen" : ""}`} ref={ref}>
      <div className="vn-pijn__plak">
        <div className="vn-pijn__tekst">
          <p className="vn-oog">{samen ? "With Volgo" : `Inbox ${Math.max(1, stap + 1)} of ${INBOXEN.length}`}</p>
          <h2 className="vn-h2" id="vn-pijn-titel">
            {samen ? (
              <>
                One inbox.
                <br />
                <em>Nobody waits.</em>
              </>
            ) : (
              <>
                {huidig.titel}
                <br />
                <em>Someone is waiting.</em>
              </>
            )}
          </h2>
          <p className="vn-sub" key={samen ? "samen" : huidig.id}>
            {samen
              ? "Every chat, form and booking lands in one place. Volgo answers right away, books the appointment and follows up after 1 and 3 days. You only look in one inbox."
              : huidig.tekst}
          </p>
          <ol aria-hidden="true" className="vn-pijn__bolletjes">
            {Array.from({ length: STAPPEN }).map((_, i) => (
              <li className={i <= stap ? "is-aan" : ""} key={i} />
            ))}
          </ol>
        </div>

        <div aria-hidden="true" className="vn-pijn__podium">
          {INBOXEN.map((b, i) => (
            <div className={`vn-pijn__kaart vn-pijn__kaart--${b.id}${i <= stap ? " is-zicht" : ""}${i === stap && !samen ? " is-nu" : ""}`} key={b.id} style={{ ["--i" as string]: i }}>
              <div className="vn-pijn__kop">
                <span className={`vn-pijn__ico vn-pijn__ico--${b.id}`} />
                <b>{b.naam}</b>
                <em>{b.teller}</em>
              </div>
              <div className="vn-pijn__rij">
                <strong>{b.wie}</strong>
                <span>{b.bericht}</span>
                <small>{b.pijn}</small>
              </div>
            </div>
          ))}

          <div className={`vn-pijn__volgo${samen ? " is-zicht" : ""}`}>
            <div className="vn-pijn__kop">
              <span className="vn-pijn__ico vn-pijn__ico--volgo" />
              <b>Volgo inbox</b>
              <em className="is-ok">All in one place</em>
            </div>
            {INBOXEN.map((b, i) => (
              <div className="vn-pijn__vrij" key={b.id} style={{ ["--i" as string]: i }}>
                <strong>{b.wie}</strong>
                <span>{b.bericht}</span>
                <small>
                  {b.naam} · {i === 0 || i === 4 ? "Booked" : i === 3 ? "Called back" : "Answered in 1 min"}
                </small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

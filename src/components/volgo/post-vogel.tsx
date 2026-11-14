import { useEffect, useRef, useState } from "react";

/**
 * Volgo's post bird: flies down the page with you while you scroll and, at every section, says what it does.
 * It delivers: answers your customers, brings every request to you, and books the appointment for you both.
 * Sections tell it what to say with data-vogel="…". With reduced motion it simply stays put.
 */
export function VogelSvg({ envelop = true }: { envelop?: boolean }) {
  return (
    <svg aria-hidden="true" className="pv-svg" viewBox="0 0 120 110">
      <g className="pv-lijf">
        <path className="pv-staart" d="M22 62 L4 52 L10 66 L2 74 L24 70 Z" fill="#0a0b0d" />
        <ellipse cx="54" cy="60" fill="#0a0b0d" rx="34" ry="28" />
        <ellipse cx="60" cy="68" fill="#ffffff" rx="20" ry="15" />
        <circle cx="76" cy="44" fill="#0a0b0d" r="20" />
        <circle cx="82" cy="40" fill="#ffffff" r="6.5" />
        <circle cx="84" cy="40" fill="#0a0b0d" r="3.2" />
        <circle cx="85.2" cy="38.8" fill="#ffffff" r="1.1" />
        <path d="M94 44 L110 48 L94 52 Z" fill="#f59e0b" />
        {/* Postal cap */}
        <path d="M60 30 Q76 16 92 28 L92 31 L60 33 Z" fill="#0c7a43" />
        <rect fill="#0c7a43" height="4" rx="2" width="22" x="86" y="29" />
        <path className="pv-vleugel" d="M40 54 Q58 30 78 52 Q60 64 40 54 Z" fill="#26292f" />
        <path d="M48 86 L46 98 M58 86 L60 98" stroke="#f59e0b" strokeLinecap="round" strokeWidth="3" />
      </g>
      {envelop ? (
        <g className="pv-envelop">
          <rect fill="#ffffff" height="22" rx="3" stroke="#0a0b0d" strokeWidth="2.4" width="32" x="70" y="76" />
          <path d="M71 78 L86 89 L101 78" fill="none" stroke="#0a0b0d" strokeLinejoin="round" strokeWidth="2.4" />
          <circle cx="98" cy="80" fill="#0c7a43" r="4" />
        </g>
      ) : null}
    </svg>
  );
}

export function PostVogel() {
  const vogel = useRef<HTMLDivElement | null>(null);
  const [tekst, setTekst] = useState("Hi! I'm Volgo. I deliver your customers' messages.");
  const [zicht, setZicht] = useState(true);

  // Fly down with the page: the bird's height follows how far you have scrolled, with a little delay so it glides.
  useEffect(() => {
    const el = vogel.current;
    if (!el) return;
    const rustig = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let doel = 0;
    let nu = 0;
    let vorige = window.scrollY;
    let kanteling = 0;
    let raf = 0;
    const meet = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      doel = max > 0 ? window.scrollY / max : 0;
    };
    const stap = () => {
      nu += (doel - nu) * 0.08;
      const snel = window.scrollY - vorige;
      vorige = window.scrollY;
      kanteling += (Math.max(-14, Math.min(14, snel * 0.6)) - kanteling) * 0.12;
      el.style.setProperty("--pv-y", String(nu));
      el.style.setProperty("--pv-kantel", `${kanteling.toFixed(2)}deg`);
      raf = requestAnimationFrame(stap);
    };
    meet();
    nu = doel;
    if (rustig) el.style.setProperty("--pv-y", "0.5");
    else raf = requestAnimationFrame(stap);
    window.addEventListener("scroll", meet, { passive: true });
    window.addEventListener("resize", meet);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", meet);
      window.removeEventListener("resize", meet);
    };
  }, []);

  // What it says: the line of the section in the middle of the screen.
  useEffect(() => {
    const delen = [...document.querySelectorAll<HTMLElement>("[data-vogel]")];
    if (!delen.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (es) => {
        const zichtbaar = es.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (zichtbaar) setTekst((zichtbaar.target as HTMLElement).dataset.vogel ?? "");
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    delen.forEach((d) => io.observe(d));
    // Out of the way at the very bottom (footer), so it never covers the legal links.
    const voet = document.querySelector("footer");
    const io2 = voet ? new IntersectionObserver(([e]) => setZicht(!e.isIntersecting), { threshold: 0.1 }) : null;
    if (voet && io2) io2.observe(voet);
    return () => {
      io.disconnect();
      io2?.disconnect();
    };
  }, []);

  return (
    <div aria-hidden="true" className={`pv${zicht ? "" : " is-weg"}`} ref={vogel}>
      <p className="pv-ballon" key={tekst}>
        {tekst}
      </p>
      <div className="pv-vlieg">
        <VogelSvg />
      </div>
    </div>
  );
}

/**
 * Between "Start" and the payment page: the bird flies the post across while Stripe opens.
 * Shown by sending the "volgo-laden" event (see toonVogelLader).
 */
export function VogelLader() {
  const [open, setOpen] = useState<string | null>(null);
  const [stap, setStap] = useState(0);
  useEffect(() => {
    const op = (e: Event) => {
      setOpen((e as CustomEvent<string>).detail || "Volgo");
      setStap(0);
    };
    const dicht = () => setOpen(null);
    window.addEventListener("volgo-laden", op);
    window.addEventListener("volgo-laden-stop", dicht);
    // Coming back from the payment page with the browser's back button: no lingering overlay.
    window.addEventListener("pageshow", dicht);
    return () => {
      window.removeEventListener("volgo-laden", op);
      window.removeEventListener("volgo-laden-stop", dicht);
      window.removeEventListener("pageshow", dicht);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const t = [setTimeout(() => setStap(1), 900), setTimeout(() => setStap(2), 1900)];
    return () => t.forEach(clearTimeout);
  }, [open]);
  if (!open) return null;
  const regels = [`Preparing ${open}…`, "Your Volgo is ready to go live", "Opening secure payment…"];
  return (
    <div aria-live="polite" className="pv-lader" role="status">
      <div className="pv-lader__lucht">
        <span className="pv-lader__wolk" />
        <span className="pv-lader__wolk pv-lader__wolk--2" />
        <div className="pv-lader__vogel">
          <VogelSvg />
        </div>
      </div>
      <p className="pv-lader__tekst" key={stap}>
        {regels[stap]}
      </p>
      <ol className="pv-lader__stappen">
        <li className={stap >= 0 ? "is-aan" : ""}>Answers your customers</li>
        <li className={stap >= 1 ? "is-aan" : ""}>Brings every request to you</li>
        <li className={stap >= 2 ? "is-aan" : ""}>Books the appointment for you both</li>
      </ol>
      <small>One step left: pay securely with Stripe. Volgo goes live right after.</small>
    </div>
  );
}

export const toonVogelLader = (naam: string) => window.dispatchEvent(new CustomEvent("volgo-laden", { detail: naam }));
export const stopVogelLader = () => window.dispatchEvent(new Event("volgo-laden-stop"));

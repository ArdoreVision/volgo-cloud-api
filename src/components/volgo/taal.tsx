import { useEffect, useState } from "react";

import { vertaalTeksten } from "@/lib/api/vertaal.functions";
import { TALEN, isTaal } from "@/lib/talen";

const SLEUTEL = "volgo-taal";
const EVENT = "volgo-taal";

export function huidigeTaal(): string {
  if (typeof window === "undefined") return "en";
  try {
    const t = localStorage.getItem(SLEUTEL);
    if (t && isTaal(t)) return t;
  } catch {
    /* private mode */
  }
  const b = (navigator.language || "en").slice(0, 2).toLowerCase();
  return isTaal(b) ? b : "en";
}

export function kiesTaal(code: string) {
  if (!isTaal(code)) return;
  try {
    localStorage.setItem(SLEUTEL, code);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: code }));
}

/* ------------------------------------------------------------------ */
/* The translator: swaps every visible text on the public pages        */
/* ------------------------------------------------------------------ */

const ORIGINEEL = new WeakMap<Node, string>();
const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "KBD", "SVG", "IFRAME", "VIDEO"]);
const cache = new Map<string, Map<string, string>>(); // taal → (bron → vertaling)
const alleVertalingen = new Set<string>();

function vertaalbaar(t: string) {
  const s = t.trim();
  if (s.length < 2) return false;
  if (/^[\d\s.,:;€$%+\-–—/()·×→←•|]+$/.test(s)) return false; // numbers, prices, symbols
  if (/^(https?:\/\/|www\.|[\w.+-]+@[\w-]+\.)/i.test(s)) return false;
  return true;
}
function overslaan(el: Element | null) {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP.has(e.tagName)) return true;
    if (e.hasAttribute("data-notranslate") || e.id === "volgo-ava" || e.classList.contains("v-dash")) return true;
  }
  return false;
}

type Doel = { node: Text } | { el: Element; attr: (typeof ATTRS)[number] };

function verzamel(root: ParentNode): { doel: Doel; bron: string }[] {
  const uit: { doel: Doel; bron: string }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n as Text;
      if (overslaan(t.parentElement)) continue;
      const nu = t.nodeValue ?? "";
      const orig = ORIGINEEL.get(t);
      // A node whose text React just re-rendered holds a fresh English original again.
      const bron = orig !== undefined && (nu === orig || cacheHit(nu)) ? orig : nu;
      if (!vertaalbaar(bron)) continue;
      ORIGINEEL.set(t, bron);
      uit.push({ doel: { node: t }, bron });
    } else {
      const el = n as Element;
      if (overslaan(el)) continue;
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        const key = `${a}`;
        const nu = el.getAttribute(a) ?? "";
        const store = attrStore(el);
        const orig = store.get(key);
        const bron = orig !== undefined && (nu === orig || cacheHit(nu)) ? orig : nu;
        if (!vertaalbaar(bron)) continue;
        store.set(key, bron);
        uit.push({ doel: { el, attr: a }, bron });
      }
    }
  }
  return uit;
}
const ATTR_ORIG = new WeakMap<Element, Map<string, string>>();
function attrStore(el: Element) {
  let m = ATTR_ORIG.get(el);
  if (!m) ATTR_ORIG.set(el, (m = new Map()));
  return m;
}
/** Is this exact string one of our own translations (any language)? Then it is not a new original. */
function cacheHit(s: string) {
  return alleVertalingen.has(s);
}

let bezig: Promise<void> | null = null;
let gewenst = "en";
let actueel = "en"; // language the page currently shows

async function pasToe(taal: string): Promise<void> {
  gewenst = taal;
  if (bezig) {
    // A run is busy: let it finish (it stops early when the wanted language changed), then run again for the latest wish.
    await bezig;
    if (!bezig && gewenst !== actueel) return pasToe(gewenst);
    return;
  }
  bezig = (async () => {
    try {
      const root = document.body;
      const items = verzamel(root);
      if (taal === "en") {
        for (const it of items) zet(it.doel, it.bron);
        document.documentElement.lang = "en";
        actueel = "en";
        return;
      }
      const m = cache.get(taal) ?? new Map<string, string>();
      cache.set(taal, m);
      const open = [...new Set(items.map((i) => i.bron).filter((b) => !m.has(b)))];
      const toepassen = () => {
        for (const it of items) {
          const v = m.get(it.bron);
          if (v) zet(it.doel, v);
        }
      };
      toepassen(); // whatever is cached already shows at once
      // Top of the page first, in small batches, so the visitor sees the translation build up within a second or two.
      for (let i = 0; i < open.length; i += 60) {
        const stuk = open.slice(i, i + 60);
        const r = await vertaalTeksten({ data: { taal, teksten: stuk } }).catch(() => null);
        if (r?.vertalingen)
          for (const [k, v] of Object.entries(r.vertalingen)) {
            m.set(k, v);
            alleVertalingen.add(v);
          }
        if (gewenst !== taal) return;
        toepassen();
      }
      document.documentElement.lang = taal;
      actueel = taal;
    } finally {
      bezig = null;
    }
  })();
  return bezig;
}
function zet(d: Doel, tekst: string) {
  if ("node" in d) {
    if (d.node.nodeValue !== tekst) d.node.nodeValue = tekst;
  } else if (d.el.getAttribute(d.attr) !== tekst) d.el.setAttribute(d.attr, tekst);
}

/** Mount once on public pages. Translates on load, on language change, and whenever the page content changes. */
export function Vertaler() {
  useEffect(() => {
    let taal = huidigeTaal();
    let timer = 0;
    let eerste = 0;
    const run = () => {
      // Trailing debounce with a ceiling: even when the page keeps mutating, we run at least every 600 ms.
      const nu = Date.now();
      if (!eerste) eerste = nu;
      window.clearTimeout(timer);
      const wacht = nu - eerste > 600 ? 0 : 120;
      timer = window.setTimeout(() => {
        eerste = 0;
        void pasToe(taal);
      }, wacht);
    };
    (window as unknown as { __volgoTaal?: unknown }).__volgoTaal = { status: () => ({ taal, bezig: Boolean(bezig), gewenst, actueel }), run: () => void pasToe(taal) };
    const opTaal = (e: Event) => {
      taal = (e as CustomEvent<string>).detail;
      run();
    };
    window.addEventListener(EVENT, opTaal);
    const mo = new MutationObserver((muts) => {
      if (taal === "en") return;
      // Ignore our own writes: only react when something changed that is not already translated.
      if (muts.some((m) => m.type === "childList" || (m.type === "characterData" && !cacheHit((m.target as Text).nodeValue ?? "")))) run();
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    if (taal !== "en") run();
    return () => {
      window.removeEventListener(EVENT, opTaal);
      mo.disconnect();
      window.clearTimeout(timer);
    };
  }, []);
  return null;
}

/* ------------------------------------------------------------------ */
/* The picker (nav + consent card)                                     */
/* ------------------------------------------------------------------ */

export function TaalKiezer({ compact = false }: { compact?: boolean }) {
  const [taal, setTaal] = useState("en");
  useEffect(() => {
    setTaal(huidigeTaal());
    const op = (e: Event) => setTaal((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, op);
    return () => window.removeEventListener(EVENT, op);
  }, []);
  return (
    <label className={`v-taal${compact ? " v-taal--compact" : ""}`} data-notranslate="">
      <span aria-hidden="true" className="v-taal__ico">
        <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
        </svg>
      </span>
      <select
        aria-label="Language"
        onChange={(e) => {
          setTaal(e.target.value);
          kiesTaal(e.target.value);
        }}
        value={taal}
      >
        {TALEN.map((t) => (
          <option key={t.code} value={t.code}>
            {compact ? t.code.toUpperCase() : t.naam}
          </option>
        ))}
      </select>
    </label>
  );
}

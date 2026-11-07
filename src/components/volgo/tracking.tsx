import { useEffect } from "react";

import { haalTracking } from "@/lib/api/admin.functions";

declare global {
  interface Window {
    fbq?: (...a: unknown[]) => void;
    gtag?: (...a: unknown[]) => void;
    dataLayer?: unknown[];
    __volgoTracking?: { meta: string; google: string; geladen: boolean };
    /** Pixel calls waiting until the visitor accepted and the pixel is loaded. Never sent without consent. */
    __volgoPixelWacht?: (() => void)[];
  }
}

/** Did the visitor click "Accept" on the consent screen (stored by ava.js)? */
function toestemming(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      if (!k.startsWith("volgo-ok-")) continue;
      const v = JSON.parse(localStorage.getItem(k) || "null") as { ja?: boolean } | null;
      if (v?.ja) return true;
    }
  } catch {
    /* private mode */
  }
  return false;
}

function laad(ids: { meta: string; google: string }) {
  if (window.__volgoTracking?.geladen) return;
  window.__volgoTracking = { ...ids, geladen: true };
  if (ids.meta) {
    // Meta's official bootstrap, typed loosely on purpose.
    const w = window as unknown as Record<string, unknown>;
    if (!w.fbq) {
      const n = function (this: unknown, ...a: unknown[]) {
        const self = n as unknown as { callMethod?: (...x: unknown[]) => void; queue: unknown[] };
        if (self.callMethod) self.callMethod.apply(self, a);
        else self.queue.push(a);
      } as unknown as { callMethod?: unknown; queue: unknown[]; push: unknown; loaded: boolean; version: string };
      n.queue = [];
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      w.fbq = n;
      if (!w._fbq) w._fbq = n;
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);
    }
    // No automatic page scraping or button-text collection, and no extra PageView when the page jumps to #demo / #pricing.
    (window.fbq as unknown as { disablePushState?: boolean }).disablePushState = true;
    window.fbq!("set", "autoConfig", false, ids.meta);
    window.fbq!("init", ids.meta);
    window.fbq!("track", "PageView");
  }
  if (ids.google) {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids.google)}`;
    document.head.appendChild(s);
    window.gtag("js", new Date());
    window.gtag("config", ids.google, { anonymize_ip: true });
  }
  // Events that happened before the pixel was allowed to load (e.g. a purchase on the welcome page).
  const wacht = window.__volgoPixelWacht ?? [];
  window.__volgoPixelWacht = [];
  for (const f of wacht) {
    try {
      f();
    } catch {
      /* never block the page */
    }
  }
}

/** Run a pixel call now if the pixel is loaded (consent given), else queue it until it is. */
function viaPixel(f: () => void) {
  if (typeof window === "undefined") return;
  if (window.__volgoTracking?.geladen) {
    try {
      f();
    } catch {
      /* never block the page */
    }
    return;
  }
  (window.__volgoPixelWacht ??= []).push(f);
}

/** Mount once on public pages. Loads Meta Pixel / Google tag only when IDs are set AND the visitor accepted. */
export function Tracking() {
  useEffect(() => {
    let ids: { meta: string; google: string } | null = null;
    const probeer = () => {
      if (ids && (ids.meta || ids.google) && toestemming()) laad(ids);
    };
    void haalTracking()
      .then((r) => {
        ids = r;
        probeer();
      })
      .catch(() => undefined);
    const op = (e: Event) => {
      if ((e as CustomEvent<boolean>).detail) probeer();
    };
    window.addEventListener("volgo-ok", op);
    return () => window.removeEventListener("volgo-ok", op);
  }, []);
  return null;
}

/* ------------------------------------------------------------------ */
/* Funnel of the ad landing page                                       */
/* ------------------------------------------------------------------ */

/**
 * Steps of the landing page funnel. Stored in Volgo's own cookieless analytics (site_events, per session, no content,
 * no personal data) via the Volgo script on this page, and, only with consent, sent to the Meta / Google pixel.
 */
export type FunnelStap = "demo_klik" | "demo_bericht" | "abo_klik";

const PIXEL_NAAM: Record<FunnelStap, string> = { demo_klik: "TryAvaClick", demo_bericht: "DemoFirstMessage", abo_klik: "ViewPlansClick" };

type AvaMeet = { meet?: (s: string) => void };

/** Count one funnel step, at most once per browser session. Safe to call anywhere. */
export function meet(stap: FunnelStap) {
  if (typeof window === "undefined") return;
  try {
    const k = `volgo-f-${stap}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch {
    /* private mode: still count, duplicates are filtered per session on the server */
  }
  // First-party: the Volgo script on thevolgo.app may still be loading, so retry for a few seconds.
  let pogingen = 0;
  const stuur = () => {
    const ava = (window as unknown as { VolgoAva?: AvaMeet }).VolgoAva;
    if (ava?.meet) return ava.meet(stap);
    if (++pogingen < 40) window.setTimeout(stuur, 250);
  };
  stuur();
  viaPixel(() => {
    window.fbq?.("trackCustom", PIXEL_NAAM[stap]);
    window.gtag?.("event", stap);
  });
}

/**
 * Fire a purchase after a confirmed Stripe payment. eventId makes Meta/Google drop duplicates, and the browser
 * remembers it so a reload never sends it twice. Waits for the pixel (i.e. consent); without consent nothing is sent.
 */
export function conversie(waarde: number, plan: string, eventId: string) {
  try {
    const k = `volgo-aankoop-${eventId}`;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
  } catch {
    /* private mode */
  }
  viaPixel(() => {
    window.fbq?.("track", "Purchase", { value: waarde, currency: "EUR", content_name: plan }, { eventID: eventId });
    window.gtag?.("event", "purchase", { transaction_id: eventId, value: waarde, currency: "EUR", items: [{ item_name: `Volgo ${plan}` }] });
  });
}

/** Short, non-reversible id for a payment (from the Stripe checkout id), so nothing identifying leaves the site. */
export async function aankoopId(token: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`volgo-aankoop|${token}`));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

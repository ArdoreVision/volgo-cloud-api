import { useEffect } from "react";

import { haalTracking } from "@/lib/api/admin.functions";

declare global {
  interface Window {
    fbq?: (...a: unknown[]) => void;
    gtag?: (...a: unknown[]) => void;
    dataLayer?: unknown[];
    __volgoTracking?: { meta: string; google: string; geladen: boolean };
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
    const f = (...a: unknown[]) => {
      (f as unknown as { queue: unknown[] }).queue.push(a);
    };
    (f as unknown as { queue: unknown[] }).queue = [];
    window.fbq = window.fbq || (f as unknown as (...a: unknown[]) => void);
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
    window.fbq("init", ids.meta);
    window.fbq("track", "PageView");
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

/** Fire a conversion (new paying customer). Safe to call when no pixel is loaded. */
export function conversie(waarde: number, plan: string) {
  try {
    window.fbq?.("track", "Purchase", { value: waarde, currency: "EUR", content_name: plan });
    window.gtag?.("event", "purchase", { value: waarde, currency: "EUR", items: [{ item_name: `Volgo ${plan}` }] });
  } catch {
    /* never block the page */
  }
}

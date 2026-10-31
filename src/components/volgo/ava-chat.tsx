import { useEffect } from "react";

/** Volgo's own AVA (the same chat our customers get), on thevolgo.app. Leads and booked calls land in the Volgo dashboard. */
export const VOLGO_AVA_SLEUTEL = "c2c0abaa339e5c0a8c9e4064";

type AvaApi = { open: () => void; afspraak: () => void; vraag: (t: string) => void };
const api = () => (typeof window !== "undefined" ? (window as unknown as { VolgoAva?: AvaApi }).VolgoAva : undefined);

export function openAva() {
  api()?.open();
}

export function AvaChat() {
  useEffect(() => {
    if (document.querySelector("script[data-volgo-eigen]")) return;
    const s = document.createElement("script");
    s.src = "/ava.js";
    s.defer = true;
    s.setAttribute("data-key", VOLGO_AVA_SLEUTEL);
    s.setAttribute("data-volgo-eigen", "1");
    document.body.appendChild(s);
  }, []);
  return null;
}

export function TryAvaButton() {
  return (
    <button className="v-try-ava" data-ava-open="" type="button">
      <img alt="" height={28} src="/assets/volgo/ava.png" width={28} />
      Try AVA yourself
    </button>
  );
}

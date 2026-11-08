import { useEffect, useState } from "react";

import { bewaarPush, haalPushSleutel, testPush, verwijderPush } from "@/lib/api/push.functions";

type Staat = "laden" | "niet" | "ios" | "uit" | "aan" | "geweigerd";

const naarBytes = (s: string) => {
  const t = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(t, (c) => c.charCodeAt(0));
};

function apparaatNaam() {
  const u = navigator.userAgent;
  if (/iPhone|iPad/.test(u)) return "iPhone";
  if (/Android/.test(u)) return "Android";
  if (/Mac/.test(u)) return "Mac";
  if (/Windows/.test(u)) return "Windows";
  return "Browser";
}

/** Settings → Notifications: turn push notifications on for this phone or computer. */
export function Meldingen() {
  const [staat, setStaat] = useState<Staat>("laden");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState("");

  useEffect(() => {
    void (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const losseApp = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setStaat(ios && !losseApp ? "ios" : "niet");
      if (Notification.permission === "denied") return setStaat("geweigerd");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setStaat(sub ? "aan" : "uit");
    })().catch(() => setStaat("niet"));
  }, []);

  async function zetAan() {
    setBezig(true);
    setMelding("");
    try {
      const toestemming = await Notification.requestPermission();
      if (toestemming !== "granted") {
        setStaat(toestemming === "denied" ? "geweigerd" : "uit");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const { sleutel } = await haalPushSleutel();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: naarBytes(sleutel) });
      const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await bewaarPush({ data: { endpoint: j.endpoint, keys: j.keys, apparaat: apparaatNaam() } });
      await testPush();
      setStaat("aan");
      setMelding("Klaar. Je ziet nu een testmelding.");
    } catch {
      setMelding("Dat lukte niet op dit apparaat. Probeer het opnieuw of gebruik een andere browser.");
    } finally {
      setBezig(false);
    }
  }

  async function zetUit() {
    setBezig(true);
    try {
      const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
      if (sub) {
        await verwijderPush({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setStaat("uit");
      setMelding("");
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="v-dash__panel">
      <h2 className="v-sub">Pushmeldingen op dit apparaat</h2>
      <p className="v-muted">Krijg een melding op je telefoon zodra iemand op je website begint te chatten, en wanneer iemand een afspraak boekt.</p>

      {staat === "laden" ? <p className="v-muted v-small">Dit apparaat controleren…</p> : null}

      {staat === "aan" ? (
        <div className="v-push">
          <p>
            <strong>Aan</strong> voor dit apparaat.
          </p>
          <div className="v-push__knoppen">
            <button className="v-dash__logout" disabled={bezig} onClick={() => void testPush().then(() => setMelding("Test verstuurd."))} type="button">
              Stuur een test
            </button>
            <button className="v-dash__logout" disabled={bezig} onClick={() => void zetUit()} type="button">
              Uitzetten
            </button>
          </div>
        </div>
      ) : null}

      {staat === "uit" ? (
        <button className="v-btn-blauw" disabled={bezig} onClick={() => void zetAan()} type="button">
          {bezig ? "Een moment…" : "Meldingen aanzetten"}
        </button>
      ) : null}

      {staat === "geweigerd" ? (
        <p className="v-muted">Meldingen zijn geblokkeerd voor Volgo op dit apparaat. Sta ze toe in je browser- of telefooninstellingen en kom dan terug.</p>
      ) : null}

      {staat === "ios" ? (
        <ol className="v-push__stappen">
          <li>
            Open <strong>thevolgo.app/dashboard</strong> in Safari.
          </li>
          <li>
            Tik op de deelknop, daarna op <strong>Zet op beginscherm</strong>.
          </li>
          <li>Open Volgo vanaf je beginscherm en kom terug naar deze pagina om meldingen aan te zetten.</li>
        </ol>
      ) : null}

      {staat === "niet" ? <p className="v-muted">Deze browser kan geen meldingen ontvangen. Gebruik Chrome, Edge, Firefox of Safari op je telefoon of computer.</p> : null}

      {melding ? <p className="v-small">{melding}</p> : null}
      <p className="v-muted v-small">Zet het één keer aan op elke telefoon of computer waar je de meldingen wilt.</p>
    </section>
  );
}

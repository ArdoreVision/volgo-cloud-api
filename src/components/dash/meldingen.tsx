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
      setMelding("Done. You should see a test notification now.");
    } catch {
      setMelding("That didn't work on this device. Try again, or use another browser.");
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
      <h2 className="v-sub">Push notifications on this device</h2>
      <p className="v-muted">Get a message on your phone the moment someone starts chatting on your website, and when someone books an appointment.</p>

      {staat === "laden" ? <p className="v-muted v-small">Checking this device…</p> : null}

      {staat === "aan" ? (
        <div className="v-push">
          <p>
            <strong>On</strong> for this device.
          </p>
          <div className="v-push__knoppen">
            <button className="v-dash__logout" disabled={bezig} onClick={() => void testPush().then(() => setMelding("Test sent."))} type="button">
              Send a test
            </button>
            <button className="v-dash__logout" disabled={bezig} onClick={() => void zetUit()} type="button">
              Turn off
            </button>
          </div>
        </div>
      ) : null}

      {staat === "uit" ? (
        <button className="v-btn-blauw" disabled={bezig} onClick={() => void zetAan()} type="button">
          {bezig ? "One moment…" : "Turn on notifications"}
        </button>
      ) : null}

      {staat === "geweigerd" ? (
        <p className="v-muted">Notifications are blocked for Volgo on this device. Allow them in your browser or phone settings, then come back here.</p>
      ) : null}

      {staat === "ios" ? (
        <ol className="v-push__stappen">
          <li>
            Open <strong>thevolgo.app/dashboard</strong> in Safari.
          </li>
          <li>
            Tap the share button, then <strong>Add to Home Screen</strong>.
          </li>
          <li>Open Volgo from your home screen and come back to this page to turn notifications on.</li>
        </ol>
      ) : null}

      {staat === "niet" ? <p className="v-muted">This browser can't receive notifications. Use Chrome, Edge, Firefox or Safari on your phone or computer.</p> : null}

      {melding ? <p className="v-small">{melding}</p> : null}
      <p className="v-muted v-small">Turn it on once on every phone or computer where you want the messages.</p>
    </section>
  );
}

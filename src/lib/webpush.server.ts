import type { D1Database } from "@cloudflare/workers-types";

/**
 * Web Push without external libraries (VAPID, RFC 8292 + message encryption, RFC 8291 aes128gcm).
 * Works on Android, desktop browsers and on iPhone when Volgo is added to the home screen (iOS 16.4+).
 */

const enc = new TextEncoder();
const b64u = (b: ArrayBuffer | Uint8Array) => {
  const a = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (const x of a) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const vanB64u = (s: string) => {
  const t = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(t, (c) => c.charCodeAt(0));
};
const samen = (...d: Uint8Array[]) => {
  const uit = new Uint8Array(d.reduce((n, x) => n + x.length, 0));
  let i = 0;
  for (const x of d) {
    uit.set(x, i);
    i += x.length;
  }
  return uit;
};
const buf = (u: Uint8Array) => u as unknown as ArrayBuffer;

async function hmac(sleutel: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", buf(sleutel), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, buf(data)));
}

/** The app's VAPID key pair; created and stored on first use. */
export async function vapid(DB: D1Database) {
  const r = await DB.prepare("SELECT publiek, prive FROM push_sleutels WHERE id = 1").first<{ publiek: string; prive: string }>();
  if (r) return r;
  const paar = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const publiek = b64u((await crypto.subtle.exportKey("raw", paar.publicKey)) as ArrayBuffer);
  const prive = JSON.stringify(await crypto.subtle.exportKey("jwk", paar.privateKey));
  await DB.prepare("INSERT OR IGNORE INTO push_sleutels (id, publiek, prive) VALUES (1, ?, ?)").bind(publiek, prive).run();
  return (await DB.prepare("SELECT publiek, prive FROM push_sleutels WHERE id = 1").first<{ publiek: string; prive: string }>())!;
}

async function vapidKop(endpoint: string, s: { publiek: string; prive: string }) {
  const aud = new URL(endpoint).origin;
  const kop = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:hallo@thevolgo.app" })));
  const k = await crypto.subtle.importKey("jwk", JSON.parse(s.prive), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, buf(enc.encode(`${kop}.${claims}`)));
  return `vapid t=${kop}.${claims}.${b64u(sig)}, k=${s.publiek}`;
}

/** Encrypts the message for one device (RFC 8291). */
async function versleutel(p256dh: string, auth: string, tekst: string) {
  const uaPub = vanB64u(p256dh);
  const geheim = vanB64u(auth);
  const eigen = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const asPub = new Uint8Array((await crypto.subtle.exportKey("raw", eigen.publicKey)) as ArrayBuffer);
  const hun = await crypto.subtle.importKey("raw", buf(uaPub), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: hun } as unknown as EcdhKeyDeriveParams, eigen.privateKey, 256));
  const prkKey = await hmac(geheim, ecdh);
  const ikm = await hmac(prkKey, samen(enc.encode("WebPush: info\0"), uaPub, asPub, new Uint8Array([1])));
  const zout = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(zout, ikm);
  const cek = (await hmac(prk, samen(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, samen(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const k = await crypto.subtle.importKey("raw", buf(cek), "AES-GCM", false, ["encrypt"]);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: buf(nonce) }, k, buf(samen(enc.encode(tekst), new Uint8Array([2])))));
  const rs = new Uint8Array([0, 0, 16, 0]);
  return samen(zout, rs, new Uint8Array([asPub.length]), asPub, data);
}

type Abo = { id: number; endpoint: string; p256dh: string; auth: string };

/**
 * Sends a notification to every phone/browser of this team that turned notifications on.
 * Never throws; devices that unsubscribed (404/410) are removed.
 */
export async function pushNaarTeam(DB: D1Database, team: number, titel: string, tekst: string, link = "/dashboard") {
  try {
    const abos = (await DB.prepare("SELECT id, endpoint, p256dh, auth FROM push_abonnementen WHERE team_id = ?").bind(team).all<Abo>()).results;
    if (!abos.length) return;
    const s = await vapid(DB);
    const bericht = JSON.stringify({ titel: titel.slice(0, 120), tekst: tekst.slice(0, 300), link });
    await Promise.all(
      abos.map(async (a) => {
        try {
          const body = await versleutel(a.p256dh, a.auth, bericht);
          const r = await fetch(a.endpoint, {
            method: "POST",
            headers: { Authorization: await vapidKop(a.endpoint, s), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high" },
            body,
            signal: AbortSignal.timeout(4000),
          });
          if (r.status === 404 || r.status === 410) await DB.prepare("DELETE FROM push_abonnementen WHERE id = ?").bind(a.id).run();
        } catch (err) {
          console.error("[webpush]", err);
        }
      }),
    );
  } catch (err) {
    console.error("[webpush]", err);
  }
}

import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import { bindings } from "./bindings.server";

const COOKIE = "volgo_sessie";
const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (h: string) => new Uint8Array(h.match(/.{2}/g)?.map((x) => parseInt(x, 16)) ?? []);

export function randomToken(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return hex(a);
}
export async function sha256(v: string) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(v)));
}

// PBKDF2-SHA256, 100.000 rondes, per wachtwoord een eigen salt.
export async function hashWachtwoord(pw: string, saltHex = randomToken(16)) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unhex(saltHex), iterations: 100000 }, key, 256);
  return `pbkdf2$${saltHex}$${hex(bits)}`;
}
export async function checkWachtwoord(pw: string, opgeslagen: string) {
  const [, salt, h] = opgeslagen.split("$");
  if (!salt || !h) return false;
  const nieuw = (await hashWachtwoord(pw, salt)).split("$")[2];
  if (nieuw.length !== h.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ nieuw.charCodeAt(i);
  return diff === 0;
}

export type Gebruiker = {
  id: number;
  email: string;
  naam: string;
  bedrijf: string;
  plan: string;
  status: string;
  proef_tot: string | null;
  testmodus: number;
  created_at: string;
  team_id: number;
  rol: string;
};

export async function maakSessie(gebruikerId: number) {
  const { DB } = bindings();
  if (!DB) throw new Error("Geen database");
  const token = randomToken();
  await DB.prepare("INSERT INTO sessies (token_hash, gebruiker_id, verloopt) VALUES (?, ?, datetime('now', '+30 days'))")
    .bind(await sha256(token), gebruikerId)
    .run();
  setCookie(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function huidigeGebruiker(): Promise<Gebruiker | null> {
  const { DB } = bindings();
  const token = getCookie(COOKIE);
  if (!DB || !token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await DB.prepare(
    `SELECT g.id, g.email, g.naam, g.bedrijf, g.plan, g.status, g.proef_tot, g.testmodus, g.created_at,
            COALESCE(t.team_id, g.id) AS team_id, COALESCE(t.rol, 'eigenaar') AS rol
     FROM sessies s JOIN gebruikers g ON g.id = s.gebruiker_id
     LEFT JOIN team_leden t ON t.gebruiker_id = g.id
     WHERE s.token_hash = ? AND s.verloopt > datetime('now')`,
  )
    .bind(await sha256(token))
    .first<Gebruiker>();
  return row ?? null;
}

export async function stopSessie() {
  const { DB } = bindings();
  const token = getCookie(COOKIE);
  if (DB && token) await DB.prepare("DELETE FROM sessies WHERE token_hash = ?").bind(await sha256(token)).run();
  deleteCookie(COOKIE, { path: "/" });
}

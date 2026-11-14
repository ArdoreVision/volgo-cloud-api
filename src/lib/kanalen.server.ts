import type { D1Database } from "@cloudflare/workers-types";

import { bindings } from "./bindings.server";

/**
 * Channels next to the website chat.
 *
 * Two different things, never presented as the same:
 * - Click buttons: a WhatsApp link (wa.me) and a call link (tel:) with the business's own number.
 *   They work as soon as the number is filled in, but the conversation then happens in WhatsApp or
 *   on the phone. Volgo does not see it.
 * - Integrations: incoming WhatsApp messages (WhatsApp Business Platform, Meta) and calls/texts via a
 *   Volgo phone number (Twilio) land in the Volgo inbox and can be answered from there. These only
 *   work once the platform keys are set (server-side secrets) and Volgo linked the business's number.
 */

export type KanaalStatus = {
  id: "website" | "whatsapp_knop" | "bel_knop" | "whatsapp" | "telefoon";
  soort: "chat" | "knop" | "koppeling";
  status: "actief" | "uit" | "niet_gekoppeld" | "aangevraagd";
  ontbreekt: string[];
};

type KanaalInst = {
  zakelijk_nummer: string;
  knop_whatsapp: number;
  knop_bellen: number;
  wa_phone_id: string;
  twilio_nummer: string;
  sms_terug: number;
  kanaal_wens: string;
};

/** Dutch-friendly phone normalisation to E.164 (+31…). Returns "" when it is not a phone number. */
export function normNummer(t: string) {
  let d = (t ?? "").trim().replace(/[^\d+]/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = `+${d.slice(2)}`;
  if (d.startsWith("0") && d.length === 10) d = `+31${d.slice(1)}`;
  if (!d.startsWith("+")) d = d.length >= 11 ? `+${d}` : "";
  return /^\+[1-9]\d{7,14}$/.test(d) ? d : "";
}

/** Platform-wide: are the provider keys there? (Values never leave the server.) */
export function platform() {
  const b = bindings();
  const wa: string[] = [];
  if (!b.WHATSAPP_TOKEN) wa.push("WHATSAPP_TOKEN");
  if (!b.WHATSAPP_APP_SECRET) wa.push("WHATSAPP_APP_SECRET");
  if (!b.WHATSAPP_VERIFY_TOKEN) wa.push("WHATSAPP_VERIFY_TOKEN");
  const tel: string[] = [];
  if (!b.TWILIO_SID) tel.push("TWILIO_SID");
  if (!b.TWILIO_TOKEN) tel.push("TWILIO_TOKEN");
  return { whatsapp: { klaar: wa.length === 0, ontbreekt: wa }, telefoon: { klaar: tel.length === 0, ontbreekt: tel } };
}

export async function kanaalInst(DB: D1Database, team: number) {
  return DB.prepare("SELECT zakelijk_nummer, knop_whatsapp, knop_bellen, wa_phone_id, twilio_nummer, sms_terug, kanaal_wens FROM ava_instellingen WHERE team_id = ?")
    .bind(team)
    .first<KanaalInst>();
}

/** The honest status of every channel for one business, in words the business understands. */
export function kanaalStatus(i: KanaalInst, websiteActief: boolean): KanaalStatus[] {
  const p = platform();
  const wens = i.kanaal_wens.split(",");
  const geenNummer = i.zakelijk_nummer ? [] : ["Your business number"];
  const koppeling = (id: "whatsapp" | "telefoon", gekoppeld: boolean, platformKlaar: boolean): KanaalStatus => {
    const ontbreekt: string[] = [];
    if (!platformKlaar) ontbreekt.push(id === "whatsapp" ? "Volgo's WhatsApp connection (Meta) is not set up yet" : "Volgo's phone connection (Twilio) is not set up yet");
    if (!gekoppeld) ontbreekt.push(id === "whatsapp" ? "Your WhatsApp number is not verified and connected yet" : "You do not have a Volgo phone number yet");
    const status = ontbreekt.length === 0 ? "actief" : wens.includes(id) ? "aangevraagd" : "niet_gekoppeld";
    return { id, soort: "koppeling", status, ontbreekt };
  };
  return [
    { id: "website", soort: "chat", status: websiteActief ? "actief" : "uit", ontbreekt: websiteActief ? [] : ["The chat code is not on your website yet"] },
    { id: "whatsapp_knop", soort: "knop", status: i.knop_whatsapp && i.zakelijk_nummer ? "actief" : "uit", ontbreekt: i.knop_whatsapp ? geenNummer : [] },
    { id: "bel_knop", soort: "knop", status: i.knop_bellen && i.zakelijk_nummer ? "actief" : "uit", ontbreekt: i.knop_bellen ? geenNummer : [] },
    koppeling("whatsapp", Boolean(i.wa_phone_id), p.whatsapp.klaar),
    koppeling("telefoon", Boolean(i.twilio_nummer), p.telefoon.klaar),
  ];
}

// ── Signatures (webhooks are only trusted when signed by the provider) ──

const enc = new TextEncoder();

async function hmac(alg: "SHA-1" | "SHA-256", sleutel: string, data: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(sleutel), { name: "HMAC", hash: alg }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}
function gelijk(a: string, b: string) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

/** Meta: X-Hub-Signature-256 = "sha256=" + hex(HMAC-SHA256(app secret, raw body)). */
export async function metaHandtekeningKlopt(ruw: string, kop: string | null) {
  const { WHATSAPP_APP_SECRET } = bindings();
  if (!WHATSAPP_APP_SECRET || !kop?.startsWith("sha256=")) return false;
  const hex = [...(await hmac("SHA-256", WHATSAPP_APP_SECRET, ruw))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return gelijk(`sha256=${hex}`, kop);
}

/** Twilio: X-Twilio-Signature = base64(HMAC-SHA1(auth token, full URL + sorted key+value pairs)). */
export async function twilioHandtekeningKlopt(url: string, velden: Record<string, string>, kop: string | null) {
  const { TWILIO_TOKEN } = bindings();
  if (!TWILIO_TOKEN || !kop) return false;
  const data = url + Object.keys(velden).sort().map((k) => k + velden[k]).join("");
  const sig = btoa(String.fromCharCode(...(await hmac("SHA-1", TWILIO_TOKEN, data))));
  return gelijk(sig, kop);
}

// ── Sending ─────────────────────────────────────────────

/** Sends a WhatsApp text from the business's linked number. Free-form text only works within 24 hours of the customer's last message. */
export async function stuurWhatsApp(phoneId: string, naar: string, tekst: string) {
  const { WHATSAPP_TOKEN } = bindings();
  if (!WHATSAPP_TOKEN || !phoneId) return { ok: false, fout: "WhatsApp is nog niet gekoppeld." };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: naar.replace(/^\+/, ""), type: "text", text: { preview_url: false, body: tekst.slice(0, 4000) } }),
      signal: AbortSignal.timeout(10000),
    });
    if (r.ok) return { ok: true, fout: "" };
    const j = (await r.json().catch(() => ({}))) as { error?: { code?: number; message?: string } };
    if (j.error?.code === 131047)
      return { ok: false, fout: "Meer dan 24 uur sinds het laatste bericht van de klant: WhatsApp staat dan alleen goedgekeurde sjablonen toe. Bel de klant of stuur een sms." };
    return { ok: false, fout: `WhatsApp weigerde het bericht${j.error?.message ? `: ${j.error.message}` : ""}.` };
  } catch {
    return { ok: false, fout: "WhatsApp was niet bereikbaar. Probeer het opnieuw." };
  }
}

/** Sends a text message from the business's Volgo number (or the platform number). */
export async function stuurSmsVan(van: string, naar: string, tekst: string) {
  const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM } = bindings();
  const from = van || TWILIO_FROM;
  if (!TWILIO_SID || !TWILIO_TOKEN || !from) return { ok: false, fout: "Sms is nog niet gekoppeld." };
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: naar, From: from, Body: tekst.slice(0, 1200) }),
      signal: AbortSignal.timeout(10000),
    });
    return r.ok ? { ok: true, fout: "" } : { ok: false, fout: "De sms kon niet verstuurd worden." };
  } catch {
    return { ok: false, fout: "Sms was niet bereikbaar. Probeer het opnieuw." };
  }
}

export const xml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const twiml = (inhoud = "") => new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${inhoud}</Response>`, { headers: { "Content-Type": "text/xml; charset=utf-8" } });

import type { D1Database } from "@cloudflare/workers-types";

import { bindings } from "./bindings.server";
import { SITE_URL, esc, verstuurMail } from "./mail.server";

/**
 * Quick replies for By Intent team applications.
 * Damien gets a notification with buttons; one tap mails the applicant a personal message
 * ("Hi Tom, I'm in a meeting…") from Damien, and logs it in the Volgo conversation.
 */

export const KEUZES = {
  meeting: { label: "In a meeting", tekst: (n: string) => `Hi ${n}, thanks for applying! I'm in a meeting right now. I'll call you as soon as I have time.` },
  busy: { label: "Busy now", tekst: (n: string) => `Hi ${n}, thanks for applying! I'm busy right now, but I'll get back to you later today.` },
  tomorrow: { label: "Tomorrow", tekst: (n: string) => `Hi ${n}, thanks for applying! I'm not available today. I'll get back to you tomorrow.` },
  soon: { label: "Seen it, calling soon", tekst: (n: string) => `Hi ${n}, thanks for applying! I've seen your application and I'll call you soon.` },
} as const;
export type Keuze = keyof typeof KEUZES;
export const isKeuze = (k: string): k is Keuze => k in KEUZES;

const AFZENDER = "Damien · By Intent <hallo@thevolgo.app>";
const ANTWOORD_AAN = "damienhanssens@outlook.com";

/** Signature that makes a quick-reply link work only for Damien (the applicant never sees it). */
export async function teken(token: string) {
  const b = bindings() as unknown as Record<string, string | undefined>;
  const geheim = b.PUSH_TOPIC || b.RESEND_API_KEY || b.ANTHROPIC_API_KEY || "volgo";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(`snel:${geheim}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token)));
  return [...sig.slice(0, 12)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function snelLink(token: string, keuze?: Keuze) {
  return `${SITE_URL}/api/snel/${token}?s=${await teken(token)}${keuze ? `&k=${keuze}` : ""}`;
}

/** Notification on Damien's phone: tap it for all choices, or tap a button to reply straight away. */
export async function meldAanmelding(token: string, naam: string, onderwerp: string, samenvatting: string) {
  const { push } = await import("./push.server");
  await push(`🙋 ${onderwerp}: ${naam}`, `${samenvatting}\n\nTap a button to let them know, or open for more.`, {
    tags: ["raising_hand"],
    prioriteit: 5,
    link: await snelLink(token),
    acties: await Promise.all((["meeting", "busy", "tomorrow"] as const).map(async (k) => ({ label: KEUZES[k].label, url: await snelLink(token, k) }))),
  });
}

export type Aanmelder = { gesprek: number; naam: string; voornaam: string; email: string; onderwerp: string; laatst: string | null };

export async function aanmelder(DB: D1Database, token: string): Promise<Aanmelder | null> {
  const m = await DB.prepare(
    "SELECT m.gesprek_id, m.naam, m.contact, g.onderwerp FROM ava_gesprek_meta m JOIN ava_gesprekken g ON g.id = m.gesprek_id WHERE m.token = ?",
  )
    .bind(token)
    .first<{ gesprek_id: number; naam: string | null; contact: string | null; onderwerp: string | null }>();
  if (!m || !m.onderwerp?.startsWith("Team application")) return null;
  const email = (m.contact ?? "").match(/[^\s·,;]+@[^\s·,;]+\.[^\s·,;]+/)?.[0] ?? "";
  const naam = (m.naam ?? "").trim() || "there";
  const laatst = await DB.prepare("SELECT tekst FROM ava_berichten WHERE gesprek_id = ? AND rol = 'mens' ORDER BY id DESC LIMIT 1")
    .bind(m.gesprek_id)
    .first<{ tekst: string }>();
  return { gesprek: m.gesprek_id, naam, voornaam: naam.split(/\s+/)[0], email, onderwerp: m.onderwerp, laatst: laatst?.tekst ?? null };
}

/** Mail the applicant from Damien and keep a copy in the Volgo conversation. */
export async function stuurSnel(DB: D1Database, a: Aanmelder, tekst: string) {
  if (!a.email) return false;
  const html = `<!doctype html><html><body style="margin:0;background:#fff;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0b0b0b">
<div style="max-width:520px;margin:0 auto">
<p style="margin:0 0 22px;font-size:13px;letter-spacing:.04em;color:#666">By Intent</p>
<p style="margin:0 0 18px;font-size:16px;line-height:1.6;white-space:pre-wrap">${esc(tekst)}</p>
<p style="margin:0;font-size:16px;line-height:1.6">Damien</p>
<p style="margin:28px 0 0;font-size:12px;color:#888">Applying is free. No costs, no course. You can reply to this email.</p>
</div></body></html>`;
  const ok = await verstuurMail(a.email, "About your application · By Intent", html, { van: AFZENDER, antwoordAan: ANTWOORD_AAN });
  if (ok)
    await DB.batch([
      DB.prepare("INSERT INTO ava_berichten (gesprek_id, rol, tekst) VALUES (?, 'mens', ?)").bind(a.gesprek, tekst.slice(0, 4000)),
      DB.prepare("INSERT INTO ava_berichten (gesprek_id, rol, tekst) VALUES (?, 'log', 'Sent by mail')").bind(a.gesprek),
      DB.prepare("UPDATE ava_gesprekken SET laatste = datetime('now'), berichten = berichten + 1 WHERE id = ?").bind(a.gesprek),
    ]);
  return ok;
}

import type { D1Database } from "@cloudflare/workers-types";

import { esc, verstuurMail } from "./mail.server";

/**
 * By Intent Groups. Flow: apply on the team page → Damien approves (notification / mail button) →
 * the applicant automatically gets a personal password by email → logs in on /groups → sees the Discord
 * link and which group to pick (Dev or Call, from the role they applied for).
 */

const DISCORD = "https://discord.com/channels/1569366921629929583/1569368447031447722";

export function groepVan(rol: string) {
  return /dev/i.test(rol) ? { naam: "Dev", uitleg: "You applied as developer: pick the Dev group." } : { naam: "Call", uitleg: "You applied as cold caller or closer: pick the Call group." };
}
export const discordLink = (_rol: string) => DISCORD;

/** Called when a team application comes in. */
export async function registreerAanmelding(DB: D1Database, token: string, naam: string, email: string, onderwerp: string) {
  if (!email) return;
  const rol = onderwerp.replace(/^Team application:\s*/i, "").trim() || "Unknown";
  await DB.prepare("INSERT OR IGNORE INTO groep_leden (token, naam, email, rol) VALUES (?, ?, ?, ?)").bind(token, naam.slice(0, 100) || "there", email.toLowerCase().slice(0, 160), rol.slice(0, 40)).run();
}

/** Easy to type, hard to guess: e.g. "maple-orbit-7342". */
function maakWachtwoord() {
  const w = ["amber", "atlas", "birch", "cedar", "comet", "coral", "delta", "ember", "falcon", "harbor", "indigo", "jade", "lumen", "maple", "nova", "onyx", "orbit", "pixel", "quartz", "raven", "sierra", "solar", "tidal", "vivid"];
  const r = crypto.getRandomValues(new Uint32Array(3));
  return `${w[r[0] % w.length]}-${w[r[1] % w.length]}-${1000 + (r[2] % 9000)}`;
}

/** Approve: create the password, store only its hash, mail it to the applicant. */
export async function keurGoed(DB: D1Database, token: string) {
  const l = await DB.prepare("SELECT id, naam, email, rol, status FROM groep_leden WHERE token = ?").bind(token).first<{ id: number; naam: string; email: string; rol: string; status: string }>();
  if (!l) return { ok: false, tekst: "No application with an email address found." };
  const ww = maakWachtwoord();
  const { hashWachtwoord } = await import("./auth.server");
  await DB.prepare("UPDATE groep_leden SET status = 'goedgekeurd', wachtwoord = ?, goedgekeurd = datetime('now') WHERE id = ?").bind(await hashWachtwoord(ww), l.id).run();
  const voornaam = l.naam.split(/\s+/)[0];
  const g = groepVan(l.rol);
  const html = `<!doctype html><html><body style="margin:0;background:#fff;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0b0b0b">
<div style="max-width:520px;margin:0 auto">
<p style="margin:0 0 22px;font-size:13px;letter-spacing:.04em;color:#666">By Intent · Groups</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6">Hi ${esc(voornaam)}, you're approved. Welcome to the team!</p>
<p style="margin:0 0 8px;font-size:16px;line-height:1.6">Log in to Groups with:</p>
<p style="margin:0 0 4px;font-size:15px">Email: <strong>${esc(l.email)}</strong></p>
<p style="margin:0 0 20px;font-size:15px">Password: <strong style="font-family:ui-monospace,Menlo,monospace">${esc(ww)}</strong></p>
<p style="margin:0 0 24px"><a href="https://thevolgo.app/groups" style="display:inline-block;background:#0b0b0b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">Open Groups</a></p>
<p style="margin:0 0 6px;font-size:15px;line-height:1.6">After logging in you get the link to our Discord. Join, then pick the <strong>${g.naam}</strong> group.</p>
<p style="margin:24px 0 0;font-size:12px;color:#888">Keep this password to yourself. Questions? Just reply to this email.</p>
</div></body></html>`;
  const ok = await verstuurMail(l.email, "You're in: your Groups login · By Intent", html, { van: "Damien · By Intent <hallo@thevolgo.app>", antwoordAan: "damienhanssens@outlook.com" });
  if (!ok) {
    // Without the email they can't log in: undo, so the approve button stays available.
    await DB.prepare("UPDATE groep_leden SET status = ?, wachtwoord = NULL, goedgekeurd = NULL WHERE id = ?").bind(l.status === "goedgekeurd" ? "wacht" : l.status, l.id).run();
    return { ok: false, tekst: `The email to ${l.email} could not be sent, so ${voornaam} is not approved yet. Try again in a minute.` };
  }
  return { ok: true, tekst: `${l.naam} is approved. Their password was emailed to ${l.email} (group: ${g.naam}).` };
}

export async function wijsAf(DB: D1Database, token: string) {
  await DB.prepare("UPDATE groep_leden SET status = 'afgewezen', wachtwoord = NULL WHERE token = ?").bind(token).run();
  return { ok: true, tekst: "Marked as not approved. No email was sent." };
}

/** Login on /groups: only approved members with the right password get the link. */
export async function logIn(DB: D1Database, email: string, ww: string) {
  const l = await DB.prepare("SELECT naam, rol, status, wachtwoord FROM groep_leden WHERE email = ? AND status = 'goedgekeurd' ORDER BY id DESC LIMIT 1")
    .bind(email.trim().toLowerCase())
    .first<{ naam: string; rol: string; status: string; wachtwoord: string | null }>();
  const { checkWachtwoord } = await import("./auth.server");
  if (!l?.wachtwoord || !(await checkWachtwoord(ww, l.wachtwoord))) return null;
  const g = groepVan(l.rol);
  return { naam: l.naam.split(/\s+/)[0], link: discordLink(l.rol), groep: g.naam, uitleg: g.uitleg };
}

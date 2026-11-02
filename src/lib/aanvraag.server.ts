// Gedeeld door het formulier en de AVA-chatbot: aanvraag opslaan + mailen.
import { bindings } from "./bindings.server";
import { VOLGO_INBOX } from "./mail.server";

/** Demo requests from the website and the Volgo chat land in the Volgo inbox (same address as every other notification). */
export const INBOX = VOLGO_INBOX;

export type Aanvraag = {
  naam: string;
  bedrijf: string;
  email: string;
  telefoon?: string;
  website?: string;
  branche?: string;
  wens?: string;
  bericht?: string;
  bron: "formulier" | "chat";
};

export async function hashIp(ip: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

export async function recentCount(table: "aanvragen" | "chat_log", ipHash: string, minutes: number) {
  const { DB } = bindings();
  if (!DB) return 0;
  const row = await DB.prepare(
    `SELECT COUNT(*) AS n FROM ${table} WHERE ip_hash = ? AND created_at > datetime('now', ?)`,
  )
    .bind(ipHash, `-${minutes} minutes`)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function saveAndMail(a: Aanvraag, ipHash: string): Promise<{ mailed: boolean }> {
  const { DB, RESEND_API_KEY } = bindings();
  if (DB) {
    await DB.prepare(
      "INSERT INTO aanvragen (naam, bedrijf, email, telefoon, website, branche, wens, bericht, ip_hash) VALUES (?,?,?,?,?,?,?,?,?)",
    )
      .bind(a.naam, a.bedrijf, a.email, a.telefoon ?? "", a.website ?? "", a.branche ?? "", a.wens ?? "", `${a.bron === "chat" ? "[via AVA chat] " : ""}${a.bericht ?? ""}`, ipHash)
      .run();
  }
  if (!RESEND_API_KEY) return { mailed: false };

  const rows: [string, string][] = [
    ["Name", a.naam],
    ["Company", a.bedrijf],
    ["Email", a.email],
    ["Phone", a.telefoon || "-"],
    ["Current website", a.website || "-"],
    ["Industry", a.branche || "-"],
    ["Interested in", a.wens || "-"],
    [a.bron === "chat" ? "Conversation summary" : "Message", a.bericht || "-"],
  ];
  const html =
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1d1d1f;max-width:560px">` +
    `<p style="color:#1677d9;font-weight:600;margin:0 0 6px">New demo request via ${a.bron === "chat" ? "the AVA chat" : "the form"}</p>` +
    `<h1 style="font-size:24px;margin:0 0 4px">${esc(a.naam)}</h1>` +
    `<p style="margin:0 0 18px;color:#6e6e73">${esc(a.bedrijf)}</p>` +
    `<table style="border-collapse:collapse;width:100%;font-size:14px">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:10px 0;border-top:1px solid #e5e5ea;color:#6e6e73;width:35%;vertical-align:top">${k}</td><td style="padding:10px 0;border-top:1px solid #e5e5ea;white-space:pre-line">${esc(v)}</td></tr>`,
      )
      .join("") +
    `</table><p style="font-size:13px;color:#6e6e73;margin-top:20px">Reply to this email to respond directly.</p></div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: bindings().MAIL_FROM || "Volgo <onboarding@resend.dev>",
        to: [INBOX],
        reply_to: a.email,
        subject: `New demo request${a.bron === "chat" ? " (AVA chat)" : ""}: ${a.bedrijf} (${a.naam})`,
        html,
        text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("[aanvraag] Resend", res.status, await res.text());
    return { mailed: res.ok };
  } catch (err) {
    console.error("[aanvraag] Resend fout", err);
    return { mailed: false };
  }
}

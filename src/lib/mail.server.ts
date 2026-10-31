import { bindings } from "./bindings.server";

export const SITE_URL = "https://thevolgo.app";

export const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** Nette, eenvoudige Volgo-mail. `inhoud` is al veilige HTML. */
export function mailOpmaak(kop: string, inhoud: string, knop?: { tekst: string; url: string }) {
  return `<!doctype html><html lang="nl"><body style="margin:0;background:#f5f7fa;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0b1220">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;padding:32px">
<p style="margin:0 0 20px;font-weight:600;font-size:15px;color:#1677d9">Volgo</p>
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;letter-spacing:-0.02em">${kop}</h1>
<div style="font-size:15px;line-height:1.6;color:#334155">${inhoud}</div>
${knop ? `<p style="margin:26px 0 0"><a href="${knop.url}" style="display:inline-block;background:#1677d9;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px">${knop.tekst}</a></p>` : ""}
</div>
<p style="max-width:520px;margin:18px auto 0;text-align:center;font-size:12px;color:#94a3b8">Volgo is een dienst van Hanssens Cornerstone Capital · Vlissingen · KvK 98133438</p>
</body></html>`;
}

/** Verstuurt een mail via Resend. Geeft false terug als mail (nog) niet is ingesteld of mislukt. */
export async function verstuurMail(aan: string, onderwerp: string, html: string) {
  const { RESEND_API_KEY, MAIL_FROM } = bindings();
  if (!RESEND_API_KEY) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: MAIL_FROM || "Volgo <onboarding@resend.dev>", to: [aan], subject: onderwerp, html }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

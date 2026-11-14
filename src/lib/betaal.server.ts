import type { D1Database } from "@cloudflare/workers-types";

import { esc } from "./mail.server";

export type Verzoek = {
  id: number;
  team_id: number;
  token: string;
  gesprek_id: number | null;
  naam: string;
  contact: string;
  bedrag: number;
  omschrijving: string;
  status: string;
  stripe_sessie: string | null;
  gemaakt: string;
  betaald: string | null;
};
type Bedrijf = { bedrijf: string; kleur: string; iban: string; stripe_sleutel: string; taal: string };

export const euro = (c: number) => `€ ${(c / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function haalVerzoek(DB: D1Database, token: string) {
  const v = await DB.prepare("SELECT * FROM betaalverzoeken WHERE token = ?").bind(token).first<Verzoek>();
  if (!v) return null;
  const b = await DB.prepare("SELECT g.bedrijf, a.kleur, a.iban, a.stripe_sleutel, a.taal FROM ava_instellingen a JOIN gebruikers g ON g.id = a.team_id WHERE a.team_id = ?")
    .bind(v.team_id)
    .first<Bedrijf>();
  return b ? { v, b } : null;
}

/** Creates a Stripe Checkout session on the business's own Stripe account (their key), so the money goes to them. */
export async function startCheckout(DB: D1Database, v: Verzoek, b: Bedrijf, basis: string) {
  const p = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(v.bedrag),
    "line_items[0][price_data][product_data][name]": `${v.omschrijving} · ${b.bedrijf}`.slice(0, 200),
    success_url: `${basis}/api/betaal/${v.token}?s={CHECKOUT_SESSION_ID}`,
    cancel_url: `${basis}/api/betaal/${v.token}`,
    "metadata[volgo]": v.token,
  });
  const mail = v.contact.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/)?.[0];
  if (mail) p.set("customer_email", mail);
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${b.stripe_sleutel}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: p,
  });
  const j = (await r.json()) as { id?: string; url?: string };
  if (!r.ok || !j.url) return null;
  await DB.prepare("UPDATE betaalverzoeken SET stripe_sessie = ? WHERE id = ?").bind(j.id ?? null, v.id).run();
  return j.url;
}

/** After returning from Stripe: check the session really is paid, then mark it. */
export async function controleerBetaald(DB: D1Database, v: Verzoek, b: Bedrijf, sessie: string) {
  if (v.status === "betaald") return true;
  if (!b.stripe_sleutel || !/^cs_[\w]+$/.test(sessie)) return false;
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessie}`, { headers: { Authorization: `Bearer ${b.stripe_sleutel}` } });
  const j = (await r.json()) as { payment_status?: string; metadata?: { volgo?: string } };
  if (!r.ok || j.payment_status !== "paid" || j.metadata?.volgo !== v.token) return false;
  const u = await DB.prepare("UPDATE betaalverzoeken SET status = 'betaald', betaald = datetime('now') WHERE id = ? AND status != 'betaald'").bind(v.id).run();
  if (u.meta?.changes) {
    const { pushNaarTeam } = await import("./webpush.server");
    await pushNaarTeam(DB, v.team_id, `Paid: ${euro(v.bedrag)}`, `${v.naam} · ${v.omschrijving}`, "/dashboard#betalingen");
    const { notitie } = await import("./automatisch.server");
    await notitie(DB, v.gesprek_id, `${v.naam} paid ${euro(v.bedrag)} for "${v.omschrijving}"`);
  }
  return true;
}

export function betaalPagina(v: Verzoek, b: Bedrijf, melding = "") {
  const nl = b.taal !== "en";
  const kleur = /^#[0-9a-f]{6}$/i.test(b.kleur) ? b.kleur : "#0a0a0a";
  const betaald = v.status === "betaald";
  const geannuleerd = v.status === "geannuleerd";
  const t = nl
    ? { titel: "Betaalverzoek", van: "van", betaal: "Betaal nu", betaaldK: "Betaald, dank je wel!", over: "Liever overmaken?", naar: "Maak het bedrag over naar", oV: "onder vermelding van", weg: "Dit betaalverzoek is niet meer geldig." }
    : { titel: "Payment request", van: "from", betaal: "Pay now", betaaldK: "Paid, thank you!", over: "Prefer a bank transfer?", naar: "Transfer the amount to", oV: "with reference", weg: "This payment request is no longer valid." };
  const kenmerk = `V${v.id}`;
  return `<!doctype html><html lang="${nl ? "nl" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(t.titel)} · ${esc(b.bedrijf)}</title>
<style>body{margin:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0b1220}main{max-width:440px;margin:40px auto;padding:0 16px}.k{background:#fff;border-radius:22px;padding:30px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 12px 40px rgba(15,23,42,.06)}.m{font-weight:600;color:${kleur};margin:0 0 18px}.b{font-size:40px;font-weight:700;letter-spacing:-.03em;margin:4px 0 6px}.o{color:#475569;margin:0 0 24px}button{width:100%;border:0;border-radius:999px;background:${kleur};color:#fff;font:600 16px/1 inherit;padding:16px;cursor:pointer}.ok{background:#ecfdf3;color:#067647;border-radius:14px;padding:14px;font-weight:600;text-align:center}.i{margin-top:22px;padding-top:18px;border-top:1px solid #eef2f6;font-size:14px;color:#475569;line-height:1.6}.f{color:#b42318;font-size:14px}small{display:block;text-align:center;color:#94a3b8;margin-top:18px}</style></head>
<body><main><div class="k"><p class="m">${esc(b.bedrijf)}</p><p style="margin:0;color:#64748b">${esc(t.titel)} ${t.van} ${esc(b.bedrijf)}</p><p class="b">${euro(v.bedrag)}</p><p class="o">${esc(v.omschrijving)}</p>
${melding ? `<p class="f">${esc(melding)}</p>` : ""}
${betaald ? `<p class="ok">✓ ${t.betaaldK}</p>` : geannuleerd ? `<p class="f">${t.weg}</p>` : b.stripe_sleutel ? `<form method="post"><button type="submit">${t.betaal}</button></form>` : ""}
${!betaald && !geannuleerd && b.iban ? `<div class="i"><strong>${b.stripe_sleutel ? t.over : t.naar.split(" ")[0]}</strong><br>${t.naar} <strong>${esc(b.iban)}</strong> (${esc(b.bedrijf)}) ${t.oV} <strong>${kenmerk}</strong>.</div>` : ""}
</div><small>Volgo</small></main></body></html>`;
}

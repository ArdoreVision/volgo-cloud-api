import type { D1Database } from "@cloudflare/workers-types";

import { instellingenVoorTeam } from "./ava.server";
import { bindings } from "./bindings.server";
import { leesProfiel, profielVoorAva } from "./profiel-vragen";

/**
 * Website builder by chat. The owner says what they want; Claude writes ONE self-contained HTML page.
 * The page is stored per team (sites.data), shown as a draft in the dashboard and, once published, served on /s/<slug>.
 * Every page is served in a sandbox (opaque origin), so nothing in it can reach thevolgo.app accounts.
 */
export type BouwBericht = { rol: "ik" | "volgo"; tekst: string };
export type SiteData = { html: string; chat: BouwBericht[] };

export const SITE_CSP =
  "sandbox allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox; default-src * data: blob: 'unsafe-inline'; frame-ancestors 'self'";
const MAX_HTML = 400_000;

export const leesSite = (json: string | null | undefined): SiteData => {
  try {
    const d = JSON.parse(json || "{}") as Partial<SiteData>;
    return { html: typeof d.html === "string" ? d.html : "", chat: Array.isArray(d.chat) ? d.chat.filter((b) => b && typeof b.tekst === "string").slice(-40) : [] };
  } catch {
    return { html: "", chat: [] };
  }
};

const slugVan = (bedrijf: string) => {
  const basis = bedrijf.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "site";
  const r = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 4);
  return `${basis}-${r}`;
};

export async function haalSite(DB: D1Database, team: number) {
  const r = await DB.prepare("SELECT slug, data, vorige, gepubliceerd FROM sites WHERE team_id = ?").bind(team).first<{ slug: string; data: string; vorige: string | null; gepubliceerd: number }>();
  return r ? { slug: r.slug, ...leesSite(r.data), heeftVorige: Boolean(r.vorige), gepubliceerd: Boolean(r.gepubliceerd) } : null;
}

/** The Volgo chat is always on the page, exactly once, with this team's key. */
export function metChat(html: string, sleutel: string) {
  const zonder = html.replace(/<script\b[^>]*ava\.js[^>]*>\s*<\/script>/gi, "");
  const tag = `<script src="https://thevolgo.app/ava.js" data-key="${sleutel}" defer></script>`;
  return /<\/body>/i.test(zonder) ? zonder.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${tag}\n</body>`) : `${zonder}\n${tag}`;
}

/** Claude answers with a short message and then the whole page. No page in the answer = only a message. */
export function splitsAntwoord(tekst: string) {
  const schoon = tekst.replace(/```html?/gi, "").replace(/```/g, "");
  const i = schoon.search(/<!doctype html/i);
  if (i < 0) return { bericht: schoon.trim(), html: "" };
  const eind = schoon.toLowerCase().lastIndexOf("</html>");
  return { bericht: schoon.slice(0, i).trim(), html: (eind > i ? schoon.slice(i, eind + 7) : schoon.slice(i)).trim() };
}

const SYSTEM = (bedrijf: string, info: string, profiel: string) => `You are the website builder inside Volgo. The owner of a business chats with you and you build their website.

BUSINESS
Name: ${bedrijf}
${profiel ? `Profile (answered by the owner):\n${profiel}\n` : ""}${info ? `Business information:\n${info}\n` : ""}
HOW YOU ANSWER
- Write in the language the owner writes in.
- First 1 to 3 short, plain sentences: what you built or changed, and one useful next step they could ask for. No markdown, no lists.
- Then, on a new line, the COMPLETE page as one HTML document starting with <!DOCTYPE html> and ending with </html>. Always the whole page, never a fragment or a diff. No code fences.
- If the owner only asks a question and nothing on the page has to change, answer in plain sentences and leave the HTML out.
- A vague first message is fine: build a strong first version straight away from what you know. Ask at most one question, after the page.

THE PAGE
- One self-contained file: all CSS in one <style>, small vanilla JavaScript inline only when needed. No frameworks, no build step.
- Modern, premium and calm: generous white space, strong typography, one accent colour, smooth but subtle scroll and hover animation. Works perfectly on a phone first.
- Fonts: system fonts, or one Google Font via <link>.
- Images: only image URLs the owner gave you. Otherwise use CSS gradients, shapes and inline SVG. Never link to stock photo sites or invent image URLs.
- Typical sections: header with name and one button, hero with a clear promise, services, how it works, about, frequently asked questions, contact, footer. Leave out what does not fit.
- Never invent facts: no made-up reviews, customer names, prices, phone numbers, addresses, opening hours, awards or numbers. If something is unknown, write neutral text or leave it out, and tell the owner what you still need.
- Buttons that should lead to an appointment get the attribute data-ava-book. Buttons that should open the chat get data-ava-open. Both are plain <button type="button"> elements. The Volgo chat assistant is added to the page automatically: do not add any chat script or chat widget yourself.
- Good <title> and meta description, lang attribute in the page's language, semantic headings, sufficient colour contrast.
- Keep it compact: no filler text, no comments in the code.`;

type Uit = { content: { type: string; text?: string }[]; stop_reason: string };

async function vraagClaude(key: string, model: string, system: string, messages: { role: string; content: string }[]) {
  const basis = (bindings() as { CLAUDE_API_URL?: string }).CLAUDE_API_URL || "https://api.anthropic.com";
  const res = await fetch(`${basis}/v1/messages`, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 16000, thinking: { type: "disabled" }, system, messages }),
    signal: AbortSignal.timeout(170_000),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  return (await res.json()) as Uit;
}

/** One chat turn: returns Volgo's message and, when the page changed, saves the new page as the draft. */
export async function bouwBeurt(DB: D1Database, team: number, vraag: string) {
  const { ANTHROPIC_API_KEY, CLAUDE_MODEL } = bindings();
  const bouwModel = (bindings() as { CLAUDE_BOUW_MODEL?: string }).CLAUDE_BOUW_MODEL;
  if (!ANTHROPIC_API_KEY) return { ok: false as const, message: "De websitebouwer is nu niet bereikbaar. Probeer het later opnieuw." };
  const inst = await instellingenVoorTeam(DB, team);
  const site = await haalSite(DB, team);
  const chat = site?.chat ?? [];

  const messages: { role: string; content: string }[] = [];
  for (const b of chat.slice(-8)) {
    const role = b.rol === "ik" ? "user" : "assistant";
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content += `\n${b.tekst}`;
    else messages.push({ role, content: b.tekst });
  }
  while (messages.length && messages[0].role !== "user") messages.shift();
  const nu = site?.html ? `This is the current page:\n\n${site.html}\n\nMy request: ${vraag}` : vraag;
  const last = messages[messages.length - 1];
  if (last && last.role === "user") last.content += `\n${nu}`;
  else messages.push({ role: "user", content: nu });

  const system = SYSTEM(inst.bedrijf, (inst.bedrijfsinfo || "").slice(0, 6000), profielVoorAva(leesProfiel(inst.profiel)));
  const modellen = [...new Set([bouwModel || "claude-sonnet-5-5", CLAUDE_MODEL || "claude-haiku-5-5"])];
  let uit: Uit | null = null;
  for (const m of modellen) {
    try {
      uit = await vraagClaude(ANTHROPIC_API_KEY, m, system, messages);
      break;
    } catch {
      uit = null;
    }
  }
  if (!uit) return { ok: false as const, message: "Het bouwen lukte nu niet. Probeer het over een minuut opnieuw." };

  const tekst = uit.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
  const { bericht, html } = splitsAntwoord(tekst);
  const afgekapt = uit.stop_reason === "max_tokens" || (html !== "" && !/<\/html>\s*$/i.test(html));
  if (html && (afgekapt || html.length > MAX_HTML))
    return { ok: false as const, message: "De pagina werd te groot om in één keer te bouwen. Vraag om een kortere versie, of pas één onderdeel tegelijk aan." };

  const antwoord = bericht || (html ? "Je website is bijgewerkt. Bekijk het voorbeeld." : "Kun je iets meer vertellen over wat je wilt?");
  const nieuweChat: BouwBericht[] = [...chat, { rol: "ik" as const, tekst: vraag }, { rol: "volgo" as const, tekst: antwoord }].slice(-40);
  const nieuweHtml = html ? metChat(html, inst.sleutel) : (site?.html ?? "");
  const data = JSON.stringify({ html: nieuweHtml, chat: nieuweChat });
  if (site) {
    // Keep the previous page for one step of "undo" when the page itself changed.
    if (html && site.html) await DB.prepare("UPDATE sites SET vorige = ?, data = ?, updated_at = datetime('now') WHERE team_id = ?").bind(site.html, data, team).run();
    else await DB.prepare("UPDATE sites SET data = ?, updated_at = datetime('now') WHERE team_id = ?").bind(data, team).run();
  } else {
    await DB.prepare("INSERT INTO sites (team_id, slug, data) VALUES (?, ?, ?)").bind(team, slugVan(inst.bedrijf), data).run();
  }
  return { ok: true as const, antwoord, gewijzigd: Boolean(html) };
}

/** Undo: swap the page with the previous one (so undo twice = redo). */
export async function vorigeSite(DB: D1Database, team: number) {
  const r = await DB.prepare("SELECT data, vorige FROM sites WHERE team_id = ?").bind(team).first<{ data: string; vorige: string | null }>();
  if (!r?.vorige) return false;
  const d = leesSite(r.data);
  await DB.prepare("UPDATE sites SET data = ?, vorige = ?, updated_at = datetime('now') WHERE team_id = ?").bind(JSON.stringify({ html: r.vorige, chat: d.chat }), d.html, team).run();
  return true;
}

export const paginaAntwoord = (html: string, cache: string) =>
  new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "x-volgo-csp": SITE_CSP, "Cache-Control": cache, "X-Robots-Tag": cache === "no-store" ? "noindex" : "all" } });

export const legePagina = (tekst: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Volgo</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;font-family:system-ui,sans-serif;color:#8c8c8c;background:#050505;text-align:center;padding:24px"><p style="max-width:420px;line-height:1.5">${tekst}</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "x-volgo-csp": SITE_CSP, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );

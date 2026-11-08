// Customer websites hosted in Volgo: files in R2 (one object per unique file, by hash), versions as manifests in D1.
// The owner edits a concept version from /admin; visitors only ever see the live version.
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

import { bindings } from "./bindings.server";

export type Manifest = Record<string, { hash: string; grootte: number; type: string }>;
export type Site = {
  id: number;
  team_id: number;
  slug: string;
  domein: string | null;
  domein_id: string | null;
  domein_status: string;
  live_versie: number | null;
  concept_versie: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};
export type Versie = { id: number; site_id: number; nummer: number; gemaakt_door: string; notitie: string; manifest: Manifest; token: string; created_at: string };

export const MAX_BESTAND = 5 * 1024 * 1024;
export const MAX_SITE = 50 * 1024 * 1024;
export const SITE_HOST = "sites.thevolgo.app";

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  mp4: "video/mp4",
  webm: "video/webm",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8",
};
export const isTekst = (type: string) => /^(text\/|application\/(json|xml)|image\/svg)/.test(type);
const ext = (pad: string) => (/\.([a-z0-9]+)$/i.exec(pad)?.[1] ?? "").toLowerCase();
export const typeVan = (pad: string) => TYPES[ext(pad)] ?? "";
export const isHtml = (pad: string) => /\.html?$/i.test(pad);

/** A safe file path inside a site, or null. */
export function normPad(p: string): string | null {
  let s = p.trim().replace(/\\/g, "/").replace(/^\.?\/+/, "");
  try {
    s = decodeURIComponent(s);
  } catch {
    return null;
  }
  if (!s || s.length > 200 || s.endsWith("/")) return null;
  if (!/^[A-Za-z0-9\-_./]+$/.test(s)) return null;
  if (s.split("/").some((d) => d === "" || d === "." || d === "..")) return null;
  if (!typeVan(s)) return null;
  return s;
}

async function sha(data: Uint8Array) {
  const d = await crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const token = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
const sleutel = (siteId: number, hash: string) => `sites/${siteId}/${hash}`;

export function r2(): R2Bucket {
  const b = (bindings() as unknown as { SITES?: R2Bucket }).SITES;
  if (!b) throw new Error("Website storage (R2) is not switched on yet.");
  return b;
}

// ── Sites and versions ──────────────────────────────────────────────
export async function siteVoorTeam(DB: D1Database, team: number) {
  return DB.prepare("SELECT * FROM klant_sites WHERE team_id = ?").bind(team).first<Site>();
}
export async function versie(DB: D1Database, id: number | null): Promise<Versie | null> {
  if (!id) return null;
  const r = await DB.prepare("SELECT * FROM site_versies WHERE id = ?").bind(id).first<Omit<Versie, "manifest"> & { manifest: string }>();
  if (!r) return null;
  let manifest: Manifest = {};
  try {
    manifest = JSON.parse(r.manifest) as Manifest;
  } catch {
    /* empty */
  }
  return { ...r, manifest };
}
export async function versies(DB: D1Database, siteId: number) {
  const r = await DB.prepare("SELECT id, nummer, gemaakt_door, notitie, created_at, LENGTH(manifest) AS m FROM site_versies WHERE site_id = ? ORDER BY nummer DESC LIMIT 40")
    .bind(siteId)
    .all<{ id: number; nummer: number; gemaakt_door: string; notitie: string; created_at: string }>();
  return r.results;
}

function slugVan(tekst: string) {
  return (
    tekst
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "site"
  );
}

const PLACEHOLDER = (naam: string) => `<!doctype html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${naam.replace(/[<>&"]/g, "")}</title>
<meta name="description" content="${naam.replace(/[<>&"]/g, "")}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#fafafa;color:#111}h1{font-size:clamp(28px,5vw,48px);letter-spacing:-.02em}</style></head>
<body><main><h1>${naam.replace(/[<>&"]/g, "")}</h1><p>Onze nieuwe website komt eraan.</p></main></body>
</html>`;

/** Creates the site for a customer, with a simple first page as concept version 1. */
export async function maakSite(DB: D1Database, team: number, bedrijf: string, door: string) {
  const bestaand = await siteVoorTeam(DB, team);
  if (bestaand) return bestaand;
  let slug = slugVan(bedrijf);
  for (let i = 2; await DB.prepare("SELECT id FROM klant_sites WHERE slug = ?").bind(slug).first(); i++) slug = `${slugVan(bedrijf).slice(0, 26)}-${i}`;
  await DB.prepare("INSERT INTO klant_sites (team_id, slug) VALUES (?, ?)").bind(team, slug).run();
  const site = (await siteVoorTeam(DB, team))!;
  await schrijf(DB, site, [{ pad: "index.html", data: new TextEncoder().encode(PLACEHOLDER(bedrijf)) }], [], door, "First page", {});
  return (await siteVoorTeam(DB, team))!;
}

async function nieuweVersie(DB: D1Database, site: Site, manifest: Manifest, door: string, notitie: string) {
  const max = await DB.prepare("SELECT MAX(nummer) AS n FROM site_versies WHERE site_id = ?").bind(site.id).first<{ n: number | null }>();
  const nummer = (max?.n ?? 0) + 1;
  const r = await DB.prepare("INSERT INTO site_versies (site_id, nummer, gemaakt_door, notitie, manifest, token) VALUES (?, ?, ?, ?, ?, ?) RETURNING id")
    .bind(site.id, nummer, door.slice(0, 60), notitie.slice(0, 300), JSON.stringify(manifest), token())
    .first<{ id: number }>();
  await DB.prepare("UPDATE klant_sites SET concept_versie = ?, updated_at = datetime('now') WHERE id = ?").bind(r!.id, site.id).run();
  return { id: r!.id, nummer };
}

/**
 * Writes and deletes files on top of the concept version (or on top of `basis` when given) and saves the result as a new concept version.
 * Every change is a version, so any step can be undone.
 */
export async function schrijf(
  DB: D1Database,
  site: Site,
  bestanden: { pad: string; data: Uint8Array }[],
  verwijder: string[],
  door: string,
  notitie: string,
  basis?: Manifest,
) {
  const R2 = r2();
  const manifest: Manifest = { ...(basis ?? (await versie(DB, site.concept_versie))?.manifest ?? {}) };
  for (const b of bestanden) {
    const pad = normPad(b.pad);
    if (!pad) throw new Error(`Not allowed as a file name: ${b.pad}`);
    if (b.data.byteLength > MAX_BESTAND) throw new Error(`${pad} is larger than 5 MB.`);
    if (isTekst(typeVan(pad)) && /(sk-ant-|sk_live_|sk_test_|re_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})/.test(new TextDecoder().decode(b.data)))
      throw new Error(`${pad} looks like it contains a secret key. Keys never go into website files.`);
    const hash = await sha(b.data);
    if (!(await R2.head(sleutel(site.id, hash)))) await R2.put(sleutel(site.id, hash), b.data);
    manifest[pad] = { hash, grootte: b.data.byteLength, type: typeVan(pad) };
  }
  for (const v of verwijder) {
    const pad = normPad(v);
    if (pad) delete manifest[pad];
  }
  const totaal = Object.values(manifest).reduce((s, f) => s + f.grootte, 0);
  if (totaal > MAX_SITE) throw new Error("The website would become larger than 50 MB.");
  return nieuweVersie(DB, site, manifest, door, notitie);
}

export async function leesBestand(siteId: number, manifest: Manifest, pad: string) {
  const f = manifest[pad];
  if (!f) return null;
  const o = await r2().get(sleutel(siteId, f.hash));
  if (!o) return null;
  return new Uint8Array(await o.arrayBuffer());
}
export async function leesTekst(siteId: number, manifest: Manifest, pad: string) {
  const b = await leesBestand(siteId, manifest, pad);
  return b ? new TextDecoder().decode(b) : null;
}

export async function publiceer(DB: D1Database, site: Site, versieId: number) {
  const v = await DB.prepare("SELECT id FROM site_versies WHERE id = ? AND site_id = ?").bind(versieId, site.id).first();
  if (!v) throw new Error("That version doesn't belong to this website.");
  await DB.prepare("UPDATE klant_sites SET live_versie = ?, status = 'live', updated_at = datetime('now') WHERE id = ?").bind(versieId, site.id).run();
}
/** Back to an older version: it becomes both the live version and the starting point for new changes. */
export async function zetTerug(DB: D1Database, site: Site, versieId: number) {
  const v = await DB.prepare("SELECT id FROM site_versies WHERE id = ? AND site_id = ?").bind(versieId, site.id).first();
  if (!v) throw new Error("That version doesn't belong to this website.");
  await DB.prepare("UPDATE klant_sites SET live_versie = ?, concept_versie = ?, status = 'live', updated_at = datetime('now') WHERE id = ?").bind(versieId, versieId, site.id).run();
}

export function liveUrl(site: Site) {
  return site.domein && site.domein_status === "actief" ? `https://${site.domein}` : `https://${site.slug}.${SITE_HOST}`;
}
export const voorbeeldUrl = (tok: string) => `/__site/${tok}/`;

// ── Serving ─────────────────────────────────────────────────────────
const EIGEN = (h: string) => h === "thevolgo.app" || h === "www.thevolgo.app" || h.endsWith(".workers.dev") || h === "localhost" || h === "127.0.0.1";

function pagina(titel: string, tekst: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${titel}</title><meta name="robots" content="noindex"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#fafafa;color:#111;text-align:center;padding:24px}h1{font-size:28px;letter-spacing:-.02em;margin:0 0 8px}p{opacity:.65;margin:0}</style></head><body><main><h1>${titel}</h1><p>${tekst}</p></main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

function vind(manifest: Manifest, pathname: string) {
  let p = pathname;
  try {
    p = decodeURIComponent(p);
  } catch {
    return null;
  }
  p = p.replace(/^\/+/, "");
  const kandidaten = p === "" || p.endsWith("/") ? [`${p}index.html`] : [p, `${p}.html`, `${p}/index.html`];
  for (const k of kandidaten) if (manifest[k]) return k;
  return null;
}

export function zetChatErin(html: string, sleutelKlant: string) {
  if (/\/ava\.js["'][^>]*data-key=/i.test(html) || /data-key=["'][^"']+["'][^>]*\/ava\.js/i.test(html)) return html;
  const tag = `<script src="https://thevolgo.app/ava.js" data-key="${sleutelKlant}" defer></script>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${tag}\n</body>`) : `${html}\n${tag}`;
}
/** Preview lives under /__site/{token}/ on thevolgo.app: make root-relative links point inside it. */
function herschrijf(tekst: string, tok: string, css: boolean) {
  const pre = `/__site/${tok}/`;
  let t = tekst.replace(/url\((['"]?)\/(?!\/)/g, `url($1${pre}`);
  if (!css) t = t.replace(/(\s(?:href|src|action|poster|data-src)\s*=\s*["'])\/(?!\/)/gi, `$1${pre}`).replace(/(\ssrcset\s*=\s*["'][^"']*)/gi, (m) => m.replace(/(^|,\s*|=\s*["'])\/(?!\/)/g, `$1${pre}`));
  return t;
}

async function bezorg(
  DB: D1Database,
  site: Site,
  v: Versie,
  pathname: string,
  request: Request,
  voorbeeld: string | null,
) {
  let pad = vind(v.manifest, pathname);
  let status = 200;
  if (!pad) {
    pad = v.manifest["404.html"] ? "404.html" : null;
    status = 404;
    if (!pad) return pagina("Page not found", "This page doesn't exist (anymore).", 404);
  }
  const f = v.manifest[pad];
  const kop: Record<string, string> = { "content-type": f.type, "x-content-type-options": "nosniff", etag: `"${f.hash}"` };
  if (voorbeeld) {
    kop["cache-control"] = "no-store";
    kop["content-security-policy"] = "sandbox allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox; frame-ancestors 'self'";
    kop["x-robots-tag"] = "noindex";
  } else kop["cache-control"] = isHtml(pad) ? "public, max-age=60" : "public, max-age=31536000, immutable";
  if (!voorbeeld && !isHtml(pad) && request.headers.get("if-none-match") === `"${f.hash}"`) return new Response(null, { status: 304, headers: kop });
  const o = await r2().get(sleutel(site.id, f.hash));
  if (!o) return pagina("Something went wrong", "This file is missing. The owner has been notified.", 500);
  if (request.method === "HEAD") return new Response(null, { status, headers: kop });
  if (isHtml(pad) || (voorbeeld && f.type.startsWith("text/css"))) {
    let t = await o.text();
    if (isHtml(pad)) {
      const k = await DB.prepare("SELECT sleutel FROM ava_instellingen WHERE team_id = ?").bind(site.team_id).first<{ sleutel: string }>();
      if (k?.sleutel) t = zetChatErin(t, k.sleutel);
    }
    if (voorbeeld) t = herschrijf(t, voorbeeld, !isHtml(pad));
    return new Response(t, { status, headers: kop });
  }
  return new Response(o.body as unknown as BodyInit, { status, headers: kop });
}

/** Answers website traffic: customer domains, {slug}.sites.thevolgo.app and the /__site/ preview. Returns null for Volgo's own pages. */
export async function serveerSite(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  const { DB } = bindings();
  const preview = /^\/__site\/([0-9a-f]{32})(\/.*)?$/.exec(url.pathname);
  if (!preview && EIGEN(host)) return null;
  if (!DB) return pagina("Unavailable", "Please try again in a minute.", 503);
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });

  if (preview) {
    const r = await DB.prepare("SELECT v.id, s.id AS sid FROM site_versies v JOIN klant_sites s ON s.id = v.site_id WHERE v.token = ?").bind(preview[1]).first<{ id: number; sid: number }>();
    if (!r) return pagina("Preview not found", "This preview link is no longer valid.", 404);
    const site = await DB.prepare("SELECT * FROM klant_sites WHERE id = ?").bind(r.sid).first<Site>();
    const v = await versie(DB, r.id);
    if (!site || !v) return pagina("Preview not found", "This preview link is no longer valid.", 404);
    return bezorg(DB, site, v, preview[2] ?? "/", request, preview[1]);
  }

  let site: Site | null = null;
  if (host.endsWith(`.${SITE_HOST}`)) site = await DB.prepare("SELECT * FROM klant_sites WHERE slug = ?").bind(host.slice(0, -SITE_HOST.length - 1)).first<Site>();
  else {
    const zonder = host.replace(/^www\./, "");
    site = await DB.prepare("SELECT * FROM klant_sites WHERE domein IN (?, ?, ?)").bind(host, zonder, `www.${zonder}`).first<Site>();
  }
  if (!site) return pagina("Website not found", "There is no website at this address.", 404);
  const eigenaar = await DB.prepare("SELECT status FROM gebruikers WHERE id = ?").bind(site.team_id).first<{ status: string }>();
  if (site.status === "uit" || !eigenaar || !["actief", "proef"].includes(eigenaar.status)) return pagina("Deze website is tijdelijk offline", "Kom later nog eens terug.", 503);
  const v = await versie(DB, site.live_versie);
  if (!v) return pagina("Binnenkort online", "Deze website komt eraan.", 200);
  return bezorg(DB, site, v, url.pathname, request, null);
}

// ── Checks ──────────────────────────────────────────────────────────
export type Controle = { ok: boolean; punten: { ernst: "rood" | "oranje" | "groen"; tekst: string }[] };

/** Checks the live website the way a visitor sees it, and saves the result. */
export async function controleerLive(DB: D1Database, site: Site): Promise<Controle> {
  const punten: Controle["punten"] = [];
  let ok = true;
  if (!site.live_versie) {
    punten.push({ ernst: "oranje", tekst: "Not published yet." });
    return { ok: true, punten };
  }
  const url = liveUrl(site);
  const start = Date.now();
  try {
    const r = await fetch(url, { headers: { "user-agent": "Volgo site check" }, redirect: "follow", signal: AbortSignal.timeout(10000) });
    const ms = Date.now() - start;
    const html = await r.text();
    if (!r.ok) {
      ok = false;
      punten.push({ ernst: "rood", tekst: `${url} answers with status ${r.status}.` });
    } else punten.push({ ernst: "groen", tekst: `Online with a valid certificate, loads in ${ms} ms.` });
    if (ms > 3000) punten.push({ ernst: "oranje", tekst: `Slow: the homepage took ${ms} ms.` });
    if (r.ok && !/\/ava\.js/.test(html)) {
      ok = false;
      punten.push({ ernst: "rood", tekst: "The Volgo chat is missing on the homepage." });
    }
  } catch {
    ok = false;
    punten.push({ ernst: "rood", tekst: `${url} can't be reached (down, DNS or certificate problem).` });
  }
  const chats = await DB.prepare("SELECT COUNT(*) AS n FROM ava_gesprekken WHERE team_id = ? AND voorbeeld = 0 AND gestart > datetime('now', '-14 days')").bind(site.team_id).first<{ n: number }>();
  punten.push({ ernst: chats?.n ? "groen" : "oranje", tekst: `${chats?.n ?? 0} chats in the last 14 days.` });
  await DB.prepare("INSERT INTO site_controles (site_id, ok, details) VALUES (?, ?, ?)").bind(site.id, ok ? 1 : 0, JSON.stringify(punten)).run();
  await DB.prepare("DELETE FROM site_controles WHERE site_id = ? AND id NOT IN (SELECT id FROM site_controles WHERE site_id = ? ORDER BY id DESC LIMIT 30)").bind(site.id, site.id).run();
  return { ok, punten };
}

/** Daily: check every published site and tell the owner when one is down or lost its chat. */
export async function controleerAlleSites() {
  const { DB } = bindings();
  if (!DB) return;
  const r = await DB.prepare("SELECT * FROM klant_sites WHERE live_versie IS NOT NULL AND status = 'live'").all<Site>();
  const { push } = await import("./push.server");
  for (const site of r.results) {
    const c = await controleerLive(DB, site).catch(() => null);
    if (c && !c.ok) {
      const b = await DB.prepare("SELECT bedrijf FROM gebruikers WHERE id = ?").bind(site.team_id).first<{ bedrijf: string }>();
      await push(`⚠️ Website problem: ${b?.bedrijf ?? site.slug}`, c.punten.filter((p) => p.ernst === "rood").map((p) => p.tekst).join(" "), { tags: ["warning"], prioriteit: 4, link: "https://thevolgo.app/admin" });
    }
  }
}

/** Checks the concept version itself: broken links, missing images, titles, big images. */
export async function controleerConcept(siteId: number, manifest: Manifest) {
  const punten: string[] = [];
  for (const [pad, f] of Object.entries(manifest)) {
    if (/^image\/(png|jpeg|webp|gif)/.test(f.type) && f.grootte > 600 * 1024) punten.push(`${pad} is ${Math.round(f.grootte / 1024)} KB: make it smaller for a faster site.`);
    if (!isHtml(pad)) continue;
    const html = (await leesTekst(siteId, manifest, pad)) ?? "";
    if (!/<title>[^<]+<\/title>/i.test(html)) punten.push(`${pad}: no <title>.`);
    if (!/<meta[^>]+name=["']description["']/i.test(html)) punten.push(`${pad}: no meta description.`);
    const map = pad.includes("/") ? pad.slice(0, pad.lastIndexOf("/") + 1) : "";
    for (const m of html.matchAll(/\s(?:href|src)\s*=\s*["']([^"'#?]+)/gi)) {
      const link = m[1].trim();
      if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(link)) continue;
      const doel = link.startsWith("/") ? link.slice(1) : new URL(link, `https://x/${map}`).pathname.slice(1);
      if (!vind(manifest, `/${doel}`)) punten.push(`${pad}: link or file "${link}" doesn't exist.`);
    }
  }
  punten.push("The Volgo chat is added to every page automatically when it is served.");
  return [...new Set(punten)].slice(0, 60);
}

// ── Importing ───────────────────────────────────────────────────────
function padVoorUrl(u: URL, html: boolean) {
  let p = u.pathname.replace(/^\/+/, "");
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep */
  }
  if (p === "" || p.endsWith("/")) p += "index.html";
  else if (html && !/\.html?$/i.test(p)) p += "/index.html";
  return normPad(p);
}

/** Fetches an existing website (same domain only, at most 50 pages) as a list of files. */
export async function haalWebsiteOp(start: string) {
  const begin = new URL(/^https?:\/\//i.test(start) ? start : `https://${start}`);
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(begin.hostname)) throw new Error("That isn't a public website.");
  const origin = begin.origin;
  const rij: { url: string; html: boolean }[] = [{ url: begin.toString(), html: true }];
  const gezien = new Set<string>();
  const bestanden: { pad: string; data: Uint8Array }[] = [];
  let paginas = 0;
  let totaal = 0;
  while (rij.length && bestanden.length < 400) {
    const { url } = rij.shift()!;
    const schoon = url.split("#")[0].split("?")[0];
    if (gezien.has(schoon)) continue;
    gezien.add(schoon);
    let r: Response;
    try {
      r = await fetch(schoon, { headers: { "user-agent": "Mozilla/5.0 (Volgo import)" }, redirect: "follow", signal: AbortSignal.timeout(10000) });
    } catch {
      continue;
    }
    if (!r.ok) continue;
    const ct = r.headers.get("content-type") ?? "";
    const isPagina = ct.includes("text/html");
    if (isPagina && ++paginas > 50) continue;
    const u = new URL(r.url || schoon);
    if (u.origin !== origin) continue;
    const pad = padVoorUrl(u, isPagina);
    if (!pad) continue;
    let data = new Uint8Array(await r.arrayBuffer());
    if (data.byteLength > MAX_BESTAND || totaal + data.byteLength > MAX_SITE) continue;
    if (isPagina || ct.includes("text/css")) {
      let t = new TextDecoder().decode(data);
      const links = isPagina ? [...t.matchAll(/\s(?:href|src|data-src|poster)\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]) : [];
      const urls = [...t.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)].map((m) => m[1]);
      for (const l of [...links, ...urls]) {
        if (/^(mailto:|tel:|data:|javascript:|#)/i.test(l)) continue;
        try {
          const n = new URL(l, u);
          if (n.origin !== origin) continue;
          const isLinkPagina = isPagina && links.includes(l) && !/\.[a-z0-9]{2,5}$/i.test(n.pathname);
          rij.push({ url: n.toString(), html: isLinkPagina || /\.html?$/i.test(n.pathname) });
        } catch {
          /* skip */
        }
      }
      t = t.split(origin).join("");
      data = new TextEncoder().encode(t);
    }
    totaal += data.byteLength;
    bestanden.push({ pad, data });
  }
  if (!bestanden.some((b) => b.pad === "index.html")) throw new Error("Couldn't fetch the homepage of that website.");
  return bestanden;
}

/** Files from a zip, without a shared top folder. */
export async function uitZip(zip: Uint8Array) {
  const { unzipSync } = await import("fflate");
  const alles = unzipSync(zip);
  const paden = Object.keys(alles).filter((p) => !p.endsWith("/") && !p.startsWith("__MACOSX/") && !/(^|\/)\./.test(p));
  const top = paden.length && paden.every((p) => p.split("/")[0] === paden[0].split("/")[0] && p.includes("/")) ? `${paden[0].split("/")[0]}/` : "";
  const uit: { pad: string; data: Uint8Array }[] = [];
  for (const p of paden) {
    const pad = normPad(p.slice(top.length));
    if (pad) uit.push({ pad, data: alles[p] });
  }
  if (!uit.some((b) => b.pad === "index.html")) throw new Error("The zip has no index.html.");
  return uit;
}

// ── Domains (Cloudflare for SaaS custom hostnames) ──────────────────
async function cf(pad: string, init?: RequestInit) {
  const b = bindings() as unknown as { CF_API_TOKEN?: string; CF_ZONE_ID?: string };
  if (!b.CF_API_TOKEN || !b.CF_ZONE_ID) throw new Error("Domain linking is not set up yet (CF_API_TOKEN and CF_ZONE_ID are missing).");
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${b.CF_ZONE_ID}/${pad}`, {
    ...init,
    headers: { authorization: `Bearer ${b.CF_API_TOKEN}`, "content-type": "application/json" },
  });
  const j = (await r.json()) as { success: boolean; errors?: { message: string }[]; result?: { id: string; status: string; ssl?: { status?: string } } };
  if (!j.success) throw new Error(j.errors?.[0]?.message ?? `Cloudflare ${r.status}`);
  return j.result!;
}
const domeinTekst = (status: string, ssl?: string) =>
  status === "active" && ssl === "active" ? "actief" : status === "active" ? "ssl" : status === "pending" ? "wacht" : status || "fout";

export async function koppelDomein(DB: D1Database, site: Site, domein: string) {
  const d = domein.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(d) || d.endsWith("thevolgo.app")) throw new Error("That isn't a valid domain name.");
  const ander = await DB.prepare("SELECT id FROM klant_sites WHERE domein = ? AND id != ?").bind(d, site.id).first();
  if (ander) throw new Error("That domain is already linked to another website.");
  const r = await cf("custom_hostnames", { method: "POST", body: JSON.stringify({ hostname: d, ssl: { method: "http", type: "dv" } }) });
  await DB.prepare("UPDATE klant_sites SET domein = ?, domein_id = ?, domein_status = ? WHERE id = ?").bind(d, r.id, domeinTekst(r.status, r.ssl?.status), site.id).run();
}
export async function verversDomein(DB: D1Database, site: Site) {
  if (!site.domein_id) return site.domein_status;
  const r = await cf(`custom_hostnames/${site.domein_id}`);
  const s = domeinTekst(r.status, r.ssl?.status);
  await DB.prepare("UPDATE klant_sites SET domein_status = ? WHERE id = ?").bind(s, site.id).run();
  return s;
}

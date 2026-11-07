// Website analytics collected by the Volgo script, without cookies and without storing IP addresses.
import type { D1Database } from "@cloudflare/workers-types";

const vandaag = () => new Date().toISOString().slice(0, 10);

async function sha(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

/** A visitor id that changes every day and differs per website: counts unique visitors, can't follow anyone. */
export async function bezoekerId(ip: string, ua: string, team: number, geheim: string) {
  return sha(`${vandaag()}|${team}|${ip}|${ua}|${geheim}`);
}

export function apparaatVan(ua: string, breedte?: number) {
  if (/iPad|Tablet/i.test(ua) || (breedte && breedte >= 700 && breedte < 1100 && /Mobile|Android/i.test(ua))) return "Tablet";
  if (/Mobi|Android|iPhone/i.test(ua) || (breedte && breedte < 700)) return "Mobile";
  return "Desktop";
}

/** Where the visit came from: utm_source, else the referring website (own site = direct). */
export function bronVan(ref: string | undefined, utm: string | undefined, eigenHost: string) {
  if (utm) {
    const u = utm.trim().toLowerCase();
    const bekend: Record<string, string> = { google: "Google", bing: "Bing", facebook: "Facebook", fb: "Facebook", instagram: "Instagram", ig: "Instagram", tiktok: "TikTok", linkedin: "LinkedIn", x: "X", twitter: "X", youtube: "YouTube", newsletter: "Newsletter", email: "Email" };
    return bekend[u] ?? (u.charAt(0).toUpperCase() + u.slice(1)).slice(0, 40);
  }
  if (!ref) return "Direct";
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
    if (!h || h === eigenHost.replace(/^www\./, "")) return "Direct";
    if (/google\./.test(h)) return "Google";
    if (/bing\.com/.test(h)) return "Bing";
    if (/duckduckgo/.test(h)) return "DuckDuckGo";
    if (/facebook\.com|fb\.me|m\.facebook/.test(h)) return "Facebook";
    if (/instagram\.com/.test(h)) return "Instagram";
    if (/linkedin\.com|lnkd\.in/.test(h)) return "LinkedIn";
    if (/t\.co$|twitter\.com|x\.com/.test(h)) return "X";
    if (/tiktok\.com/.test(h)) return "TikTok";
    if (/youtube\.com|youtu\.be/.test(h)) return "YouTube";
    return h.slice(0, 60);
  } catch {
    return "Direct";
  }
}

export function browserVan(ua: string) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/FBAN|FBAV|Instagram/.test(ua)) return /Instagram/.test(ua) ? "Instagram app" : "Facebook app";
  if (/Firefox\/|FxiOS/.test(ua)) return "Firefox";
  if (/Chrome\/|CriOS/.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}
export function osVan(ua: string) {
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
}
const dec = (v: string | null) => {
  try {
    return v ? decodeURIComponent(v).slice(0, 80) : "";
  } catch {
    return "";
  }
};
/** Approximate location from Cloudflare (city level), added by server.ts. */
export function locatieVan(h: Headers) {
  return { stad: dec(h.get("x-volgo-stad")), regio: dec(h.get("x-volgo-regio")), land: dec(h.get("x-volgo-land")) || (h.get("cf-ipcountry") ?? "") };
}
/** One readable line for the dashboard, e.g. "Austin, Texas, US · iPhone (iOS) · Safari". */
export function herkomstTekst(h: Headers, ua: string) {
  const l = locatieVan(h);
  const plek = [l.stad, l.regio, l.land].filter(Boolean).join(", ");
  return [plek, `${apparaatVan(ua)} (${osVan(ua)})`, browserVan(ua)].filter(Boolean).join(" · ").slice(0, 200);
}

export async function slaViewOp(
  DB: D1Database,
  d: {
    team: number;
    bezoeker: string;
    sessie: string;
    pad: string;
    titel: string;
    bron: string;
    apparaat: string;
    land: string;
    toestemming?: boolean;
    vast?: string;
    stad?: string;
    regio?: string;
    browser?: string;
    os?: string;
    taal?: string;
  },
) {
  const t = Boolean(d.toestemming);
  const r = await DB.prepare(
    "INSERT INTO site_views (team_id, dag, bezoeker, sessie, pad, titel, bron, apparaat, land, toestemming, vast, stad, regio, browser, os, taal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      d.team,
      vandaag(),
      d.bezoeker,
      d.sessie,
      d.pad.slice(0, 300),
      d.titel.slice(0, 200),
      d.bron,
      d.apparaat,
      d.land.slice(0, 2),
      t ? 1 : 0,
      t ? (d.vast ?? null) : null,
      t ? d.stad || null : null,
      t ? d.regio || null : null,
      t ? d.browser || null : null,
      t ? d.os || null : null,
      t ? (d.taal ?? "").slice(0, 12) || null : null,
    )
    .run();
  return Number(r.meta?.last_row_id) || 0;
}

export async function updateView(DB: D1Database, team: number, id: number, sessie: string, duur: number, scroll: number) {
  await DB.prepare("UPDATE site_views SET duur = MAX(duur, ?), scroll = MAX(scroll, ?) WHERE id = ? AND team_id = ? AND sessie = ?")
    .bind(Math.min(3600, Math.max(0, Math.round(duur))), Math.min(100, Math.max(0, Math.round(scroll))), id, team, sessie)
    .run();
}

export async function slaEventOp(DB: D1Database, team: number, sessie: string, soort: string) {
  await DB.prepare("INSERT INTO site_events (team_id, dag, sessie, soort) VALUES (?, ?, ?, ?)").bind(team, vandaag(), sessie, soort).run();
}

/** Keep analytics for at most 13 months. */
export async function ruimVerkeerOp(DB: D1Database) {
  await DB.batch([
    DB.prepare("DELETE FROM site_views WHERE dag < date('now', '-400 days')"),
    DB.prepare("DELETE FROM site_events WHERE dag < date('now', '-400 days')"),
  ]);
}

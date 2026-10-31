// Website analytics collected by the AVA script, without cookies and without storing IP addresses.
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
  if (utm) return utm.toLowerCase().slice(0, 40);
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

export async function slaViewOp(
  DB: D1Database,
  d: { team: number; bezoeker: string; sessie: string; pad: string; titel: string; bron: string; apparaat: string; land: string },
) {
  const r = await DB.prepare("INSERT INTO site_views (team_id, dag, bezoeker, sessie, pad, titel, bron, apparaat, land) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(d.team, vandaag(), d.bezoeker, d.sessie, d.pad.slice(0, 300), d.titel.slice(0, 200), d.bron, d.apparaat, d.land.slice(0, 2))
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

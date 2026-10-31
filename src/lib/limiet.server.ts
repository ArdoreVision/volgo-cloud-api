import type { D1Database } from "@cloudflare/workers-types";

/**
 * Simple rate limit: allows `max` events per `minuten` for one key (e.g. "login:<ip>").
 * Returns true when allowed (and counts the event), false when over the limit.
 */
export async function binnenLimiet(DB: D1Database, sleutel: string, minuten: number, max: number) {
  const r = await DB.prepare("SELECT COUNT(*) AS n FROM limieten WHERE sleutel = ? AND created_at > datetime('now', ?)")
    .bind(sleutel, `-${minuten} minutes`)
    .first<{ n: number }>();
  if ((r?.n ?? 0) >= max) return false;
  await DB.prepare("INSERT INTO limieten (sleutel) VALUES (?)").bind(sleutel).run();
  // Now and then: clean up old rows.
  if (Math.random() < 0.02) await DB.prepare("DELETE FROM limieten WHERE created_at < datetime('now', '-2 days')").run();
  return true;
}

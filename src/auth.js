import { cookies, randomHex, sha256, hashPassword, safeEqual } from "./util.js";

const COOKIE = "spotter_session";

export function isAdminEmail(env, email) {
  return (env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).includes(String(email).toLowerCase());
}

export async function currentCoach(req, env) {
  const t = cookies(req)[COOKIE];
  if (!t) return null;
  const h = await sha256(t);
  const row = await env.DB.prepare(
    "SELECT c.* FROM sessions s JOIN coaches c ON c.id = s.coach_id WHERE s.token_hash = ? AND s.expires > datetime('now')",
  ).bind(h).first();
  if (!row) return null;
  row.profileObj = safeJson(row.profile);
  row.isAdmin = isAdminEmail(env, row.email);
  return row;
}

export const safeJson = (s) => {
  try { return JSON.parse(s || "{}") || {}; } catch { return {}; }
};

export async function startSession(env, coachId) {
  const t = randomHex(32);
  await env.DB.prepare("INSERT INTO sessions (token_hash, coach_id, expires) VALUES (?, ?, datetime('now', '+30 days'))").bind(await sha256(t), coachId).run();
  return `${COOKIE}=${t}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

export async function endSession(req, env) {
  const t = cookies(req)[COOKIE];
  if (t) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(t)).run();
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createCoach(env, { email, password, name }) {
  const { hash, salt } = await hashPassword(password);
  const status = isAdminEmail(env, email) ? "free" : "new";
  const r = await env.DB.prepare("INSERT INTO coaches (email, pw_hash, pw_salt, name, status) VALUES (?, ?, ?, ?, ?) RETURNING id")
    .bind(email.toLowerCase().trim(), hash, salt, name.trim(), status).first();
  return r.id;
}

export async function checkLogin(env, email, password) {
  const c = await env.DB.prepare("SELECT * FROM coaches WHERE email = ?").bind(String(email).toLowerCase().trim()).first();
  if (!c) { await hashPassword(password); return null; }
  const { hash } = await hashPassword(password, c.pw_salt);
  return safeEqual(hash, c.pw_hash) ? c : null;
}

export const hasAccess = (c) => !!c && ["trial", "active", "free", "past_due"].includes(c.status);

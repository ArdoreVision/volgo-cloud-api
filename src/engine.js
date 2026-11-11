// The setter itself: receive a DM, decide, reply, keep the lead's stage up to date.
import { nextDm } from "./ai.js";
import { igSend, igProfile, sendMail, igRefresh, igPrivateReply, igCommentReply } from "./services.js";
import { safeJson } from "./auth.js";
import { hmacHex, safeEqual, logEvent, now } from "./util.js";

const DEBOUNCE_MS = 5000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function verifySignature(env, req, raw) {
  if (!env.META_APP_SECRET) return false;
  const sig = (req.headers.get("x-hub-signature-256") || "").replace(/^sha256=/, "");
  return safeEqual(sig, await hmacHex(env.META_APP_SECRET, raw));
}

// Webhook payload → list of {coachIgId, senderId, recipientId, mid, text, echo} or {kind:'comment', ...}
export function parseWebhook(body) {
  const out = [];
  if (!body || body.object !== "instagram") return out;
  for (const entry of body.entry || []) {
    for (const ch of entry.changes || []) {
      const v = ch.value || {};
      if (ch.field === "comments" && v.id && v.text && v.from?.id) {
        out.push({ kind: "comment", coachIgId: String(entry.id), commentId: String(v.id), fromId: String(v.from.id), username: v.from.username || "", text: String(v.text), mediaId: v.media?.id || "" });
      }
    }
    for (const ev of entry.messaging || []) {
      const m = ev.message;
      if (!m || m.is_deleted) continue;
      const text = m.text || (m.attachments?.length ? "[sent an attachment]" : "");
      if (!text) continue;
      out.push({ coachIgId: String(entry.id), senderId: String(ev.sender?.id), recipientId: String(ev.recipient?.id), mid: m.mid || null, text, echo: !!m.is_echo });
    }
  }
  return out;
}

export async function handleEvent(env, ev) {
  const coach = await env.DB.prepare("SELECT * FROM coaches WHERE ig_user_id = ?").bind(ev.coachIgId).first();
  if (!coach || !coach.ig_token) return;
  if (ev.kind === "comment") return handleComment(env, coach, ev);

  if (ev.echo) return handleEcho(env, coach, ev);

  if (ev.senderId === coach.ig_user_id) return;
  if (ev.mid) {
    const dup = await env.DB.prepare("SELECT id FROM messages WHERE mid = ?").bind(ev.mid).first();
    if (dup) return;
  }

  let lead = await env.DB.prepare("SELECT * FROM leads WHERE coach_id = ? AND ig_sender_id = ?").bind(coach.id, ev.senderId).first();
  if (!lead) {
    const prof = await igProfile(env, coach, ev.senderId);
    lead = await env.DB.prepare(
      "INSERT INTO leads (coach_id, ig_sender_id, name, username) VALUES (?, ?, ?, ?) ON CONFLICT(coach_id, ig_sender_id) DO UPDATE SET updated_at = datetime('now') RETURNING *",
    ).bind(coach.id, ev.senderId, prof.name || "", prof.username || "").first();
  }
  const ins = await env.DB.prepare("INSERT INTO messages (lead_id, role, text, mid) VALUES (?, 'lead', ?, ?) ON CONFLICT DO NOTHING RETURNING id")
    .bind(lead.id, ev.text.slice(0, 4000), ev.mid).first();
  if (!ins) return;
  await env.DB.prepare("UPDATE leads SET last_lead_at = datetime('now'), updated_at = datetime('now'), followup_sent = 0 WHERE id = ?").bind(lead.id).run();

  if (!coach.setter_on || lead.paused || !["trial", "active", "free", "past_due"].includes(coach.status)) return;
  // A chat flagged for the coach stays with the coach until they hand it back.
  if (lead.stage === "needs_you") return;

  // Wait a moment: people often send 2–3 messages in a row. Only the newest one gets answered.
  await sleep(Number(env.DEBOUNCE_MS ?? DEBOUNCE_MS));
  const newest = await env.DB.prepare("SELECT id FROM messages WHERE lead_id = ? AND role = 'lead' ORDER BY id DESC LIMIT 1").bind(lead.id).first();
  if (!newest || newest.id !== ins.id) return;
  const fresh = await env.DB.prepare("SELECT paused, stage FROM leads WHERE id = ?").bind(lead.id).first();
  if (fresh.paused || fresh.stage === "needs_you") return;

  await replyToLead(env, coach, lead.id);
}

export async function replyToLead(env, coach, leadId, { followUp = false } = {}) {
  const profile = safeJson(coach.profile);
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
  const hist = (await env.DB.prepare("SELECT role, text FROM messages WHERE lead_id = ? ORDER BY id DESC LIMIT 40").bind(leadId).all()).results.reverse();
  let out;
  try {
    out = await nextDm(env, profile, hist, { followUp });
  } catch (e) {
    await logEvent(env, coach.id, "ai_error", e.message);
    return null;
  }
  if (!out.reply) {
    await env.DB.prepare("UPDATE leads SET stage = ?, brief = CASE WHEN ? <> '' THEN ? ELSE brief END, updated_at = datetime('now') WHERE id = ?").bind(out.stage, out.brief, out.brief, leadId).run();
    return out;
  }
  // Record first, so the echo Instagram sends back is recognised as ours.
  const msg = await env.DB.prepare("INSERT INTO messages (lead_id, role, text) VALUES (?, 'bot', ?) RETURNING id").bind(leadId, out.reply).first();
  try {
    const mid = await igSend(env, coach, lead.ig_sender_id, out.reply);
    if (mid) await env.DB.prepare("UPDATE messages SET mid = ? WHERE id = ?").bind(mid, msg.id).run().catch(() => {});
  } catch (e) {
    await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(msg.id).run();
    await logEvent(env, coach.id, "send_error", e.message);
    return null;
  }
  const prevStage = lead.stage;
  await env.DB.prepare(
    "UPDATE leads SET stage = ?, brief = CASE WHEN ? <> '' THEN ? ELSE brief END, last_out_at = datetime('now'), updated_at = datetime('now'), followup_sent = CASE WHEN ? THEN 1 ELSE followup_sent END WHERE id = ?",
  ).bind(out.stage, out.brief, out.brief, followUp ? 1 : 0, leadId).run();

  if (out.stage !== prevStage && (out.stage === "needs_you" || out.stage === "link_sent" || out.stage === "booked")) {
    const who = lead.username ? "@" + lead.username : lead.name || "A lead";
    if (!coach.notify_email) return out;
    const subj = out.stage === "needs_you" ? `${who} needs you personally` : out.stage === "booked" ? `${who} booked a call` : `${who} got your booking link`;
    await sendMail(env, {
      to: coach.email,
      subject: subj,
      text: `${subj}.\n\nWhat Spotter knows: ${out.brief || "-"}\n\nOpen the chat: ${env.PUBLIC_URL || ""}/inbox/${leadId}\n\nSpotter`,
    });
  }
  return out;
}

async function handleEcho(env, coach, ev) {
  // Instagram echoes every message the account sends. Ours are already stored; anything else was typed by the coach.
  if (ev.mid) {
    const known = await env.DB.prepare("SELECT id FROM messages WHERE mid = ?").bind(ev.mid).first();
    if (known) return;
  }
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE coach_id = ? AND ig_sender_id = ?").bind(coach.id, ev.recipientId).first();
  if (!lead) return;
  const recentBot = await env.DB.prepare(
    "SELECT id FROM messages WHERE lead_id = ? AND role IN ('bot','coach') AND text = ? AND created_at > datetime('now', '-3 minutes') AND (mid IS NULL OR mid = ?) ORDER BY id DESC LIMIT 1",
  ).bind(lead.id, ev.text, ev.mid || "").first();
  if (recentBot) {
    if (ev.mid) await env.DB.prepare("UPDATE messages SET mid = ? WHERE id = ? AND mid IS NULL").bind(ev.mid, recentBot.id).run().catch(() => {});
    return;
  }
  await env.DB.prepare("INSERT INTO messages (lead_id, role, text, mid) VALUES (?, 'coach', ?, ?) ON CONFLICT DO NOTHING").bind(lead.id, ev.text.slice(0, 4000), ev.mid).run();
  // The coach stepped in: Spotter stays quiet in this chat until the coach hands it back.
  await env.DB.prepare("UPDATE leads SET paused = 1, last_out_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").bind(lead.id).run();
}

/* ---------------- scheduled work ---------------- */

export async function runFollowUps(env) {
  // Instagram only allows automated replies within 24h of the lead's last message: follow up between 20 and 23 hours.
  const rows = (await env.DB.prepare(
    `SELECT l.id, l.coach_id FROM leads l JOIN coaches c ON c.id = l.coach_id
     WHERE l.paused = 0 AND l.followup_sent = 0 AND l.stage IN ('qualifying','link_sent')
       AND c.setter_on = 1 AND c.ig_token IS NOT NULL AND c.status IN ('trial','active','free','past_due')
       AND l.last_lead_at IS NOT NULL AND l.last_out_at IS NOT NULL AND l.last_out_at >= l.last_lead_at
       AND l.last_lead_at < datetime('now', '-20 hours') AND l.last_lead_at > datetime('now', '-23 hours')
     LIMIT 50`,
  ).all()).results;
  let n = 0;
  for (const r of rows) {
    const coach = await env.DB.prepare("SELECT * FROM coaches WHERE id = ?").bind(r.coach_id).first();
    const out = await replyToLead(env, coach, r.id, { followUp: true });
    await env.DB.prepare("UPDATE leads SET followup_sent = 1 WHERE id = ?").bind(r.id).run();
    if (out) n++;
  }
  return n;
}

export async function refreshTokens(env) {
  const rows = (await env.DB.prepare("SELECT id, ig_token FROM coaches WHERE ig_token IS NOT NULL AND ig_token_exp < datetime('now', '+10 days') LIMIT 20").all()).results;
  for (const r of rows) {
    try {
      const t = await igRefresh(env, r.ig_token);
      await env.DB.prepare("UPDATE coaches SET ig_token = ?, ig_token_exp = ? WHERE id = ?").bind(t.token, t.exp, r.id).run();
    } catch (e) {
      await logEvent(env, r.id, "ig_refresh_error", e.message);
    }
  }
}

export async function weeklyReports(env) {
  const d = new Date();
  if (d.getUTCDay() !== 1 || d.getUTCHours() !== 7) return; // Monday morning
  const coaches = (await env.DB.prepare("SELECT * FROM coaches WHERE status IN ('trial','active','free') AND ig_token IS NOT NULL AND (last_report IS NULL OR last_report < datetime('now','-6 days'))").all()).results;
  for (const c of coaches) {
    const s = await weekStats(env, c.id);
    await sendMail(env, {
      to: c.email,
      subject: `Your week with Spotter: ${s.links} booking links sent`,
      text: `Hi ${c.name || "coach"},\n\nLast 7 days:\n- Conversations: ${s.chats}\n- DMs answered by Spotter: ${s.answered}\n- Booking links sent: ${s.links}\n- Booked: ${s.booked}\n- Need you personally: ${s.needs}\n\nOpen your dashboard: ${env.PUBLIC_URL || ""}/dashboard\n\nSpotter`,
    });
    await env.DB.prepare("UPDATE coaches SET last_report = ? WHERE id = ?").bind(now(), c.id).run();
  }
}

export async function weekStats(env, coachId) {
  const q = (sql) => env.DB.prepare(sql).bind(coachId).first();
  const chats = (await q("SELECT COUNT(*) n FROM leads WHERE coach_id = ? AND updated_at > datetime('now','-7 days')")).n;
  const answered = (await q("SELECT COUNT(*) n FROM messages m JOIN leads l ON l.id = m.lead_id WHERE l.coach_id = ? AND m.role = 'bot' AND m.created_at > datetime('now','-7 days')")).n;
  const links = (await q("SELECT COUNT(*) n FROM leads WHERE coach_id = ? AND stage IN ('link_sent','booked') AND updated_at > datetime('now','-7 days')")).n;
  const booked = (await q("SELECT COUNT(*) n FROM leads WHERE coach_id = ? AND stage = 'booked' AND updated_at > datetime('now','-7 days')")).n;
  const needs = (await q("SELECT COUNT(*) n FROM leads WHERE coach_id = ? AND stage = 'needs_you'")).n;
  return { chats, answered, links, booked, needs };
}

/* ---------------- comment to DM ---------------- */

export function matchKeyword(keywords, text) {
  const words = String(keywords || "").split(/[,\n]/).map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (!words.length) return null;
  const t = String(text || "").toLowerCase();
  return words.find((k) => new RegExp(`(^|[^\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u").test(t)) || null;
}

export const DEFAULT_COMMENT_DM = "hey! saw your comment 🙌 happy to help. what's the main goal you'd love to hit in the next few months?";

async function handleComment(env, coach, ev) {
  if (ev.fromId === coach.ig_user_id) return;
  if (!coach.setter_on || !["trial", "active", "free", "past_due"].includes(coach.status)) return;
  const profile = safeJson(coach.profile);
  const kw = matchKeyword(profile.keywords, ev.text);
  if (!kw) return;
  const fresh = await env.DB.prepare("INSERT INTO comment_replies (comment_id, coach_id) VALUES (?, ?) ON CONFLICT DO NOTHING RETURNING comment_id").bind(ev.commentId, coach.id).first();
  if (!fresh) return;
  const text = String(profile.comment_dm || DEFAULT_COMMENT_DM).trim().slice(0, 900);
  let lead = await env.DB.prepare("SELECT * FROM leads WHERE coach_id = ? AND ig_sender_id = ?").bind(coach.id, ev.fromId).first();
  if (!lead) {
    lead = await env.DB.prepare(
      "INSERT INTO leads (coach_id, ig_sender_id, username, source, stage) VALUES (?, ?, ?, 'comment', 'qualifying') ON CONFLICT(coach_id, ig_sender_id) DO UPDATE SET updated_at = datetime('now') RETURNING *",
    ).bind(coach.id, ev.fromId, ev.username).first();
  }
  await env.DB.prepare("INSERT INTO messages (lead_id, role, text) VALUES (?, 'lead', ?)").bind(lead.id, `[commented "${ev.text.slice(0, 300)}" on your post]`).run();
  const msg = await env.DB.prepare("INSERT INTO messages (lead_id, role, text) VALUES (?, 'bot', ?) RETURNING id").bind(lead.id, text).first();
  try {
    const r = await igPrivateReply(env, coach, ev.commentId, text);
    if (r.message_id) await env.DB.prepare("UPDATE messages SET mid = ? WHERE id = ?").bind(r.message_id, msg.id).run().catch(() => {});
  } catch (e) {
    await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(msg.id).run();
    await logEvent(env, coach.id, "comment_dm_error", e.message);
    return;
  }
  await env.DB.prepare("UPDATE leads SET last_lead_at = datetime('now'), last_out_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").bind(lead.id).run();
  if (profile.comment_reply !== "off") await igCommentReply(env, coach, ev.commentId, profile.comment_public || "Sent you a DM 🙌");
  await logEvent(env, coach.id, "comment_dm", `${ev.username}: ${kw}`);
}

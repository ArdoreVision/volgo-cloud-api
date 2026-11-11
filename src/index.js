import landing from "./landing.html";
import { esc, html, json, redirect, form, isEmail, origin, timeAgo, logEvent, randomHex, sha256, hashPassword, now, hmacHex, safeEqual } from "./util.js";
import { currentCoach, startSession, endSession, createCoach, checkLogin, hasAccess, safeJson, isAdminEmail } from "./auth.js";
import { page, appPage, STAGE_LABEL, initials, TEST_CHAT_JS, testPhone } from "./layout.js";
import { nextDm, scriptedDm, DEFAULT_PROFILE, TONES, profileComplete } from "./ai.js";
import {
  igConfigured, igAuthorizeUrl, igExchangeCode, igSend, stripeConfigured, stripeCheckout, stripeSession, stripeSubscription,
  stripePortal, statusFromSub, sendMail, notifyOwner, stripeCancel,
} from "./services.js";
import { verifySignature, parseWebhook, handleEvent, runFollowUps, refreshTokens, weeklyReports, weekStats, DEFAULT_COMMENT_DM } from "./engine.js";

export default {
  async fetch(req, env, ctx) {
    try {
      return await route(req, env, ctx);
    } catch (e) {
      console.error(e);
      await logEvent(env, null, "error", `${new URL(req.url).pathname}: ${e.message}`);
      return html(page({ title: "Something went wrong", body: `<div class="auth"><div class="card"><h1>Something went wrong</h1><p class="sub">Try again in a moment. If it keeps happening, email ${esc(env.CONTACT_EMAIL)}.</p><a class="btn btn-main" href="/">Back to Spotter</a></div></div>` }), 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      await runFollowUps(env).catch((e) => logEvent(env, null, "cron_followup", e.message));
      const d = new Date();
      if (d.getUTCMinutes() < 30) {
        if (d.getUTCHours() % 6 === 0) await syncBilling(env).catch((e) => logEvent(env, null, "cron_billing", e.message));
        if (d.getUTCHours() === 3) await refreshTokens(env).catch((e) => logEvent(env, null, "cron_tokens", e.message));
        await weeklyReports(env).catch((e) => logEvent(env, null, "cron_report", e.message));
      }
    })());
  },
};

async function route(req, env, ctx) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const m = req.method;
  env.PUBLIC_URL = env.PUBLIC_URL || url.origin;

  /* ---------- public ---------- */
  if (p === "/" && m === "GET") {
    const c = await currentCoach(req, env);
    let body = landing;
    if (c) body = body.replace('<a class="lnk" href="/login" id="nav-app">Log in</a>', '<a class="lnk" href="/dashboard" id="nav-app">Dashboard</a>');
    return html(body);
  }
  if (p === "/health") {
    const db = await env.DB.prepare("SELECT COUNT(*) n FROM coaches").first().then(() => true).catch(() => false);
    return json({ ok: db, db, ai: !!env.ANTHROPIC_API_KEY, stripe: stripeConfigured(env), mail: !!env.RESEND_API_KEY, instagram: igConfigured(env), push: !!env.PUSH_TOPIC, time: now() });
  }
  if (p === "/privacy") return html(legalPrivacy(env));
  if (p === "/terms") return html(legalTerms(env));
  if (p === "/data-deletion") return m === "POST" ? dataDeletion(req, env) : html(legalDeletion(env));
  if (p === "/api/demo" && m === "POST") return apiDemo(req, env);
  if (p === "/webhook/instagram") return webhook(req, env, ctx);

  /* ---------- auth ---------- */
  if (p === "/start" || p === "/signup") return m === "POST" ? signupPost(req, env) : signupGet(req, env);
  if (p === "/login") return m === "POST" ? loginPost(req, env) : loginGet(req, env, url);
  if (p === "/logout") return redirect("/", { "set-cookie": await endSession(req, env) });
  if (p === "/forgot") return m === "POST" ? forgotPost(req, env) : html(authCard("Reset your password", "We'll email you a link.", forgotForm()));
  if (p === "/reset") return m === "POST" ? resetPost(req, env) : html(authCard("Choose a new password", "At least 8 characters.", resetForm(url.searchParams.get("t") || "")));

  /* ---------- logged in ---------- */
  const coach = await currentCoach(req, env);
  if (!coach) return redirect("/login?next=" + encodeURIComponent(p));

  if (p === "/setup") return setupPage(req, env, coach, url);
  if (p === "/setter" && m === "POST") return setterSave(req, env, coach);
  if (p === "/setter") return setterPage(req, env, coach, url);
  if (p === "/api/test-chat" && m === "POST") return apiTestChat(req, env, coach);
  if (p === "/billing") return billingPage(req, env, coach, url);
  if (p === "/billing/checkout" && m === "POST") return billingCheckout(req, env, coach);
  if (p === "/billing/return") return billingReturn(req, env, coach, url);
  if (p === "/billing/portal" && m === "POST") return billingPortal(req, env, coach);

  if (!hasAccess(coach)) return redirect(profileComplete(coach.profileObj) ? "/billing" : "/setup");

  if (p === "/dashboard") return dashboard(req, env, coach);
  if (p === "/connect") return connectPage(req, env, coach, url);
  if (p === "/connect/instagram") return connectStart(req, env, coach);
  if (p === "/connect/instagram/callback") return connectCallback(req, env, coach, url);
  if (p === "/connect/request" && m === "POST") return connectRequest(req, env, coach);
  if (p === "/connect/disconnect" && m === "POST") {
    await env.DB.prepare("UPDATE coaches SET ig_token = NULL, ig_user_id = NULL, ig_username = NULL WHERE id = ?").bind(coach.id).run();
    return redirect("/connect");
  }
  if (p === "/setter/toggle" && m === "POST") {
    await env.DB.prepare("UPDATE coaches SET setter_on = 1 - setter_on WHERE id = ?").bind(coach.id).run();
    return redirect(req.headers.get("referer")?.startsWith(url.origin) ? new URL(req.headers.get("referer")).pathname : "/dashboard");
  }
  if (p === "/inbox") return inboxPage(req, env, coach, url);
  let mm;
  if ((mm = p.match(/^\/inbox\/(\d+)$/))) return threadPage(req, env, coach, +mm[1], url);
  if ((mm = p.match(/^\/inbox\/(\d+)\/(send|pause|resume|stage)$/)) && m === "POST") return threadAction(req, env, coach, +mm[1], mm[2]);
  if (p === "/calls") return callsPage(req, env, coach);
  if (p === "/settings") return m === "POST" ? settingsPost(req, env, coach) : settingsPage(req, env, coach, url);
  if (p === "/settings/delete" && m === "POST") return deleteAccount(req, env, coach);
  if (p === "/help") return helpPage(req, env, coach);
  if ((mm = p.match(/^\/admin\/coach\/(\d+)$/)) && m === "POST" && coach.isAdmin) return adminAction(req, env, coach, +mm[1]);
  if (p === "/admin" && coach.isAdmin) return adminPage(req, env, coach);

  return html(page({ title: "Not found", coach, body: `<div class="auth"><div class="card"><h1>Page not found</h1><p class="sub">That page doesn't exist.</p><a class="btn btn-main" href="/dashboard">Go to dashboard</a></div></div>` }), 404);
}

/* ======================= AUTH ======================= */

const authCard = (title, sub, inner, coach = null) =>
  page({ title, coach, body: `<div class="auth"><div class="card"><h1>${esc(title)}</h1><p class="sub">${sub}</p>${inner}</div></div>` });

function signupForm(v = {}, err = "") {
  return `${err ? `<div class="err" role="alert">${esc(err)}</div><div style="height:14px"></div>` : ""}
  <form class="form" method="post" action="/start">
    <div class="field"><label for="name">Your name</label><input id="name" name="name" autocomplete="name" required value="${esc(v.name)}"></div>
    <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required value="${esc(v.email)}"></div>
    <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="8" required><p class="hint" style="margin:6px 0 0">At least 8 characters.</p></div>
    <button class="btn btn-main" type="submit">Create account and build my setter</button>
    <p class="small" style="margin:0">Free to build and test. You only pay when you go live: 7 days for €1, then €297/month. By continuing you agree to the <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.</p>
  </form>
  <p class="small" style="margin:18px 0 0">Already have an account? <a href="/login">Log in</a></p>`;
}

async function signupGet(req, env) {
  if (await currentCoach(req, env)) return redirect("/setup");
  return html(authCard("Build your setter", "Takes about 60 seconds. Test it before you pay anything.", signupForm()));
}

async function signupPost(req, env) {
  const f = await form(req);
  const name = String(f.name || "").trim(), email = String(f.email || "").trim().toLowerCase(), pw = String(f.password || "");
  const fail = (msg, s = 400) => html(authCard("Build your setter", "Takes about 60 seconds. Test it before you pay anything.", signupForm({ name, email }, msg)), s);
  if (!name) return fail("Add your name.");
  if (!isEmail(email)) return fail("That email address doesn't look right.");
  if (pw.length < 8) return fail("Your password needs at least 8 characters.");
  const exists = await env.DB.prepare("SELECT id FROM coaches WHERE email = ?").bind(email).first();
  if (exists) return fail("There's already an account with this email. Log in instead.", 409);
  const id = await createCoach(env, { email, password: pw, name });
  await env.DB.prepare("UPDATE coaches SET profile = ? WHERE id = ?").bind(JSON.stringify({ ...DEFAULT_PROFILE, name: `Coach ${name.split(" ")[0]}` }), id).run();
  await logEvent(env, id, "signup", email);
  const isTest = email.endsWith("@spotter.test");
  if (!isTest) await notifyOwner(env, "New signup", `${name} <${email}> created a Spotter account.`);
  if (!isTest) await sendMail(env, { to: email, subject: "Welcome to Spotter", text: `Hi ${name.split(" ")[0]},\n\nYour account is ready. Fill in your 6 answers, test your setter as if you're a lead, and go live when you're happy:\n${env.PUBLIC_URL}/setup\n\nQuestions? Just reply to this email.\n\nSpotter` });
  return redirect("/setup", { "set-cookie": await startSession(env, id) });
}

function loginForm(err = "", email = "", next = "") {
  return `${err ? `<div class="err" role="alert">${esc(err)}</div><div style="height:14px"></div>` : ""}
  <form class="form" method="post" action="/login">
    <input type="hidden" name="next" value="${esc(next)}">
    <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required value="${esc(email)}"></div>
    <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
    <button class="btn btn-main" type="submit">Log in</button>
  </form>
  <p class="small" style="margin:18px 0 0"><a href="/forgot">Forgot your password?</a> · New here? <a href="/start">Create an account</a></p>`;
}

async function loginGet(req, env, url) {
  if (await currentCoach(req, env)) return redirect("/dashboard");
  return html(authCard("Welcome back", "Log in to your Spotter dashboard.", loginForm("", "", url.searchParams.get("next") || "")));
}

async function loginPost(req, env) {
  const f = await form(req);
  const c = await checkLogin(env, f.email, String(f.password || ""));
  if (!c) return html(authCard("Welcome back", "Log in to your Spotter dashboard.", loginForm("Wrong email or password.", f.email, f.next)), 401);
  const next = typeof f.next === "string" && /^\/[a-z]/.test(f.next) && !f.next.startsWith("//") ? f.next : "/dashboard";
  return redirect(next, { "set-cookie": await startSession(env, c.id) });
}

const forgotForm = (msg = "") => `${msg}<form class="form" method="post" action="/forgot"><div class="field"><label for="email">Email</label><input id="email" name="email" type="email" required></div><button class="btn btn-main" type="submit">Send reset link</button></form>`;
const resetForm = (t, msg = "") => `${msg}<form class="form" method="post" action="/reset"><input type="hidden" name="t" value="${esc(t)}"><div class="field"><label for="password">New password</label><input id="password" name="password" type="password" minlength="8" autocomplete="new-password" required></div><button class="btn btn-main" type="submit">Save password</button></form>`;

async function forgotPost(req, env) {
  const f = await form(req);
  const c = await env.DB.prepare("SELECT id, email FROM coaches WHERE email = ?").bind(String(f.email || "").toLowerCase().trim()).first();
  if (c) {
    const t = randomHex(24);
    await env.DB.prepare("UPDATE coaches SET reset_hash = ?, reset_exp = datetime('now','+1 hour') WHERE id = ?").bind(await sha256(t), c.id).run();
    await sendMail(env, { to: c.email, subject: "Reset your Spotter password", text: `Use this link within an hour to choose a new password:\n${env.PUBLIC_URL}/reset?t=${t}\n\nDidn't ask for this? Ignore this email.` });
  }
  return html(authCard("Check your email", "If there's an account with that address, a reset link is on its way.", `<a class="btn btn-ghost" href="/login">Back to log in</a>`));
}

async function resetPost(req, env) {
  const f = await form(req);
  const pw = String(f.password || "");
  if (pw.length < 8) return html(authCard("Choose a new password", "At least 8 characters.", resetForm(f.t, `<div class="err">Use at least 8 characters.</div><div style="height:14px"></div>`)), 400);
  const c = await env.DB.prepare("SELECT id FROM coaches WHERE reset_hash = ? AND reset_exp > datetime('now')").bind(await sha256(String(f.t || ""))).first();
  if (!c) return html(authCard("Link expired", "Request a new reset link.", `<a class="btn btn-main" href="/forgot">New link</a>`), 400);
  const { hash, salt } = await hashPassword(pw);
  await env.DB.prepare("UPDATE coaches SET pw_hash = ?, pw_salt = ?, reset_hash = NULL, reset_exp = NULL WHERE id = ?").bind(hash, salt, c.id).run();
  await env.DB.prepare("DELETE FROM sessions WHERE coach_id = ?").bind(c.id).run();
  return redirect("/dashboard", { "set-cookie": await startSession(env, c.id) });
}

/* ======================= SETTER ======================= */

function setterForm(p, action = "/setter", back = "") {
  const chip = (t) => `<label class="chip ${p.tone === t ? "on" : ""}"><input type="radio" name="tone" value="${esc(t)}" ${p.tone === t ? "checked" : ""} style="position:absolute;opacity:0;width:1px;height:1px">${esc(t.split(" ")[0])}</label>`;
  return `<form class="form" method="post" action="${action}" id="setter-form">
    <input type="hidden" name="back" value="${esc(back)}">
    <div class="field"><label for="f-name">1. Your name as leads see it</label><input id="f-name" name="name" required value="${esc(p.name)}" placeholder="Coach Mila"></div>
    <div class="field"><label for="f-program">2. Your program</label><p class="hint">Name, length and what's included.</p><textarea id="f-program" name="program" required placeholder="Lean in 12: 12 weeks of 1:1 coaching. Custom training, macro-based nutrition, weekly video check-in, daily WhatsApp support.">${esc(p.program)}</textarea></div>
    <div class="field"><label for="f-price">3. Price</label><input id="f-price" name="price" required value="${esc(p.price)}" placeholder="€997 for 12 weeks, or 3 × €349"></div>
    <div class="field"><label for="f-fit">4. Who it's for</label><p class="hint">Spotter only sends your booking link to people who match this.</p><textarea id="f-fit" name="fit" required placeholder="Women 25–45 who want to lose 5–15 kg, can train 3× a week and want to start within a month.">${esc(p.fit)}</textarea></div>
    <div class="field"><label for="f-link">5. Booking link</label><input id="f-link" name="link" required value="${esc(p.link)}" placeholder="calendly.com/you/strategy-call"></div>
    <div class="field"><label id="tone-l">6. Your tone</label><div class="chips" role="radiogroup" aria-labelledby="tone-l">${TONES.map(chip).join("")}</div></div>
    <div class="panel" style="margin-top:4px"><h3>Comment-to-DM <span class="small" style="font-family:var(--body);font-weight:400">optional</span></h3><div class="pad" style="display:grid;gap:14px">
      <p class="small" style="margin:0">Say "comment COACH below" in a reel. Everyone who comments that word gets a DM from you right away, and Spotter takes it from there.</p>
      <div class="field"><label for="f-kw">Keywords</label><p class="hint">Separate with commas. Leave empty to switch off.</p><input id="f-kw" name="keywords" value="${esc(p.keywords)}" placeholder="COACH, PLAN"></div>
      <div class="field"><label for="f-cdm">First DM they get</label><textarea id="f-cdm" name="comment_dm" placeholder="${esc(DEFAULT_COMMENT_DM)}">${esc(p.comment_dm)}</textarea></div>
      <label class="small" style="display:flex;gap:10px;align-items:center;cursor:pointer"><input type="checkbox" name="comment_reply" value="on" ${p.comment_reply !== "off" ? "checked" : ""}> Also reply "Sent you a DM 🙌" under their comment</label>
    </div></div>
    <details><summary class="small" style="cursor:pointer">Optional: anything else Spotter should know</summary>
      <div class="field" style="margin-top:10px"><label for="f-extra">Extra info</label><p class="hint">FAQs, payment plans, guarantees you really offer, things to never say.</p><textarea id="f-extra" name="extra">${esc(p.extra)}</textarea></div>
      <div class="field"><label for="f-lang">Language</label><select id="f-lang" name="language">${["the language the lead writes in", "English", "Dutch", "German", "Spanish", "French"].map((l) => `<option ${p.language === l ? "selected" : ""} value="${esc(l)}">${l === "the language the lead writes in" ? "Match the lead (recommended)" : l}</option>`).join("")}</select></div>
    </details>
    <div><button class="btn btn-main" type="submit">Save and test</button></div>
  </form>
  <script>document.querySelectorAll('.chips .chip input').forEach(i=>i.addEventListener('change',()=>{document.querySelectorAll('.chips .chip').forEach(c=>c.classList.toggle('on',c.querySelector('input').checked));}));</script>`;
}

async function setterSave(req, env, coach) {
  const f = await form(req);
  const p = { ...DEFAULT_PROFILE, ...coach.profileObj };
  for (const k of ["name", "program", "price", "fit", "link", "extra", "language", "keywords", "comment_dm"]) if (typeof f[k] === "string") p[k] = f[k].trim().slice(0, 2000);
  if ("keywords" in f) p.comment_reply = f.comment_reply === "on" ? "on" : "off";
  if (TONES.includes(f.tone)) p.tone = f.tone;
  p.link = p.link.replace(/\s+/g, "");
  await env.DB.prepare("UPDATE coaches SET profile = ? WHERE id = ?").bind(JSON.stringify(p), coach.id).run();
  const back = f.back === "setup" ? "/setup" : "/setter";
  return redirect(back + "?saved=1");
}

async function setupPage(req, env, coach, url) {
  if (hasAccess(coach) && coach.ig_token) return redirect("/dashboard");
  const p = { ...DEFAULT_PROFILE, ...coach.profileObj };
  const done = profileComplete(p);
  const paid = hasAccess(coach);
  const steps = `<div class="steps"><span class="${done ? "done" : "on"}">1 · Build your setter</span><span class="${paid ? "done" : done ? "on" : ""}">2 · Go live for €1</span><span class="${paid ? "on" : ""}">3 · Connect Instagram</span></div>`;
  const cta = paid
    ? `<div class="note" style="margin-bottom:22px">You're live on the 7-day start. Last step: <a href="/connect"><b>connect Instagram</b></a>.</div>`
    : done
      ? `<div class="note" style="margin-bottom:22px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap"><span><b>Happy with how it talks?</b> Go live: 7 days for €1, then €297/month. Cancel anytime.</span><form method="post" action="/billing/checkout"><button class="btn btn-main" type="submit">Go live for €1</button></form></div>`
      : `<div class="note" style="margin-bottom:22px">Fill in the 6 answers, press <b>Save and test</b>, then chat with your setter as if you're a lead.</div>`;
  const saved = url.searchParams.get("saved") ? `<div class="ok" style="margin-bottom:18px">Saved. Your test chat uses your new answers.</div>` : "";
  return html(page({
    title: "Build your setter", coach, script: TEST_CHAT_JS,
    body: `<div style="max-width:1180px;margin:0 auto;padding:28px 20px">${steps}<h2 style="font-size:34px;font-weight:800">Build your setter</h2><p class="lede" style="color:var(--mute)">Six answers. That's all Spotter needs to sound like you.</p>${saved}${cta}
    <div class="setter-grid"><div>${setterForm(p, "/setter", "setup")}</div><div>${testPhone(p.name)}</div></div></div>`,
  }));
}

async function setterPage(req, env, coach, url) {
  const p = { ...DEFAULT_PROFILE, ...coach.profileObj };
  const saved = url.searchParams.get("saved") ? `<div class="ok" style="margin-bottom:18px">Saved. Spotter uses this from the next message on.</div>` : "";
  const body = `<h2>Your setter</h2><p class="lede">Change an answer and test it right away. Changes go live immediately.</p>${saved}
    <div class="setter-grid"><div>${setterForm(p)}</div><div>${testPhone(p.name)}</div></div>`;
  if (!hasAccess(coach)) return redirect("/setup");
  return html(appPage({ title: "Your setter", coach, active: "setter", body, script: TEST_CHAT_JS, needs: await needsCount(env, coach) }));
}

function cleanHistory(h) {
  return (Array.isArray(h) ? h : []).slice(-30).map((m) => ({ role: m && m.role === "lead" ? "lead" : "bot", text: String(m?.text || "").slice(0, 1000) })).filter((m) => m.text);
}

async function apiTestChat(req, env, coach) {
  const b = await req.json().catch(() => ({}));
  const history = cleanHistory(b.history);
  const p = { ...DEFAULT_PROFILE, ...coach.profileObj };
  if (!profileComplete(p)) return json({ reply: "Fill in all 6 answers and press Save and test first, then I can answer like you." });
  if (!(await allowHits(env, "c" + coach.id, 200))) return json({ reply: "That's a lot of testing for today. Try again tomorrow." });
  try {
    const out = await nextDm(env, p, history, { fast: true });
    return json({ reply: out.reply, stage: out.stage });
  } catch (e) {
    return json({ reply: scriptedDm(p, history).reply, offline: true });
  }
}

const DEMO_PROFILE = {
  name: "Coach Mila",
  program: "Lean in 12: a 12-week 1:1 online coaching program. Custom training plan, macro-based nutrition, weekly video check-in and daily WhatsApp support.",
  price: "€997 for 12 weeks (or 3 x €349)",
  fit: "Women 25–45 who want to lose 5–15 kg, can train 3x a week, and are ready to start within a month.",
  link: "calendly.com/coachmila/strategy-call",
  tone: "Warm and encouraging",
  language: "the language the lead writes in",
};

async function apiDemo(req, env) {
  const b = await req.json().catch(() => ({}));
  const history = cleanHistory(b.history);
  const ip = req.headers.get("cf-connecting-ip") || "local";
  if (!(await allowHits(env, ip, 40))) return json({ reply: "That's the demo limit for today. Start your own setter to keep going: /start" });
  try {
    const out = await nextDm(env, DEMO_PROFILE, history, { fast: true });
    return json({ reply: out.reply });
  } catch (e) {
    return json({ reply: scriptedDm(DEMO_PROFILE, history).reply });
  }
}

async function allowHits(env, key, max) {
  const day = new Date().toISOString().slice(0, 10);
  const r = await env.DB.prepare("INSERT INTO demo_hits (ip, day, n) VALUES (?, ?, 1) ON CONFLICT(ip, day) DO UPDATE SET n = n + 1 RETURNING n").bind(key, day).first();
  return r.n <= max;
}

/* ======================= BILLING ======================= */

const STATUS_TEXT = { new: "Not live yet", trial: "7-day start", active: "Active", past_due: "Payment failed", canceled: "Canceled", free: "Owner account (free)" };

async function billingPage(req, env, coach, url) {
  const canceled = url.searchParams.get("canceled");
  let detail = "";
  if (coach.status === "trial" && coach.trial_end) detail = `Your 7-day start runs until ${esc(coach.trial_end.slice(0, 10))}. After that it's €297/month.`;
  if (coach.status === "active") detail = "€297/month. Cancel anytime.";
  if (coach.status === "past_due") detail = "Your last payment didn't go through. Update your card to keep Spotter replying.";
  if (coach.status === "canceled") detail = "Spotter is off. Restart anytime.";
  if (coach.status === "free") detail = "This account never pays.";
  const startBtn = `<form method="post" action="/billing/checkout"><button class="btn btn-main" type="submit">${coach.status === "canceled" ? "Restart Spotter" : "Go live: 7 days for €1"}</button></form>`;
  const manage = coach.stripe_customer ? `<form method="post" action="/billing/portal"><button class="btn btn-ghost" type="submit">Manage or cancel subscription</button></form>` : "";
  const actions = ["new", "canceled"].includes(coach.status) ? startBtn : manage;
  const body = `<h2>Billing</h2><p class="lede">One plan. Everything in it.</p>
    ${canceled ? `<div class="err" style="margin-bottom:16px">Checkout was canceled. Nothing was charged.</div>` : ""}
    <div class="panel" style="margin-top:0"><div class="pad" style="display:grid;gap:14px">
      <div class="status"><span class="dot ${hasAccess(coach) ? "on" : "off"}"></span><b>${esc(STATUS_TEXT[coach.status] || coach.status)}</b></div>
      <p class="small" style="margin:0">${detail || "Go live when you're happy with your test chat: 7 days for €1, then €297/month. Cancel anytime in those 7 days and you pay nothing more."}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${actions}</div>
      <p class="small" style="margin:0">Questions about billing? Email ${esc(env.CONTACT_EMAIL)}.</p>
    </div></div>`;
  if (!hasAccess(coach)) return html(page({ title: "Billing", coach, body: `<div style="max-width:720px;margin:0 auto;padding:28px 20px">${body}<p style="margin-top:18px"><a href="/setup">← Back to your setter</a></p></div>` }));
  return html(appPage({ title: "Billing", coach, active: "billing", body, needs: await needsCount(env, coach) }));
}

async function billingCheckout(req, env, coach) {
  if (coach.status === "free" || coach.status === "trial" || coach.status === "active") return redirect("/billing");
  if (!profileComplete(coach.profileObj)) return redirect("/setup");
  if (!stripeConfigured(env)) return html(authCard("Payments aren't switched on yet", `Email ${esc(env.CONTACT_EMAIL)} and we'll get you live today.`, `<a class="btn btn-ghost" href="/setup">Back</a>`, coach), 503);
  const s = await stripeCheckout(env, coach, origin(req));
  await logEvent(env, coach.id, "checkout_started", s.id);
  return redirect(s.url);
}

async function billingReturn(req, env, coach, url) {
  const id = url.searchParams.get("session_id");
  if (!id) return redirect("/billing");
  const s = await stripeSession(env, id);
  if (String(s.client_reference_id) !== String(coach.id)) return redirect("/billing");
  const sub = typeof s.subscription === "object" ? s.subscription : s.subscription ? await stripeSubscription(env, s.subscription) : null;
  const st = statusFromSub(sub) || (s.status === "complete" ? "trial" : null);
  if (st) {
    const trialEnd = sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString().replace("T", " ").slice(0, 19) : null;
    await env.DB.prepare("UPDATE coaches SET status = ?, stripe_customer = ?, stripe_sub = ?, trial_end = ? WHERE id = ?")
      .bind(st, s.customer || coach.stripe_customer, sub?.id || coach.stripe_sub, trialEnd, coach.id).run();
    await logEvent(env, coach.id, "paid", st);
    await notifyOwner(env, "New paying coach", `${coach.name} <${coach.email}> started Spotter (${st}).`);
    await sendMail(env, { to: coach.email, subject: "You're live on Spotter", text: `Nice, ${coach.name.split(" ")[0]}! Last step: connect your Instagram so Spotter can start answering your DMs:\n${env.PUBLIC_URL}/connect\n\nSpotter` });
  }
  return redirect("/connect?welcome=1");
}

async function billingPortal(req, env, coach) {
  if (!coach.stripe_customer) return redirect("/billing");
  try {
    const s = await stripePortal(env, coach.stripe_customer, origin(req) + "/billing");
    return redirect(s.url);
  } catch (e) {
    await logEvent(env, coach.id, "portal_error", e.message);
    return html(authCard("Manage your subscription", `Email ${esc(env.CONTACT_EMAIL)} and we'll change or cancel it for you the same day.`, `<a class="btn btn-ghost" href="/billing">Back</a>`, coach));
  }
}

async function syncBilling(env) {
  const rows = (await env.DB.prepare("SELECT id, stripe_sub, status FROM coaches WHERE stripe_sub IS NOT NULL AND status <> 'free'").all()).results;
  for (const r of rows) {
    try {
      const sub = await stripeSubscription(env, r.stripe_sub);
      const st = statusFromSub(sub);
      if (st && st !== r.status) {
        await env.DB.prepare("UPDATE coaches SET status = ? WHERE id = ?").bind(st, r.id).run();
        await logEvent(env, r.id, "billing_status", `${r.status} -> ${st}`);
        if (st === "canceled") await notifyOwner(env, "Coach canceled", `Coach #${r.id} canceled.`);
      }
    } catch (e) { await logEvent(env, r.id, "billing_sync_error", e.message); }
  }
}

/* ======================= INSTAGRAM ======================= */

async function connectPage(req, env, coach, url) {
  const welcome = url.searchParams.get("welcome") ? `<div class="ok" style="margin-bottom:16px">You're live. Connect Instagram and Spotter starts answering.</div>` : "";
  const err = url.searchParams.get("error") ? `<div class="err" style="margin-bottom:16px">Instagram didn't connect: ${esc(url.searchParams.get("error"))}. Make sure it's a Business or Creator account and try again.</div>` : "";
  const requested = url.searchParams.get("requested") ? `<div class="ok" style="margin-bottom:16px">Got it. We'll connect your Instagram with you within 48 hours and email you first.</div>` : "";
  let inner;
  if (coach.ig_token) {
    inner = `<div class="status"><span class="dot on"></span><b>Connected as @${esc(coach.ig_username)}</b></div>
      <p class="small">Spotter answers new DMs to this account. Reply yourself in Instagram anytime: Spotter steps back in that chat.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <form method="post" action="/setter/toggle"><button class="btn ${coach.setter_on ? "btn-ghost" : "btn-main"}" type="submit">${coach.setter_on ? "Pause Spotter everywhere" : "Switch Spotter back on"}</button></form>
        <form method="post" action="/connect/disconnect"><button class="btn btn-ghost" type="submit">Disconnect Instagram</button></form>
      </div>`;
  } else if (igConfigured(env)) {
    inner = `<div class="status"><span class="dot off"></span><b>Not connected</b></div>
      <p class="small">You need an Instagram Business or Creator account. Switching is free in the Instagram app: Settings → Account type and tools.</p>
      <div><a class="btn btn-main" href="/connect/instagram">Connect Instagram</a></div>`;
  } else {
    inner = `<div class="status"><span class="dot off"></span><b>Not connected yet</b></div>
      <p class="small">We connect Instagram together with you, so it's done right the first time. Tell us your handle and we'll email you a time within 48 hours.</p>
      <form class="form" method="post" action="/connect/request" style="max-width:420px"><div class="field"><label for="ig">Your Instagram handle</label><input id="ig" name="ig" required placeholder="@yourcoachingname"></div><div><button class="btn btn-main" type="submit">Request connection</button></div></form>`;
  }
  const body = `<h2>Instagram</h2><p class="lede">Spotter only replies to people who message you first, through Instagram's official messaging connection.</p>${welcome}${err}${requested}<div class="panel" style="margin-top:0"><div class="pad" style="display:grid;gap:14px">${inner}</div></div>`;
  return html(appPage({ title: "Instagram", coach, active: "connect", body, needs: await needsCount(env, coach) }));
}

async function connectRequest(req, env, coach) {
  const f = await form(req);
  const ig = String(f.ig || "").trim().slice(0, 60);
  await logEvent(env, coach.id, "connect_request", ig);
  await notifyOwner(env, "Instagram connection requested", `${coach.name} <${coach.email}> wants Instagram ${ig} connected.`);
  return redirect("/connect?requested=1");
}

async function connectStart(req, env, coach) {
  if (!igConfigured(env)) return redirect("/connect");
  const state = randomHex(16);
  return redirect(igAuthorizeUrl(env, origin(req) + "/connect/instagram/callback", state), {
    "set-cookie": `spotter_ig_state=${state}; Path=/connect; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  });
}

async function connectCallback(req, env, coach, url) {
  const state = (req.headers.get("cookie") || "").match(/spotter_ig_state=([a-f0-9]+)/)?.[1];
  if (url.searchParams.get("error")) return redirect("/connect?error=" + encodeURIComponent(url.searchParams.get("error_description") || "access denied"));
  if (!state || state !== url.searchParams.get("state")) return redirect("/connect?error=" + encodeURIComponent("the login expired, please try again"));
  try {
    const r = await igExchangeCode(env, url.searchParams.get("code"), origin(req) + "/connect/instagram/callback");
    const taken = await env.DB.prepare("SELECT id FROM coaches WHERE ig_user_id = ? AND id <> ?").bind(r.userId, coach.id).first();
    if (taken) return redirect("/connect?error=" + encodeURIComponent("this Instagram account is already connected to another Spotter account"));
    await env.DB.prepare("UPDATE coaches SET ig_user_id = ?, ig_username = ?, ig_token = ?, ig_token_exp = ?, setter_on = 1 WHERE id = ?").bind(r.userId, r.username, r.token, r.exp, coach.id).run();
    await logEvent(env, coach.id, "ig_connected", r.username);
    await notifyOwner(env, "Instagram connected", `${coach.name} connected @${r.username}.`);
    return redirect("/dashboard?connected=1");
  } catch (e) {
    await logEvent(env, coach.id, "ig_connect_error", e.message);
    return redirect("/connect?error=" + encodeURIComponent("Instagram refused the connection"));
  }
}

async function webhook(req, env, ctx) {
  const url = new URL(req.url);
  if (req.method === "GET") {
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === env.META_VERIFY_TOKEN) {
      return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const raw = await req.text();
  if (!(await verifySignature(env, req, raw))) return new Response("bad signature", { status: 401 });
  let body;
  try { body = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
  const events = parseWebhook(body);
  ctx.waitUntil(Promise.all(events.map((ev) => handleEvent(env, ev).catch((e) => logEvent(env, null, "webhook_error", e.message)))));
  return new Response("EVENT_RECEIVED", { status: 200 });
}

async function dataDeletion(req, env) {
  // Meta "data deletion request" callback: signed_request for a user who removed the app.
  const f = await form(req);
  const sr = String(f.signed_request || "");
  const [sig, payload] = sr.split(".");
  if (!sig || !payload || !env.META_APP_SECRET) return json({ error: "bad request" }, 400);
  const b64 = (s) => s.replace(/-/g, "+").replace(/_/g, "/");
  const expected = await hmacHex(env.META_APP_SECRET, payload);
  const got = [...atob(b64(sig))].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  if (!safeEqual(expected, got)) return json({ error: "bad signature" }, 401);
  const data = JSON.parse(atob(b64(payload)));
  const code = randomHex(8);
  const c = await env.DB.prepare("SELECT id FROM coaches WHERE ig_user_id = ?").bind(String(data.user_id)).first();
  if (c) {
    await env.DB.prepare("DELETE FROM messages WHERE lead_id IN (SELECT id FROM leads WHERE coach_id = ?)").bind(c.id).run();
    await env.DB.prepare("DELETE FROM leads WHERE coach_id = ?").bind(c.id).run();
    await env.DB.prepare("UPDATE coaches SET ig_token = NULL, ig_user_id = NULL, ig_username = NULL WHERE id = ?").bind(c.id).run();
  }
  await logEvent(env, c?.id, "data_deletion", code);
  return json({ url: `${origin(req)}/data-deletion?code=${code}`, confirmation_code: code });
}

/* ======================= DASHBOARD ======================= */

const needsCount = async (env, coach) => (await env.DB.prepare("SELECT COUNT(*) n FROM leads WHERE coach_id = ? AND stage = 'needs_you'").bind(coach.id).first()).n;

function leadRow(l) {
  const who = l.username ? "@" + l.username : l.name || "Instagram user";
  const stage = l.paused ? "paused" : l.stage;
  const label = l.paused ? "You took over" : STAGE_LABEL[l.stage] || l.stage;
  return `<a class="row" href="/inbox/${l.id}"><div class="av ${l.stage === "needs_you" ? "hot" : ""}">${esc(initials(who))}</div><div style="min-width:0"><b>${esc(who)}</b>${l.source === "comment" ? ` <span class="small">· from a comment</span>` : ""}<p>${esc(l.last_text || l.brief || "")}</p></div><div style="text-align:right"><span class="pill p-${stage}">${esc(label)}</span><p class="small" style="margin:4px 0 0">${esc(timeAgo(l.updated_at))}</p></div></a>`;
}

const LEADS_SQL = `SELECT l.*, (SELECT text FROM messages WHERE lead_id = l.id ORDER BY id DESC LIMIT 1) last_text FROM leads l WHERE l.coach_id = ?`;

async function dashboard(req, env, coach) {
  const s = await weekStats(env, coach.id);
  const needs = (await env.DB.prepare(LEADS_SQL + " AND l.stage = 'needs_you' ORDER BY l.updated_at DESC LIMIT 10").bind(coach.id).all()).results;
  const latest = (await env.DB.prepare(LEADS_SQL + " ORDER BY l.updated_at DESC LIMIT 6").bind(coach.id).all()).results;
  const first = (coach.name || "").split(" ")[0];
  const hour = new Date().getUTCHours() + 1;
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstAnswer = (await env.DB.prepare("SELECT COUNT(*) n FROM messages m JOIN leads l ON l.id = m.lead_id WHERE l.coach_id = ? AND m.role = 'bot'").bind(coach.id).first()).n > 0;
  const steps = [
    [profileComplete(coach.profileObj), "Build your setter", "/setter"],
    [hasAccess(coach), "Go live", "/billing"],
    [!!coach.ig_token, "Connect Instagram", "/connect"],
    [firstAnswer, "First DM answered", "/inbox"],
  ];
  const checklist = steps.every((x) => x[0]) ? "" : `<div class="panel" style="margin:0 0 18px"><h3>Getting started</h3><div class="pad" style="display:grid;gap:10px">${steps.map(([done, label, href], i) => `<a href="${href}" style="display:flex;gap:12px;align-items:center;text-decoration:none"><span class="tick ${done ? "done" : ""}">${done ? "✓" : i + 1}</span><span style="${done ? "color:var(--mute);text-decoration:line-through" : ""}">${label}</span></a>`).join("")}${!firstAnswer && coach.ig_token ? `<p class="small" style="margin:4px 0 0">Send your account a DM from another Instagram account to see Spotter in action.</p>` : ""}</div></div>`;
  const setup = !coach.ig_token
    ? checklist ? "" : `<div class="note" style="margin-bottom:18px;display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap"><span><b>One step left:</b> connect Instagram so Spotter can start answering.</span><a class="btn btn-main" href="/connect">Connect Instagram</a></div>`
    : !coach.setter_on
      ? `<div class="note" style="margin-bottom:18px;display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap"><span><b>Spotter is paused.</b> New DMs are not being answered.</span><form method="post" action="/setter/toggle"><button class="btn btn-main" type="submit">Switch back on</button></form></div>`
      : "";
  const status = coach.ig_token ? `<div class="status small" style="margin-bottom:20px"><span class="dot ${coach.setter_on ? "on" : "off"}"></span>${coach.setter_on ? `Spotter is answering DMs for @${esc(coach.ig_username)}` : "Paused"}</div>` : "";
  const body = `<h2>${greet}, ${esc(first)}</h2><p class="lede">What Spotter did in the last 7 days.</p>${checklist}${setup}${status}
    <div class="tiles">
      <div class="tile"><span>Conversations</span><b>${s.chats}</b></div>
      <div class="tile"><span>DMs answered</span><b>${s.answered}</b></div>
      <div class="tile"><span>Booking links sent</span><b>${s.links}</b></div>
      <div class="tile"><span>Need you</span><b style="color:${s.needs ? "var(--volt)" : "inherit"}">${s.needs}</b></div>
    </div>
    ${needs.length ? `<div class="panel"><h3>Needs you personally</h3>${needs.map(leadRow).join("")}</div>` : ""}
    <div class="panel"><h3>Latest conversations</h3>${latest.length ? latest.map(leadRow).join("") : `<div class="empty">No DMs yet. ${coach.ig_token ? "As soon as someone messages you, the chat shows up here." : "Connect Instagram to get started."}</div>`}</div>`;
  return html(appPage({ title: "Today", coach, active: "today", body, needs: s.needs }));
}

async function inboxPage(req, env, coach, url) {
  const filter = url.searchParams.get("f") || "all";
  const where = { all: "", needs: " AND l.stage = 'needs_you'", qualifying: " AND l.stage = 'qualifying'", links: " AND l.stage IN ('link_sent','booked')", paused: " AND l.paused = 1" }[filter] ?? "";
  const leads = (await env.DB.prepare(LEADS_SQL + where + " ORDER BY l.updated_at DESC LIMIT 200").bind(coach.id).all()).results;
  const tab = (k, label) => `<a class="chip ${filter === k ? "on" : ""}" style="text-decoration:none" href="/inbox?f=${k}">${label}</a>`;
  const body = `<h2>Inbox</h2><p class="lede">Every DM Spotter handled. Open a chat to read it, reply yourself or hand it back.</p>
    <div class="chips" style="margin-bottom:14px">${tab("all", "All")}${tab("needs", "Needs you")}${tab("qualifying", "Qualifying")}${tab("links", "Link sent")}${tab("paused", "You took over")}</div>
    <div class="panel" style="margin-top:0">${leads.length ? leads.map(leadRow).join("") : `<div class="empty">Nothing here yet.</div>`}</div>`;
  return html(appPage({ title: "Inbox", coach, active: "inbox", body, needs: await needsCount(env, coach) }));
}

async function threadPage(req, env, coach, id, url) {
  const l = await env.DB.prepare("SELECT * FROM leads WHERE id = ? AND coach_id = ?").bind(id, coach.id).first();
  if (!l) return redirect("/inbox");
  const msgs = (await env.DB.prepare("SELECT * FROM messages WHERE lead_id = ? ORDER BY id").bind(id).all()).results;
  const who = l.username ? "@" + l.username : l.name || "Instagram user";
  const bub = (m) => `<div class="bub ${m.role}${m.role === "bot" && /calendly|cal\.com|http/i.test(m.text) ? " link" : ""}"><span class="by">${m.role === "lead" ? esc(who) : m.role === "bot" ? "Spotter" : "You"} · ${esc(timeAgo(m.created_at))}</span>${esc(m.text)}</div>`;
  const err = url.searchParams.get("error") ? `<div class="err" style="margin-bottom:12px">${esc(url.searchParams.get("error"))}</div>` : "";
  const stageBtn = (st, label) => `<form method="post" action="/inbox/${id}/stage"><input type="hidden" name="stage" value="${st}"><button class="btn btn-ghost" style="padding:8px 14px;font-size:13px" type="submit">${label}</button></form>`;
  const body = `<p style="margin:0 0 12px"><a href="/inbox" class="small">← Inbox</a></p>${err}
    <div class="setter-grid">
      <div class="thread">
        <div class="thread-head"><div><b>${esc(who)}</b><p class="small" style="margin:0">${esc(l.name && l.username ? l.name + " · " : "")}${esc(STAGE_LABEL[l.stage] || l.stage)}${l.paused ? " · you took over" : ""}</p></div>
          <form method="post" action="/inbox/${id}/${l.paused ? "resume" : "pause"}"><button class="btn ${l.paused ? "btn-main" : "btn-ghost"}" style="padding:8px 14px;font-size:13px" type="submit">${l.paused ? "Hand back to Spotter" : "Take over chat"}</button></form></div>
        <div class="msgs" id="th">${msgs.map(bub).join("") || `<div class="empty">No messages yet.</div>`}</div>
        <form class="composer" method="post" action="/inbox/${id}/send"><label for="say" style="position:absolute;left:-9999px">Reply as yourself</label><input id="say" name="text" autocomplete="off" placeholder="Reply as yourself (Spotter pauses in this chat)" required><button type="submit">Send</button></form>
      </div>
      <div class="panel" style="margin-top:0"><h3>What Spotter knows</h3><div class="pad"><p style="margin:0 0 14px">${esc(l.brief || "Nothing yet.")}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${stageBtn("booked", "Mark booked")}${stageBtn("not_fit", "Not a fit")}${stageBtn("qualifying", "Back to qualifying")}</div>
        <p class="small" style="margin:14px 0 0">Instagram allows replies up to 24 hours after their last message.</p></div></div>
    </div>`;
  return html(appPage({ title: who, coach, active: "inbox", body, needs: await needsCount(env, coach), script: `const t=document.getElementById('th');if(t)t.scrollTop=t.scrollHeight;` }));
}

async function threadAction(req, env, coach, id, action) {
  const l = await env.DB.prepare("SELECT * FROM leads WHERE id = ? AND coach_id = ?").bind(id, coach.id).first();
  if (!l) return redirect("/inbox");
  const f = await form(req);
  if (action === "pause") await env.DB.prepare("UPDATE leads SET paused = 1 WHERE id = ?").bind(id).run();
  if (action === "resume") await env.DB.prepare("UPDATE leads SET paused = 0, stage = CASE WHEN stage = 'needs_you' THEN 'qualifying' ELSE stage END WHERE id = ?").bind(id).run();
  if (action === "stage" && ["booked", "not_fit", "qualifying"].includes(f.stage)) await env.DB.prepare("UPDATE leads SET stage = ?, updated_at = datetime('now') WHERE id = ?").bind(f.stage, id).run();
  if (action === "send") {
    const text = String(f.text || "").trim().slice(0, 1000);
    if (text) {
      if (!coach.ig_token) return redirect(`/inbox/${id}?error=` + encodeURIComponent("Connect Instagram first."));
      const msg = await env.DB.prepare("INSERT INTO messages (lead_id, role, text) VALUES (?, 'coach', ?) RETURNING id").bind(id, text).first();
      try {
        const mid = await igSend(env, coach, l.ig_sender_id, text);
        if (mid) await env.DB.prepare("UPDATE messages SET mid = ? WHERE id = ?").bind(mid, msg.id).run().catch(() => {});
        await env.DB.prepare("UPDATE leads SET paused = 1, last_out_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").bind(id).run();
      } catch (e) {
        await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(msg.id).run();
        return redirect(`/inbox/${id}?error=` + encodeURIComponent("Instagram didn't accept the message. The 24-hour reply window may have closed; reply from the Instagram app."));
      }
    }
  }
  return redirect(`/inbox/${id}`);
}

async function callsPage(req, env, coach) {
  const rows = (await env.DB.prepare(LEADS_SQL + " AND l.stage IN ('link_sent','booked') ORDER BY CASE l.stage WHEN 'booked' THEN 0 ELSE 1 END, l.updated_at DESC LIMIT 100").bind(coach.id).all()).results;
  const row = (l) => {
    const who = l.username ? "@" + l.username : l.name || "Instagram user";
    return `<a class="row" href="/inbox/${l.id}"><div class="av hot">${esc(initials(who))}</div><div style="min-width:0"><b>${esc(who)}</b><p class="wrap">${esc(l.brief || "No brief yet.")}</p></div><span class="pill p-${l.stage}">${STAGE_LABEL[l.stage]}</span></a>`;
  };
  const body = `<h2>Calls</h2><p class="lede">Everyone who got your booking link, with a short brief so you know who you're talking to. Mark a lead booked from their chat.</p>
    <div class="panel" style="margin-top:0">${rows.length ? rows.map(row).join("") : `<div class="empty">No booking links sent yet.</div>`}</div>`;
  return html(appPage({ title: "Calls", coach, active: "calls", body, needs: await needsCount(env, coach) }));
}

/* ======================= OWNER ======================= */

async function adminPage(req, env, coach) {
  const coaches = (await env.DB.prepare(`SELECT c.id, c.name, c.email, c.status, c.ig_username, c.trial_end, c.created_at, c.setter_on,
      (SELECT COUNT(*) FROM leads WHERE coach_id = c.id) leads,
      (SELECT COUNT(*) FROM leads WHERE coach_id = c.id AND stage IN ('link_sent','booked')) links
    FROM coaches c ORDER BY c.id DESC LIMIT 300`).all()).results;
  const events = (await env.DB.prepare("SELECT e.*, c.email FROM events e LEFT JOIN coaches c ON c.id = e.coach_id ORDER BY e.id DESC LIMIT 40").all()).results;
  const paying = coaches.filter((c) => c.status === "active").length;
  const trials = coaches.filter((c) => c.status === "trial").length;
  const mrr = paying * Number(env.PRICE_EUR_CENTS || 29700) / 100;
  const h = (await env.DB.prepare("SELECT 1").first()) && {
    ai: !!env.ANTHROPIC_API_KEY, stripe: stripeConfigured(env), mail: !!env.RESEND_API_KEY, instagram: igConfigured(env), push: !!env.PUSH_TOPIC,
  };
  const chk = (ok, label) => `<span class="status small" style="gap:6px"><span class="dot ${ok ? "on" : "off"}"></span>${label}</span>`;
  const body = `<h2>Owner</h2><p class="lede">Everything about Spotter in one place.</p>
    <div class="tiles"><div class="tile"><span>Paying coaches</span><b>${paying}</b></div><div class="tile"><span>On 7-day start</span><b>${trials}</b></div><div class="tile"><span>MRR</span><b>€${mrr.toLocaleString("nl-NL")}</b></div><div class="tile"><span>Accounts</span><b>${coaches.length}</b></div></div>
    <div class="panel"><h3>System</h3><div class="pad" style="display:flex;gap:18px;flex-wrap:wrap">${chk(h.ai, "Claude")}${chk(h.stripe, "Stripe")}${chk(h.mail, "E-mail")}${chk(h.instagram, "Instagram app")}${chk(h.push, "Phone push")}</div></div>
    <div class="panel"><h3>Coaches</h3><div class="tablewrap"><table><thead><tr><th>#</th><th>Coach</th><th>Status</th><th>Instagram</th><th class="num">Chats</th><th class="num">Links</th><th>Since</th><th></th></tr></thead><tbody>
      ${coaches.map((c) => `<tr><td class="num">${c.id}</td><td>${esc(c.name)}<br><span class="small">${esc(c.email)}</span></td><td>${esc(STATUS_TEXT[c.status] || c.status)}${c.trial_end && c.status === "trial" ? `<br><span class="small">until ${esc(c.trial_end.slice(0, 10))}</span>` : ""}</td><td>${c.ig_username ? "@" + esc(c.ig_username) + (c.setter_on ? "" : " (paused)") : `<span class="small">not connected</span>`}</td><td class="num">${c.leads}</td><td class="num">${c.links}</td><td><span class="small">${esc(c.created_at.slice(0, 10))}</span></td><td><form method="post" action="/admin/coach/${c.id}" style="display:flex;gap:6px;flex-wrap:wrap">${c.status === "free" ? `<button class="chip" name="do" value="unfree">Remove free</button>` : `<button class="chip" name="do" value="free">Give free</button>`}<button class="chip" name="do" value="${c.setter_on ? "pause" : "resume"}">${c.setter_on ? "Pause" : "Resume"}</button></form></td></tr>`).join("") || `<tr><td colspan="8" class="small">No coaches yet.</td></tr>`}
    </tbody></table></div></div>
    <div class="panel"><h3>Recent activity</h3><div class="tablewrap"><table><tbody>${events.map((e) => `<tr><td><span class="small">${esc(e.created_at)}</span></td><td>${esc(e.kind)}</td><td>${esc(e.email || "")}</td><td class="small">${esc(e.data.slice(0, 160))}</td></tr>`).join("") || `<tr><td class="small">Nothing yet.</td></tr>`}</tbody></table></div></div>`;
  return html(appPage({ title: "Owner", coach, active: "admin", body, needs: await needsCount(env, coach) }));
}

async function adminAction(req, env, coach, id) {
  const f = await form(req);
  const c = await env.DB.prepare("SELECT * FROM coaches WHERE id = ?").bind(id).first();
  if (!c) return redirect("/admin");
  if (f.do === "free") await env.DB.prepare("UPDATE coaches SET status = 'free' WHERE id = ?").bind(id).run();
  if (f.do === "unfree") await env.DB.prepare("UPDATE coaches SET status = CASE WHEN stripe_sub IS NOT NULL THEN 'active' ELSE 'new' END WHERE id = ?").bind(id).run();
  if (f.do === "pause") await env.DB.prepare("UPDATE coaches SET setter_on = 0 WHERE id = ?").bind(id).run();
  if (f.do === "resume") await env.DB.prepare("UPDATE coaches SET setter_on = 1 WHERE id = ?").bind(id).run();
  await logEvent(env, id, "owner_" + f.do, coach.email);
  return redirect("/admin");
}

/* ======================= SETTINGS + HELP ======================= */

async function settingsPage(req, env, coach, url, msg = "") {
  const saved = url?.searchParams.get("saved") ? `<div class="ok" style="margin-bottom:16px">Saved.</div>` : "";
  const body = `<h2>Settings</h2><p class="lede">Your account and notifications.</p>${saved}${msg}
    <div class="panel" style="margin-top:0"><h3>Account</h3><div class="pad">
      <form class="form" method="post" action="/settings" style="max-width:480px">
        <input type="hidden" name="section" value="account">
        <div class="field"><label for="s-name">Your name</label><input id="s-name" name="name" required value="${esc(coach.name)}"></div>
        <div class="field"><label for="s-email">Email</label><input id="s-email" name="email" type="email" required value="${esc(coach.email)}"></div>
        <label class="small" style="display:flex;gap:10px;align-items:center;cursor:pointer"><input type="checkbox" name="notify_email" value="1" ${coach.notify_email ? "checked" : ""}> Email me when a lead gets my link or needs me personally</label>
        <div><button class="btn btn-main" type="submit">Save</button></div>
      </form></div></div>
    <div class="panel"><h3>Password</h3><div class="pad">
      <form class="form" method="post" action="/settings" style="max-width:480px">
        <input type="hidden" name="section" value="password">
        <div class="field"><label for="s-old">Current password</label><input id="s-old" name="old" type="password" autocomplete="current-password" required></div>
        <div class="field"><label for="s-new">New password</label><input id="s-new" name="new" type="password" minlength="8" autocomplete="new-password" required></div>
        <div><button class="btn btn-ghost" type="submit">Change password</button></div>
      </form></div></div>
    <div class="panel"><h3>Delete account</h3><div class="pad">
      <p class="small" style="margin:0 0 12px">Stops Spotter, cancels your subscription and deletes all your conversations. This can't be undone.</p>
      <form class="form" method="post" action="/settings/delete" style="max-width:480px">
        <div class="field"><label for="s-del">Type DELETE to confirm</label><input id="s-del" name="confirm" autocomplete="off" required></div>
        <div><button class="btn btn-ghost" style="border-color:rgba(255,107,107,.5);color:#ffb3b3" type="submit">Delete my account</button></div>
      </form></div></div>`;
  return html(appPage({ title: "Settings", coach, active: "settings", body, needs: await needsCount(env, coach) }));
}

async function settingsPost(req, env, coach) {
  const f = await form(req);
  const url = new URL(req.url);
  const bad = (t) => settingsPage(req, env, coach, null, `<div class="err" style="margin-bottom:16px">${esc(t)}</div>`);
  if (f.section === "account") {
    const email = String(f.email || "").trim().toLowerCase();
    if (!isEmail(email)) return bad("That email address doesn't look right.");
    if (email !== coach.email) {
      const taken = await env.DB.prepare("SELECT id FROM coaches WHERE email = ? AND id <> ?").bind(email, coach.id).first();
      if (taken) return bad("Another account already uses that email.");
    }
    await env.DB.prepare("UPDATE coaches SET name = ?, email = ?, notify_email = ? WHERE id = ?").bind(String(f.name || coach.name).trim().slice(0, 120), email, f.notify_email ? 1 : 0, coach.id).run();
  }
  if (f.section === "password") {
    if (!(await checkLogin(env, coach.email, String(f.old || "")))) return bad("Your current password isn't right.");
    if (String(f.new || "").length < 8) return bad("Your new password needs at least 8 characters.");
    const { hash, salt } = await hashPassword(String(f.new));
    await env.DB.prepare("UPDATE coaches SET pw_hash = ?, pw_salt = ? WHERE id = ?").bind(hash, salt, coach.id).run();
  }
  return redirect("/settings?saved=1");
}

async function deleteAccount(req, env, coach) {
  const f = await form(req);
  if (String(f.confirm || "").trim().toUpperCase() !== "DELETE") return settingsPage(req, env, coach, null, `<div class="err" style="margin-bottom:16px">Type DELETE to confirm.</div>`);
  if (coach.stripe_sub && stripeConfigured(env) && coach.status !== "canceled") {
    try { await stripeCancel(env, coach.stripe_sub); } catch (e) { await logEvent(env, coach.id, "cancel_error", e.message); }
  }
  await env.DB.prepare("DELETE FROM messages WHERE lead_id IN (SELECT id FROM leads WHERE coach_id = ?)").bind(coach.id).run();
  await env.DB.prepare("DELETE FROM leads WHERE coach_id = ?").bind(coach.id).run();
  await env.DB.prepare("DELETE FROM sessions WHERE coach_id = ?").bind(coach.id).run();
  await env.DB.prepare("DELETE FROM coaches WHERE id = ?").bind(coach.id).run();
  await logEvent(env, null, "account_deleted", coach.email);
  await notifyOwner(env, "Account deleted", `${coach.name} <${coach.email}> deleted their account.`);
  return redirect("/?deleted=1", { "set-cookie": "spotter_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
}

async function helpPage(req, env, coach) {
  const qa = [
    ["How does Spotter know what to say?", "From your 6 answers on <a href=\"/setter\">Your setter</a>. Change them anytime; the next message uses the new version. Test every change in the test chat."],
    ["What if I want to reply myself?", "Just reply in Instagram as you normally do. Spotter sees it and stays quiet in that chat. Hand it back from the chat in your <a href=\"/inbox\">Inbox</a>."],
    ["Which questions does Spotter ask?", "One at a time: their goal, why now, what they tried before, and whether they're ready to invest. Only people who fit get your booking link."],
    ["What does Spotter never do?", "Message people who didn't contact you first, promise results, discounts or guarantees you didn't give it, or answer medical questions. Those go to you, marked Needs you."],
    ["What's the 24-hour rule?", "Instagram allows replies up to 24 hours after someone's last message. Spotter sends one friendly follow-up before that window closes."],
    ["How does Comment-to-DM work?", "Add a keyword like COACH on <a href=\"/setter\">Your setter</a> and say \"comment COACH\" in your reel. Everyone who comments it gets your first DM, and Spotter continues the conversation."],
    ["How do I pause Spotter?", "On the <a href=\"/connect\">Instagram</a> page. Pausing stops all replies until you switch it back on."],
    ["How do I cancel?", "On <a href=\"/billing\">Billing</a>. Cancel within your first 7 days and you pay nothing more."],
  ];
  const body = `<h2>Help</h2><p class="lede">Quick answers. Anything else? Email ${esc(env.CONTACT_EMAIL)} and you'll hear back the same day.</p>
    <div style="display:grid;gap:10px;max-width:760px">${qa.map(([q, a], i) => `<details class="panel" style="margin:0" ${i === 0 ? "open" : ""}><summary style="padding:16px 18px;cursor:pointer;font-weight:600">${q}</summary><p style="margin:0;padding:0 18px 16px;color:var(--mute)">${a}</p></details>`).join("")}</div>`;
  return html(appPage({ title: "Help", coach, active: "help", body, needs: await needsCount(env, coach) }));
}

/* ======================= LEGAL ======================= */

const legal = (title, inner) => page({ title, body: `<div class="legal"><h1>${title}</h1><p class="small">Last updated 8 November 2026</p>${inner}</div>` });

function legalPrivacy(env) {
  return legal("Privacy policy", `
  <p>Spotter is a service of Hanssens Cornerstone Capital (KvK 98133438, Vlissingen, the Netherlands). This policy explains what we do with data. Contact: ${esc(env.CONTACT_EMAIL)}.</p>
  <h2>Coaches (our customers)</h2><p>We store your name, email, a hashed password, your setter answers and your billing status. Payments are handled by Stripe; we never see your card. When you connect Instagram we store an access token for your Business or Creator account, your account id and username.</p>
  <h2>People who message a coach</h2><p>When someone sends a DM to a coach who uses Spotter, we receive that message from Instagram, store the conversation, their Instagram-scoped id, name and username, and generate replies with an AI model (Anthropic Claude). We use this only to answer on behalf of that coach and to show the conversation in the coach's dashboard. We do not sell data or use it for advertising.</p>
  <h2>Processors</h2><ul><li>Cloudflare (hosting and database)</li><li>Anthropic (AI replies)</li><li>Stripe (payments)</li><li>Resend (e-mail)</li><li>Meta (Instagram messaging)</li></ul>
  <h2>Retention and your rights</h2><p>Coach data is kept while the account is active and deleted within 30 days after a request. Anyone can ask us to see, correct or delete their data by emailing ${esc(env.CONTACT_EMAIL)}. See also <a href="/data-deletion">data deletion</a>.</p>`);
}

function legalTerms(env) {
  return legal("Terms", `
  <p>These terms apply to Spotter, a service of Hanssens Cornerstone Capital, Vlissingen (KvK 98133438).</p>
  <h2>The service</h2><p>Spotter replies to Instagram DMs on your behalf based on the information you provide, qualifies leads and sends your booking link. You stay responsible for what you offer, your prices and the claims in your answers. Spotter only replies to people who message you first and follows Instagram's messaging rules, including the 24-hour reply window.</p>
  <h2>Price and cancellation</h2><p>The first 7 days cost €1. After that Spotter costs €297 per month, billed monthly in advance. Cancel anytime; cancel within the first 7 days and you pay nothing more. No refunds for months already started.</p>
  <h2>The 5-call promise</h2><p>If Spotter doesn't send your booking link to at least 5 qualified leads in your first 30 paid days while Instagram is connected and Spotter is switched on, your second month is free. Email us to claim it.</p>
  <h2>Fair use</h2><p>No spam, no unsolicited messages, nothing that breaks Instagram's rules or the law. We may pause an account that does.</p>
  <h2>Liability</h2><p>Spotter is provided as is. Our liability is limited to the fees you paid in the last 3 months. Dutch law applies.</p>`);
}

function legalDeletion(env) {
  return legal("Data deletion", `
  <p>You can delete your data at any time.</p>
  <h2>Coaches</h2><p>Disconnect Instagram from your Spotter dashboard (Instagram → Disconnect) to stop all access immediately. To delete your whole account and all conversations, email ${esc(env.CONTACT_EMAIL)} from your account address. We delete it within 30 days and confirm by email.</p>
  <h2>People who messaged a coach</h2><p>Email ${esc(env.CONTACT_EMAIL)} with your Instagram username and the coach you messaged. We delete your conversation within 30 days.</p>
  <h2>Removing the app in Instagram</h2><p>If you remove Spotter from your Instagram settings, we automatically delete the stored access token and conversations for that account.</p>`);
}

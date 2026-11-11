// End-to-end test against `wrangler dev` (port 8787) + test/mock.mjs (port 9999).
import { createHmac } from "node:crypto";
import { execSync } from "node:child_process";
const B = process.env.BASE || "http://localhost:8787";
const M = "http://localhost:9999";
let jar = {}; let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
const ck = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
async function req(path, { method = "GET", form, json, headers = {}, raw } = {}) {
  const h = { cookie: ck(), ...headers };
  let body;
  if (form) { body = new URLSearchParams(form); h["content-type"] = "application/x-www-form-urlencoded"; }
  if (json) { body = JSON.stringify(json); h["content-type"] = "application/json"; }
  if (raw) body = raw;
  let r;
  for (let i = 0; ; i++) {
    try { r = await fetch(B + path, { method, headers: h, body, redirect: "manual" }); break; }
    catch (e) { if (i >= 3) throw e; await wait(1500); }
  }
  for (const c of r.headers.getSetCookie?.() || []) { const [kv] = c.split(";"); const [k, v] = kv.split("="); if (v) jar[k] = v; else delete jar[k]; }
  const text = await r.text();
  return { s: r.status, loc: r.headers.get("location") || "", text };
}
const sql = (q) => JSON.parse((s => s.slice(s.indexOf("[")))(execSync(`npx wrangler d1 execute spotter-db --local --json --command "${q.replace(/"/g, '\\"')}"`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })))[0].results;
const mocklog = async () => (await fetch(M + "/_log")).json();
const sign = (raw) => "sha256=" + createHmac("sha256", "appsecret").update(raw).digest("hex");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const hook = async (msg) => { const raw = JSON.stringify({ object: "instagram", entry: [{ id: "17840000", time: Date.now(), messaging: [msg] }] }); return req("/webhook/instagram", { method: "POST", raw, headers: { "x-hub-signature-256": sign(raw), "content-type": "application/json" } }); };

let r = await req("/"); ok(r.s === 200 && r.text.includes("books the calls"), "landing loads");
r = await req("/health"); ok(JSON.parse(r.text).ok === true, "health ok " + r.text);
r = await req("/api/demo", { method: "POST", json: { history: [{ role: "lead", text: "hi" }] } }); ok(JSON.parse(r.text).reply, "demo replies");
r = await req("/dashboard"); ok(r.s === 303 && r.loc.startsWith("/login"), "dashboard needs login");
r = await req("/start", { method: "POST", form: { name: "Test Coach", email: "coach@test.nl", password: "short" } }); ok(r.s === 400, "short password refused");
r = await req("/start", { method: "POST", form: { name: "Test Coach", email: "coach@test.nl", password: "supersecret1" } }); ok(r.s === 303 && r.loc === "/setup" && jar.spotter_session, "signup");
r = await req("/start", { method: "POST", form: { name: "Dup", email: "coach@test.nl", password: "supersecret1" } }); ok(r.s === 409 || r.s === 303, "duplicate handled");
r = await req("/setup"); ok(r.s === 200 && r.text.includes("Build your setter"), "setup page");
r = await req("/api/test-chat", { method: "POST", json: { history: [{ role: "lead", text: "hi" }] } }); ok(/Fill in all 6/.test(JSON.parse(r.text).reply), "test chat asks for profile first");
r = await req("/setter", { method: "POST", form: { back: "setup", name: "Coach Test", program: "12 weeks 1:1", price: "€997", fit: "Women 25-45", link: "calendly.com/coachtest/call", tone: "Direct and no-nonsense" } });
ok(r.s === 303 && r.loc === "/setup?saved=1", "setter saved");
r = await req("/api/test-chat", { method: "POST", json: { history: [{ role: "lead", text: "how much?" }] } }); ok(/goal/.test(JSON.parse(r.text).reply), "test chat uses AI");
r = await req("/dashboard"); ok(r.s === 303 && r.loc === "/billing", "unpaid → billing");
const cid = sql("SELECT id FROM coaches WHERE email='coach@test.nl'")[0].id; await fetch(M + "/_ref?id=" + cid);
r = await req("/billing/checkout", { method: "POST" }); ok(r.s === 303 && r.loc.includes("/pay"), "checkout redirect");
const co = (await mocklog()).find((x) => x.p === "/v1/checkout/sessions");
ok(co && co.body.includes("trial_period_days%5D=7") && co.body.includes("29700") && co.body.includes("unit_amount%5D=100"), "stripe params: 7d trial, €297, €1");
r = await req("/billing/return?session_id=cs_test_1"); ok(r.s === 303 && r.loc === "/connect?welcome=1", "billing return");
ok(sql("SELECT status FROM coaches WHERE id=" + cid)[0].status === "trial", "coach on trial");
r = await req("/connect"); ok(r.text.includes("Connect Instagram"), "connect page");
r = await req("/connect/instagram"); const state = new URL(r.loc).searchParams.get("state"); ok(r.s === 303 && state && jar.spotter_ig_state, "ig oauth start");
r = await req(`/connect/instagram/callback?code=abc&state=${state}`); ok(r.s === 303 && r.loc === "/dashboard?connected=1", "ig callback " + r.loc);
ok(sql("SELECT ig_username FROM coaches WHERE id=" + cid)[0].ig_username === "coachtest", "ig stored");
r = await req("/webhook/instagram?hub.mode=subscribe&hub.verify_token=spotter-verify-2026&hub.challenge=42"); ok(r.text === "42", "webhook verify");
r = await req("/webhook/instagram", { method: "POST", raw: "{}", headers: { "x-hub-signature-256": "sha256=bad" } }); ok(r.s === 401, "bad signature refused");

r = await hook({ sender: { id: "lead1" }, recipient: { id: "17840000" }, timestamp: Date.now(), message: { mid: "in_1", text: "hey how does your coaching work?" } });
ok(r.s === 200, "webhook accepted"); await wait(2500);
let lg = await mocklog(); let sends = lg.filter((x) => x.p === "/v23.0/17840000/messages");
ok(sends.length === 1 && sends[0].body.includes("lead1"), "bot replied on Instagram");
let lead = sql("SELECT * FROM leads WHERE coach_id=" + cid)[0]; ok(lead && lead.stage === "qualifying" && lead.username === "sanne.moves", "lead stored as qualifying");
// echo of our own message must be ignored
const botRow = sql("SELECT text, mid FROM messages WHERE role='bot' ORDER BY id DESC LIMIT 1")[0];
await hook({ sender: { id: "17840000" }, recipient: { id: "lead1" }, timestamp: Date.now(), message: { mid: botRow.mid, text: botRow.text, is_echo: true } }); await wait(800);
ok(sql("SELECT paused FROM leads WHERE id=" + lead.id)[0].paused === 0, "own echo ignored");
// duplicate delivery ignored
await hook({ sender: { id: "lead1" }, recipient: { id: "17840000" }, timestamp: Date.now(), message: { mid: "in_1", text: "hey how does your coaching work?" } }); await wait(1500);
ok(sql("SELECT COUNT(*) n FROM messages WHERE role='lead'")[0].n === 1, "duplicate webhook ignored");
// burst: two quick messages → one reply
await hook({ sender: { id: "lead1" }, recipient: { id: "17840000" }, timestamp: Date.now(), message: { mid: "in_2", text: "I want to lose 8kg" } });
await hook({ sender: { id: "lead1" }, recipient: { id: "17840000" }, timestamp: Date.now(), message: { mid: "in_3", text: "and yes I'm ready to invest" } });
await wait(2500);
lg = await mocklog(); sends = lg.filter((x) => x.p === "/v23.0/17840000/messages");
ok(sends.length === 2, "burst answered once (" + sends.length + " sends)");
lead = sql("SELECT * FROM leads WHERE id=" + lead.id)[0]; ok(lead.stage === "link_sent" && lead.brief, "stage link_sent + brief");
ok(lg.some((x) => x.p === "/emails" && x.body.includes("got your booking link")), "coach emailed about link");
// coach types in Instagram → takeover
await hook({ sender: { id: "17840000" }, recipient: { id: "lead1" }, timestamp: Date.now(), message: { mid: "coach_1", text: "Hey it's Mila herself!", is_echo: true } }); await wait(800);
ok(sql("SELECT paused FROM leads WHERE id=" + lead.id)[0].paused === 1, "coach reply pauses Spotter");
await hook({ sender: { id: "lead1" }, recipient: { id: "17840000" }, timestamp: Date.now(), message: { mid: "in_4", text: "great thanks" } }); await wait(1500);
ok((await mocklog()).filter((x) => x.p === "/v23.0/17840000/messages").length === 2, "paused chat not answered");
// medical → needs you
await hook({ sender: { id: "lead2" }, recipient: { id: "17840000" }, timestamp: Date.now(), message: { mid: "in_5", text: "I have a knee injury, can I join?" } }); await wait(2500);
const l2 = sql("SELECT * FROM leads WHERE ig_sender_id='lead2'")[0]; ok(l2.stage === "needs_you", "medical question flagged needs_you");
r = await req("/dashboard"); ok(r.s === 200 && r.text.includes("Needs you personally"), "dashboard shows needs you");
r = await req("/inbox"); ok(r.s === 200 && r.text.includes("sanne.moves"), "inbox lists leads");
r = await req("/inbox/" + lead.id); ok(r.s === 200 && r.text.includes("Mila herself"), "thread shows coach message");
const s0 = (await mocklog()).filter((x) => x.p === "/v23.0/17840000/messages").length;
r = await req(`/inbox/${l2.id}/send`, { method: "POST", form: { text: "Hi! Happy to help with that knee." } }); ok(r.s === 303, "coach sends from dashboard");
ok((await mocklog()).filter((x) => x.p === "/v23.0/17840000/messages").length === s0 + 1, "dashboard reply sent via Instagram");
r = await req(`/inbox/${lead.id}/resume`, { method: "POST" }); ok(sql("SELECT paused FROM leads WHERE id=" + lead.id)[0].paused === 0, "hand back to Spotter");
r = await req(`/inbox/${lead.id}/stage`, { method: "POST", form: { stage: "booked" } }); ok(sql("SELECT stage FROM leads WHERE id=" + lead.id)[0].stage === "booked", "mark booked");
r = await req("/calls"); ok(r.text.includes("Booked"), "calls page");
r = await req("/admin"); ok(r.s === 404, "non-owner can't see admin");
// follow-up inside the 24h window
await hook({ sender: { id: "lead3" }, recipient: { id: "17840000" }, timestamp: Date.now(), message: { mid: "in_6", text: "hi" } }); await wait(2500);
const l3 = sql("SELECT id FROM leads WHERE ig_sender_id='lead3'")[0].id;
sql(`UPDATE leads SET last_lead_at = datetime('now','-21 hours'), last_out_at = datetime('now','-21 hours','+1 minute') WHERE id=${l3}`);
const before = (await mocklog()).filter((x) => x.p === "/v23.0/17840000/messages").length;
await fetch(B + "/__scheduled?cron=*/30+*+*+*+*"); await wait(2000);
lg = await mocklog(); ok(lg.filter((x) => x.p === "/v23.0/17840000/messages").length === before + 1 && lg.some((x) => x.p === "/v1/messages" && x.body.includes("no reply from the lead")), "follow-up sent in window");
await fetch(B + "/__scheduled?cron=*/30+*+*+*+*"); await wait(1500);
ok((await mocklog()).filter((x) => x.p === "/v23.0/17840000/messages").length === before + 1, "follow-up only once");
// comment-to-DM
r = await req("/setter", { method: "POST", form: { name: "Coach Test", program: "12 weeks 1:1", price: "€997", fit: "Women 25-45", link: "calendly.com/coachtest/call", tone: "Direct and no-nonsense", keywords: "COACH, plan", comment_dm: "hey! here's the info you asked for. what's your goal?", comment_reply: "on" } });
ok(r.s === 303, "keywords saved");
const sendsC = (await mocklog()).filter((x) => x.p === "/v23.0/17840000/messages").length;
const changes = (id, text, from = "fan1") => { const raw = JSON.stringify({ object: "instagram", entry: [{ id: "17840000", time: Date.now(), changes: [{ field: "comments", value: { id, text, from: { id: from, username: "fan_" + from }, media: { id: "media1" } } }] }] }); return req("/webhook/instagram", { method: "POST", raw, headers: { "x-hub-signature-256": sign(raw), "content-type": "application/json" } }); };
await changes("c1", "COACH please 🙌"); await wait(1200);
lg = await mocklog();
const pr = lg.filter((x) => x.p === "/v23.0/17840000/messages");
ok(pr.length === sendsC + 1 && pr[pr.length - 1].body.includes('"comment_id":"c1"'), "comment keyword → private DM");
ok(lg.some((x) => x.p === "/v23.0/c1/replies"), "public 'sent you a DM' reply");
await changes("c1", "COACH please 🙌"); await wait(800);
await changes("c2", "nice reel!", "fan2"); await wait(800);
ok((await mocklog()).filter((x) => x.p === "/v23.0/17840000/messages").length === sendsC + 1, "no DM for duplicate or no keyword");
const fl = sql("SELECT source, stage FROM leads WHERE ig_sender_id='fan1'")[0]; ok(fl && fl.source === "comment", "comment lead stored");
// fan replies in DM → Spotter continues the same lead
await hook({ sender: { id: "fan1" }, recipient: { id: "17840000" }, timestamp: Date.now(), message: { mid: "in_fan1", text: "I want to get stronger" } }); await wait(2000);
ok(sql("SELECT COUNT(*) n FROM leads WHERE ig_sender_id='fan1'")[0].n === 1 && sql("SELECT COUNT(*) n FROM messages m JOIN leads l ON l.id=m.lead_id WHERE l.ig_sender_id='fan1' AND m.role='bot'")[0].n === 2, "conversation continues after comment");
// settings + help
r = await req("/settings"); ok(r.s === 200 && r.text.includes("Delete account"), "settings page");
r = await req("/settings", { method: "POST", form: { section: "account", name: "Test Coach", email: "coach@test.nl" } }); ok(r.loc === "/settings?saved=1" && sql("SELECT notify_email FROM coaches WHERE id=" + cid)[0].notify_email === 0, "notifications off");
r = await req("/settings", { method: "POST", form: { section: "password", old: "wrong", new: "anotherpass1" } }); ok(r.text.includes("current password"), "wrong current password refused");
r = await req("/settings", { method: "POST", form: { section: "password", old: "supersecret1", new: "anotherpass1" } }); ok(r.s === 303, "password changed");
r = await req("/settings", { method: "POST", form: { section: "password", old: "anotherpass1", new: "supersecret1" } }); ok(r.s === 303, "password changed back");
r = await req("/help"); ok(r.s === 200 && r.text.includes("Comment-to-DM"), "help page");
r = await req("/dashboard"); ok(r.text.includes("Getting started") || r.text.includes("Latest conversations"), "dashboard renders");
// billing + logout/login
r = await req("/billing"); ok(r.text.includes("7-day start"), "billing shows trial");
r = await req("/billing/portal", { method: "POST" }); ok(r.loc.includes("/portal"), "billing portal");
r = await req("/logout"); r = await req("/dashboard"); ok(r.loc.startsWith("/login"), "logged out");
r = await req("/login", { method: "POST", form: { email: "coach@test.nl", password: "wrongwrong" } }); ok(r.s === 401, "wrong password");
r = await req("/login", { method: "POST", form: { email: "coach@test.nl", password: "supersecret1" } }); ok(r.s === 303, "login");
// owner
jar = {};
r = await req("/start", { method: "POST", form: { name: "Damien", email: "damienhanssens@outlook.com", password: "ownerpass99" } });
r = await req("/dashboard"); ok(r.s === 200, "owner gets in free");
r = await req("/admin"); ok(r.s === 200 && r.text.includes("coach@test.nl") && r.text.includes("Paying coaches"), "owner dashboard");
r = await req("/admin/coach/" + cid, { method: "POST", form: { do: "free" } }); ok(sql("SELECT status FROM coaches WHERE id=" + cid)[0].status === "free", "owner gives free access");
r = await req("/admin/coach/" + cid, { method: "POST", form: { do: "unfree" } }); ok(sql("SELECT status FROM coaches WHERE id=" + cid)[0].status === "active", "owner removes free");
// delete account
jar = {};
r = await req("/start", { method: "POST", form: { name: "Leaver", email: "leaver@test.nl", password: "leaverpass1" } });
r = await req("/settings/delete", { method: "POST", form: { confirm: "nope" } }); ok(r.s === 303 || r.text.includes("Type DELETE"), "delete needs confirm");
// leaver has no access → settings redirects; give access first
sql("UPDATE coaches SET status='trial', stripe_sub='sub_1' WHERE email='leaver@test.nl'");
r = await req("/settings/delete", { method: "POST", form: { confirm: "DELETE" } }); ok(r.s === 303 && sql("SELECT COUNT(*) n FROM coaches WHERE email='leaver@test.nl'")[0].n === 0, "account deleted");
ok((await mocklog()).some((x) => x.m === "DELETE" && x.p === "/v1/subscriptions/sub_1"), "subscription canceled on delete");
// pages
for (const p of ["/privacy", "/terms", "/data-deletion", "/login", "/forgot"]) { jar = {}; r = await req(p); ok(r.s === 200, "page " + p); }
// data deletion callback
const payload = Buffer.from(JSON.stringify({ user_id: "17840000", algorithm: "HMAC-SHA256" })).toString("base64url");
const sig = createHmac("sha256", "appsecret").update(payload).digest("base64url");
r = await req("/data-deletion", { method: "POST", form: { signed_request: `${sig}.${payload}` } }); ok(r.s === 200 && JSON.parse(r.text).confirmation_code, "data deletion callback");
ok(sql("SELECT COUNT(*) n FROM leads")[0].n === 0 && sql("SELECT COUNT(*) n FROM coaches WHERE ig_token IS NOT NULL")[0].n === 0, "data deleted");
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED"); process.exit(fails ? 1 : 0);

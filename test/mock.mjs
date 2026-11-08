// Fake Anthropic, Stripe, Instagram, Resend and ntfy for local end-to-end tests.
import http from "node:http";
const log = [];
let coachRef = "1", n = 0;
const send = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
http.createServer(async (req, res) => {
  let body = ""; for await (const c of req) body += c;
  const u = new URL(req.url, "http://x"); const p = u.pathname;
  log.push({ m: req.method, p, body: body.slice(0, 3000) });
  if (p === "/_log") return send(res, 200, log);
  if (p === "/_ref") { coachRef = u.searchParams.get("id"); return send(res, 200, {}); }
  if (p === "/v1/messages") {
    const b = JSON.parse(body); const last = b.messages[b.messages.length - 1].content;
    const ready = /ready|yes/i.test(last); const medical = /injur|pregnan/i.test(last);
    const follow = /no reply from the lead/.test(last);
    const reply = follow ? "hey, still keen to hit that goal?" : medical ? "Mila will reply to you personally about that." : ready ? "amazing, grab a free call here: calendly.com/coachtest/call" : "love that! what's your main goal?";
    return send(res, 200, { content: [{ type: "tool_use", name: "send_dm", input: { reply, stage: medical ? "needs_you" : ready ? "link_sent" : "qualifying", brief: "Wants to lose 8 kg before summer." } }] });
  }
  if (p === "/v1/checkout/sessions" && req.method === "POST") return send(res, 200, { id: "cs_test_1", url: "http://localhost:9999/pay" });
  if (p.startsWith("/v1/checkout/sessions/")) return send(res, 200, { id: "cs_test_1", client_reference_id: coachRef, customer: "cus_1", status: "complete", subscription: { id: "sub_1", status: "trialing", trial_end: Math.floor(Date.now() / 1000) + 7 * 86400 } });
  if (p === "/v1/subscriptions/sub_1") return send(res, 200, { id: "sub_1", status: "active" });
  if (p === "/v1/billing_portal/sessions") return send(res, 200, { url: "http://localhost:9999/portal" });
  if (p === "/oauth/access_token") return send(res, 200, { access_token: "short_tok", user_id: 1 });
  if (p === "/access_token") return send(res, 200, { access_token: "long_tok", expires_in: 5184000 });
  if (p === "/refresh_access_token") return send(res, 200, { access_token: "long_tok2", expires_in: 5184000 });
  if (p === "/v23.0/me") return send(res, 200, { user_id: "17840000", username: "coachtest" });
  if (p === "/v23.0/me/subscribed_apps") return send(res, 200, { success: true });
  if (p === "/v23.0/17840000/messages") return send(res, 200, { recipient_id: "lead1", message_id: "m_out_" + (++n) });
  if (p.startsWith("/v23.0/")) return send(res, 200, { name: "Sanne de Vries", username: "sanne.moves" });
  if (p === "/emails") return send(res, 200, { id: "mail_" + (++n) });
  if (p === "/") return send(res, 200, {});
  send(res, 404, { error: "mock 404 " + p });
}).listen(9999, () => console.log("mock on 9999"));

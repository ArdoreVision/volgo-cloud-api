// Instagram, Stripe, e-mail and push notifications.

/* ---------------- Instagram (Instagram API with Instagram Login) ---------------- */

const GRAPH = (env) => env.IG_GRAPH_URL || "https://graph.instagram.com";
const IGAPI = (env) => env.IG_API_URL || "https://api.instagram.com";
const IGWEB = (env) => env.IG_WEB_URL || "https://www.instagram.com";
const V = "v23.0";

export const igConfigured = (env) => !!(env.META_APP_ID && env.META_APP_SECRET);

export function igAuthorizeUrl(env, redirectUri, state) {
  const u = new URL(IGWEB(env) + "/oauth/authorize");
  u.searchParams.set("client_id", env.META_APP_ID);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "instagram_business_basic,instagram_business_manage_messages");
  u.searchParams.set("state", state);
  return u.toString();
}

export async function igExchangeCode(env, code, redirectUri) {
  const body = new URLSearchParams({
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const r = await fetch(IGAPI(env) + "/oauth/access_token", { method: "POST", body });
  const short = await r.json();
  if (!r.ok || !short.access_token) throw new Error("ig_code: " + JSON.stringify(short).slice(0, 300));
  const l = await fetch(`${GRAPH(env)}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(env.META_APP_SECRET)}&access_token=${encodeURIComponent(short.access_token)}`);
  const long = await l.json();
  if (!l.ok || !long.access_token) throw new Error("ig_long: " + JSON.stringify(long).slice(0, 300));
  const me = await (await fetch(`${GRAPH(env)}/${V}/me?fields=user_id,username&access_token=${encodeURIComponent(long.access_token)}`)).json();
  if (!me.user_id && !me.id) throw new Error("ig_me: " + JSON.stringify(me).slice(0, 300));
  // Receive DMs for this account.
  await fetch(`${GRAPH(env)}/${V}/me/subscribed_apps?subscribed_fields=messages&access_token=${encodeURIComponent(long.access_token)}`, { method: "POST" });
  const exp = new Date(Date.now() + (long.expires_in || 5184000) * 1000).toISOString().replace("T", " ").slice(0, 19);
  return { token: long.access_token, userId: String(me.user_id || me.id), username: me.username || "", exp };
}

export async function igRefresh(env, token) {
  const r = await fetch(`${GRAPH(env)}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error("ig_refresh: " + JSON.stringify(d).slice(0, 200));
  return { token: d.access_token, exp: new Date(Date.now() + (d.expires_in || 5184000) * 1000).toISOString().replace("T", " ").slice(0, 19) };
}

export async function igSend(env, coach, recipientId, text) {
  const r = await fetch(`${GRAPH(env)}/${V}/${coach.ig_user_id}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${coach.ig_token}`, "content-type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("ig_send: " + JSON.stringify(d).slice(0, 300));
  return d.message_id || null;
}

export async function igProfile(env, coach, igsid) {
  try {
    const r = await fetch(`${GRAPH(env)}/${V}/${igsid}?fields=name,username&access_token=${encodeURIComponent(coach.ig_token)}`);
    if (!r.ok) return {};
    return await r.json();
  } catch { return {}; }
}

/* ---------------- Stripe ---------------- */

const STRIPE = (env) => env.STRIPE_URL || "https://api.stripe.com";
export const stripeConfigured = (env) => !!env.STRIPE_SECRET_KEY;

async function stripe(env, path, params, method = "POST") {
  const r = await fetch(STRIPE(env) + path, {
    method,
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
    body: method === "GET" ? undefined : new URLSearchParams(params || {}),
  });
  const d = await r.json();
  if (!r.ok) throw new Error("stripe: " + (d.error?.message || r.status));
  return d;
}

export async function stripeCheckout(env, coach, base) {
  const p = {
    mode: "subscription",
    client_reference_id: String(coach.id),
    "metadata[coach_id]": String(coach.id),
    "subscription_data[metadata][coach_id]": String(coach.id),
    "subscription_data[trial_period_days]": env.TRIAL_DAYS || "7",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": env.PRICE_EUR_CENTS || "29700",
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": "Spotter, AI DM setter",
    "line_items[1][quantity]": "1",
    "line_items[1][price_data][currency]": "eur",
    "line_items[1][price_data][unit_amount]": env.TRIAL_EUR_CENTS || "100",
    "line_items[1][price_data][product_data][name]": "Spotter, first 7 days",
    allow_promotion_codes: "true",
    success_url: `${base}/billing/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/billing?canceled=1`,
  };
  if (coach.stripe_customer) p.customer = coach.stripe_customer;
  else p.customer_email = coach.email;
  return await stripe(env, "/v1/checkout/sessions", p);
}

export const stripeSession = (env, id) => stripe(env, `/v1/checkout/sessions/${encodeURIComponent(id)}?expand[]=subscription`, null, "GET");
export const stripeSubscription = (env, id) => stripe(env, `/v1/subscriptions/${encodeURIComponent(id)}`, null, "GET");
export const stripePortal = (env, customer, returnUrl) => stripe(env, "/v1/billing_portal/sessions", { customer, return_url: returnUrl });

export function statusFromSub(sub) {
  if (!sub) return null;
  if (sub.status === "trialing") return "trial";
  if (sub.status === "active") return "active";
  if (sub.status === "past_due" || sub.status === "unpaid") return "past_due";
  if (sub.status === "canceled" || sub.status === "incomplete_expired") return "canceled";
  return null;
}

/* ---------------- Mail + push ---------------- */

export async function sendMail(env, { to, subject, text }) {
  if (!env.RESEND_API_KEY || !to) return false;
  try {
    const r = await fetch((env.RESEND_URL || "https://api.resend.com") + "/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [to], reply_to: env.MAIL_REPLY_TO, subject, text }),
    });
    return r.ok;
  } catch { return false; }
}

export async function pushOwner(env, title, message) {
  if (!env.PUSH_TOPIC) return;
  try {
    await fetch(env.NTFY_URL || "https://ntfy.sh/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic: env.PUSH_TOPIC, title, message, tags: ["muscle"] }),
    });
  } catch {}
}

export async function notifyOwner(env, subject, text) {
  const first = (env.ADMIN_EMAILS || "").split(",")[0]?.trim();
  await Promise.all([sendMail(env, { to: first, subject: `[Spotter] ${subject}`, text }), pushOwner(env, `Spotter: ${subject}`, text.slice(0, 300))]);
}

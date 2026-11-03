/* Ads attribution: visitors from two Meta ads (one with chat + lead, one that only scrolls) show up per ad in Website traffic,
   and the lead shows which ad it came from. Runs against a local wrangler dev. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const BASE = process.env.BASE || "http://localhost:8787";
const api = async (body) => (await fetch(`${BASE}/api/ava`, { method: "POST", headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1" }, body: JSON.stringify(body) })).json();

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, storageState: process.env.STATE || "/tmp/e2e/state2.json" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/dashboard?tab=installeren`, { waitUntil: "networkidle" });
  const sleutel = /data-key="([^"]+)"/.exec(await p.locator('input[aria-label="Install code"]').inputValue())[1];

  // Ad 1 (Quiz test): a visitor who chats and becomes a lead. Ad 2 (Video): a visitor who only reads.
  const ad1 = { bron: "fb", medium: "paid", campagne: "Global | Quiz test", adset: "Global - Quiz - Adset 1", advertentie: "Quiz - Ad 1", plaatsing: "Facebook_Mobile_Feed", klik: "IwAR123" };
  const ad2 = { bron: "fb", medium: "paid", campagne: "Global | Quiz test", adset: "Global - Quiz - Adset 1", advertentie: "Video - Ad 2", plaatsing: "Instagram_Reels" };
  const s1 = "sessie-ad1-" + Date.now();
  const s2 = "sessie-ad2-" + Date.now();
  const v1 = await api({ actie: "view", sleutel, sessie: s1, pad: "/", titel: "Volgo", utm: "fb", ad: ad1, host: "localhost", breedte: 390, toestemming: true, vast: "v1" });
  assert.ok(v1.ok && v1.id, JSON.stringify(v1));
  await api({ actie: "ping", sleutel, sessie: s1, id: v1.id, duur: 45, scroll: 80 });
  await api({ actie: "event", sleutel, sessie: s1, soort: "chat_open" });
  const r1 = await api({ actie: "bericht", sleutel, tekst: "Wat kost Volgo voor een tandartspraktijk?", sessie: s1, toestemming: true });
  await api({ actie: "bericht", sleutel, token: r1.token, tekst: "Anna Tandarts", sessie: s1 });
  await api({ actie: "bericht", sleutel, token: r1.token, tekst: "anna@praktijk.nl", sessie: s1 });
  const r4 = await api({ actie: "bericht", sleutel, token: r1.token, tekst: "ja", sessie: s1 });
  assert.equal(r4.lead, true, "the reply says a lead was created (pixel Lead event)");
  const v2 = await api({ actie: "view", sleutel, sessie: s2, pad: "/", titel: "Volgo", utm: "fb", ad: ad2, host: "localhost", breedte: 1280, toestemming: false, vast: "v2" });
  await api({ actie: "ping", sleutel, sessie: s2, id: v2.id, duur: 12, scroll: 30 });
  console.log("✓ two ad visitors simulated (one chatted and became a lead)");

  await p.goto(`${BASE}/dashboard?tab=verkeer`, { waitUntil: "networkidle" });
  await p.waitForSelector(".v-vk__adtabel");
  const rijen = await p.locator(".v-vk__adrij:not(.v-vk__adrij--kop)").allTextContents();
  const r_ad1 = rijen.find((r) => r.includes("Quiz - Ad 1"));
  const r_ad2 = rijen.find((r) => r.includes("Video - Ad 2"));
  assert.ok(r_ad1 && r_ad2, "both ads listed: " + rijen.join(" | "));
  assert.match(r_ad1, /Global - Quiz - Adset 1/);
  assert.ok(rijen.indexOf(r_ad1) < rijen.indexOf(r_ad2), "ad with the lead is sorted first");
  const cellen1 = await p.locator(".v-vk__adrij", { hasText: "Quiz - Ad 1" }).locator('span[role="cell"]').allTextContents();
  // Ad · Visits · Time · Scroll · Mobile · Chat · Leads · Booked
  assert.equal(cellen1[1], "1"); assert.equal(cellen1[2], "45s"); assert.equal(cellen1[3], "80%"); assert.equal(cellen1[4], "100%");
  assert.match(cellen1[5], /^1/); assert.match(cellen1[6], /^1/); assert.equal(cellen1[7], "0");
  const plaatsingen = await p.locator(".v-vk__raster--ads .v-vk__lijst").first().textContent();
  assert.match(plaatsingen, /Facebook Mobile Feed/); assert.match(plaatsingen, /Instagram Reels/);
  assert.match(await p.locator(".v-vk__vragen").textContent(), /tandartspraktijk/);
  console.log("✓ Website traffic → Ads: per-ad visits, time, scroll, mobile share, chat, lead; placements; questions asked");

  await p.goto(`${BASE}/dashboard?tab=aanvragen`, { waitUntil: "networkidle" });
  const rij = p.locator(".v-table__row--klik", { hasText: "Anna Tandarts" });
  assert.match(await rij.textContent(), /Global \| Quiz test · Global - Quiz - Adset 1 · Quiz - Ad 1 · Facebook Mobile Feed/);
  console.log("✓ lead shows the ad it came from");
  await b.close();
  console.log("\nADS CHECKS PASSED");
})().catch((e) => { console.error("ADS FAILED:", e.message); process.exit(1); });

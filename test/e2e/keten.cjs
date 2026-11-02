/* End-to-end against a local `wrangler dev` (see test/e2e/README): real HTTP, real local D1, real UI.
   Runs the chain visitor → AVA chat → lead → appointment → dashboard, plus the guards around it.
   No emails are sent (no Resend key locally) and no payments are made (test checkout). */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const BASE = process.env.BASE || "http://localhost:8787";
const api = async (body) => (await fetch(`${BASE}/api/ava`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const stap = (t) => console.log("✓", t);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const p = await ctx.newPage();
  const fouten = [];
  p.on("pageerror", (e) => fouten.push(e.message));

  // 1. Signup through the real flow (test checkout, no Stripe key locally).
  const email = `e2e-${Date.now()}@example.com`;
  await p.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
  await p.click("button.v-plan__cta--start");
  await p.waitForURL(/checkout/);
  await p.click("button.v-auth__btn");
  await p.waitForURL(/signup/);
  await p.fill("#naam", "Eva Test");
  await p.fill("#bedrijf", "Dakdekkers Zeeland");
  await p.fill("#email", email);
  await p.fill("#wachtwoord", "Zeeuwse-Zon-2026!");
  await p.click("button.v-auth__btn");
  await p.waitForURL(/welcome/, { timeout: 30000 });
  stap("signup: plan → test payment → account → welcome");

  // 2. First login: the five questions, then Home.
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  for (let i = 0; i < 5; i++) {
    await p.locator(".v-vragen__optie").first().click();
    await p.waitForTimeout(500);
  }
  await p.waitForSelector(".v-vandaag", { timeout: 15000 });
  assert.match(await p.locator(".v-vandaag h1").textContent(), /Eva/);
  assert.ok((await p.locator(".v-voorbeeld-tag").count()) > 0, "sample data is labelled");
  assert.equal(await p.locator(".v-dash__badge").count(), 0, "sample leads do not count as new leads");
  stap("home: greeting, sample data labelled, no fake 'new leads' badge");

  // 3. Install tab gives the key; the tab lives in the URL.
  await p.locator(".v-dash__nav button", { hasText: "Install" }).click();
  await p.waitForURL(/tab=installeren/);
  const code = await p.locator('input[aria-label="Install code"]').inputValue();
  const sleutel = /data-key="([^"]+)"/.exec(code)[1];
  await p.reload({ waitUntil: "networkidle" });
  assert.equal(await p.locator("h1").first().textContent(), "Install", "refresh keeps the tab");
  stap("install: key found, tab survives a refresh");

  // 4. A visitor chats with AVA (basic mode) and becomes a lead.
  const cfg = await api({ actie: "config", sleutel });
  assert.equal(cfg.bedrijf, "Dakdekkers Zeeland");
  const r1 = await api({ actie: "bericht", sleutel, tekst: "Ik wil een offerte voor een nieuw dak, wat kost dat?" });
  assert.ok(r1.token);
  await api({ actie: "bericht", sleutel, token: r1.token, tekst: "Jan de Vries" });
  await api({ actie: "bericht", sleutel, token: r1.token, tekst: "06 12 34 56 78" });
  const r4 = await api({ actie: "bericht", sleutel, token: r1.token, tekst: "ja" });
  assert.match(r4.antwoord, /passed on/);
  stap("widget API: conversation in basic mode, permission given");

  await p.goto(`${BASE}/dashboard?tab=aanvragen`, { waitUntil: "networkidle" });
  await p.waitForSelector(".v-table__row--klik");
  assert.equal(await p.locator(".v-voorbeeld-tag").count(), 0, "sample data gone after the first real conversation");
  assert.equal(await p.locator(".v-table__row--klik").count(), 1);
  assert.match(await p.locator(".v-table__row--klik strong").first().textContent(), /Jan de Vries/);
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  assert.match(await p.locator(".v-bel li").first().textContent(), /Jan de Vries/);
  assert.equal(await p.locator(".v-bel a.v-bel__actie").first().getAttribute("href"), "tel:0612345678");
  assert.equal(await p.locator(".v-dash__badge").textContent(), "1");
  stap("dashboard: real lead on Leads and on Home with a call link; badge counts 1");

  // 5. Booking via the chat: first free slot, then the same slot again → refused.
  const ag = await api({ actie: "agenda", sleutel, token: r1.token });
  const dag = ag.dagen.find((d) => d.status === "open");
  const vrij = dag.tijden.find((t) => t.vrij);
  const start = `${dag.datum}T${vrij.t}`;
  const boek = await api({ actie: "boek", sleutel, token: r1.token, start, soort: "bellen", naam: "Jan de Vries", contact: "0612345678" });
  assert.equal(boek.ok, true, JSON.stringify(boek));
  const nogmaals = await api({ actie: "boek", sleutel, start, soort: "bellen", naam: "Piet", contact: "0687654321" });
  assert.equal(nogmaals.ok, false);
  assert.match(nogmaals.reden, /no longer available/);
  const ag2 = await api({ actie: "agenda", sleutel });
  assert.equal(ag2.dagen.find((d) => d.datum === dag.datum).tijden.find((t) => t.t === vrij.t).vrij, false);
  stap(`booking: ${start} booked once, second attempt refused, slot shown as taken`);

  await p.goto(`${BASE}/dashboard?tab=agenda`, { waitUntil: "networkidle" });
  assert.ok((await p.locator(".v-ev", { hasText: "Jan de Vries" }).count()) >= 1, "appointment in the calendar");
  await p.goto(`${BASE}/dashboard?tab=aanvragen`, { waitUntil: "networkidle" });
  assert.equal(await p.locator(".v-table__row--klik select").first().inputValue(), "afspraak");
  assert.equal(await p.locator(".v-table__row--klik").count(), 1, "booking did not create a second lead");
  stap("dashboard: appointment visible, lead status 'Appointment', still one lead");

  // 6. Manual appointment on the same time: conflict warning, then save anyway.
  await p.goto(`${BASE}/dashboard?tab=agenda`, { waitUntil: "networkidle" });
  await p.click("button.v-addbtn");
  await p.fill("#a-titel", "Site visit · Piet");
  await p.fill("#a-datum", dag.datum);
  await p.fill("#a-start", vrij.t);
  const [h, m] = vrij.t.split(":").map(Number);
  await p.fill("#a-eind", `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  await p.click('form[aria-label="New appointment"] button[type=submit]');
  await p.waitForSelector(".v-waarschuw");
  assert.match(await p.locator(".v-waarschuw").textContent(), /Overlaps with another appointment/);
  await p.click(".v-waarschuw button.v-btn-dark");
  await p.waitForSelector(".v-ok-balk");
  await p.waitForFunction(() => document.querySelectorAll(".v-ev").length === 2, null, { timeout: 5000 }).catch(async () => {
    await p.screenshot({ path: "/tmp/shots/e2e-fail-agenda.png" });
    console.log("agenda html:", (await p.locator(".v-cal-list").innerHTML()).slice(0, 800));
  });
  assert.equal(await p.locator(".v-ev").count(), 2);
  stap("manual appointment: overlap warned, saved on purpose");

  // 7. Deleting asks first.
  await p.locator(".v-ev__del").first().click({ force: true });
  await p.waitForSelector(".v-ev__bevestig");
  await p.click(".v-ev__bevestig button.v-btn-ghost");
  assert.equal(await p.locator(".v-ev").count(), 2, "'Keep' keeps the appointment");
  stap("calendar: delete needs confirmation");

  // 8. Unsaved changes warn before leaving the page.
  await p.goto(`${BASE}/dashboard?tab=ava`, { waitUntil: "networkidle" });
  await p.waitForSelector("#ava-info");
  await p.fill("#ava-info", "Wij leggen daken in heel Zeeland, binnen een week een offerte.");
  let dialoog = "";
  p.once("dialog", (d) => {
    dialoog = d.message();
    void d.dismiss();
  });
  await p.locator(".v-dash__nav button", { hasText: "Leads" }).click();
  await p.waitForTimeout(500);
  assert.match(dialoog, /unsaved changes/i);
  assert.equal(await p.locator("h1").first().textContent(), "Train AVA", "stayed after dismissing");
  await p.click('form.v-ava-form button[type=submit]');
  await p.waitForSelector(".v-auth__ok");
  stap("forms: unsaved-changes warning, then saved with confirmation");

  // 9. Language choice is a cookie and the server renders it.
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.locator(".v-nav .v-taal select").selectOption("nl");
  const cookie = (await ctx.cookies()).find((c) => c.name === "volgo_taal");
  assert.equal(cookie?.value, "nl");
  const html = await (await fetch(`${BASE}/`, { headers: { cookie: "volgo_taal=nl" } })).text();
  assert.match(html, /<html lang="nl"/);
  stap("language: cookie set, server renders <html lang=\"nl\">");

  // 10. Stripe webhook refuses unsigned requests (not configured locally → 503, never 200).
  const wh = await fetch(`${BASE}/api/stripe`, { method: "POST", body: "{}" });
  assert.ok([400, 503].includes(wh.status), `webhook status ${wh.status}`);
  stap(`stripe webhook: unsigned request refused (${wh.status})`);

  assert.deepEqual(fouten, [], "no page errors");
  await b.close();
  console.log("\nALL E2E CHECKS PASSED");
})().catch((e) => {
  console.error("E2E FAILED:", e.message);
  process.exit(1);
});

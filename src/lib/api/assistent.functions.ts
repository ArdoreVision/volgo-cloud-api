import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { huidigeGebruiker } from "../auth.server";
import { bindings } from "../bindings.server";
import { amsDatum } from "../team.server";
import { actieveGebruiker } from "../toegang.server";

/** Is er iemand ingelogd? Gebruikt om ingelogde gebruikers van de landingspagina naar hun home te sturen. */
export const isIngelogd = createServerFn({ method: "GET" }).handler(async () => {
  const g = await huidigeGebruiker().catch(() => null);
  return Boolean(g);
});

const invoer = z.object({
  vraag: z.string().trim().min(1).max(1500),
  historie: z
    .array(z.object({ rol: z.enum(["ik", "ava"]), tekst: z.string().max(4000) }))
    .max(20)
    .default([]),
});

const STATUS_EN: Record<string, string> = {
  nieuw: "new",
  opvolging: "Volgo following up",
  offerte: "quote sent",
  afspraak: "appointment",
  klant: "customer",
  verloren: "lost",
};

/** Appointments are stored as Amsterdam local time ("YYYY-MM-DDTHH:MM"): format without converting. */
const lokaal = (s: string) =>
  new Date(`${s.slice(0, 16)}:00Z`).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

const ams = (iso: string) =>
  new Date(iso.replace(" ", "T") + (iso.includes("Z") || iso.includes("+") ? "" : "Z")).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });

/** Words worth searching for in a question: names, places, subjects. Short and common words are skipped. */
const STOP = new Set("the and for with that this what when where who how many much have has did does from about into your you are was were show find give tell list all any some last next week month today yesterday days day volgo please could would can will just also there their them they his her its our out not but get got set up ask".split(" "));
function zoekwoorden(vraag: string) {
  return [...new Set(vraag.toLowerCase().match(/[\p{L}\p{N}@.+-]{3,}/gu) ?? [])].filter((w) => !STOP.has(w)).slice(0, 6);
}

/** Where things are in the dashboard. Ask Volgo uses these ids in [[open:…]] to show a button that goes there. */
const PAGINAS = `DASHBOARD PAGES (use exactly these ids in [[open:id]]):
- gesprekken = Inbox: every website chat, contact form and connected channel; read along or take over.
- agenda = Calendar: appointments. At the bottom: opening hours, appointment length and kinds, and "Your own calendar" (link Google/Outlook/Apple so busy times are never offered, and add Volgo's appointments to your own calendar).
- aanvragen = Requests: everyone who left details, warmest first, with status.
- home = Today: what Volgo did this week and today's tasks.
- automatisch = Follow-up: switch confirmation, reminder, follow-up after 1 and 3 days, review request and seasonal message on or off, read the messages, and choose their language.
- reviews = Reviews: automatic review requests and replies to Google reviews.
- betalingen = Payments: payment requests to customers.
- installeren = Install: put Volgo on the website step by step, and the setup checklist.
- website = Website (Complete only): tell us what you want on the website we build.
- mijnsite = My website: your website with Volgo on it, and whether it is live.
- kanalen = Connections: business number, WhatsApp and call buttons in the chat, contact form, email forwarding, WhatsApp and missed-call connections (arranged with the Volgo team), Google review link.
- ava = Your chat: name, photo, colour, first message and the questions Volgo asks.
- verkeer = Visitors: analytics of the website.
- meldingen = Settings → Notifications: push notifications on this device and emails (every new conversation, hot leads, every lead, morning summary).
- account = Settings → Account: profile, password, team members.
- abonnement = Settings → Subscription: plan, usage, invoices, cancel.`;

/** Volgo for the business owner: knows everything in the account, searches it, reads the analytics and helps with the setup. */
export const vraagAssistent = createServerFn({ method: "POST" })
  .validator((d: unknown) => invoer.parse(d))
  .handler(async ({ data }) => {
    const g = await actieveGebruiker().catch(() => null);
    if (!g) return { ok: false as const, antwoord: "You are logged out. Log in again to continue." };
    const { DB, ANTHROPIC_API_KEY, CLAUDE_MODEL } = bindings();
    if (!DB) return { ok: false as const, antwoord: "The database is temporarily unavailable." };
    const team = g.team_id;
    const leeg = { results: [] as never[] };
    // A query that fails (for example on an older database) never breaks the answer: it just counts as empty.
    const veilig = <T,>(p: Promise<{ results: T[] }> , terug: { results: T[] }) => p.then((r) => ({ results: r.results })).catch(() => terug);
    const veilig1 = <T,>(p: Promise<T>, terug: T) => p.catch(() => terug);

    const woorden = zoekwoorden(data.vraag + " " + data.historie.filter((h) => h.rol === "ik").slice(-2).map((h) => h.tekst).join(" "));
    const like = (kolommen: string[]) => (woorden.length ? `(${woorden.map(() => `(${kolommen.map((k) => `LOWER(${k}) LIKE ?`).join(" OR ")})`).join(" OR ")})` : "0");
    const binds = (n: number) => woorden.flatMap((w) => Array(n).fill(`%${w}%`));

    const [leads, afspraken, gesprekken, inst, gebruiker, zoekLeads, zoekBerichten, zoekAfspraken, views, bronnen, paginas, landen, gebeurt, auto, ob] = await Promise.all([
      DB.prepare(
        `SELECT l.naam, l.onderwerp, l.kanaal, l.status, l.created_at, COALESCE(s.warmte, 50) AS warmte, s.reden,
                (SELECT m.contact FROM ava_gesprek_meta m WHERE m.lead_id = l.id AND m.contact IS NOT NULL LIMIT 1) AS contact
         FROM klant_leads l LEFT JOIN lead_scores s ON s.lead_id = l.id
         WHERE l.gebruiker_id = ? AND l.created_at > datetime('now', '-90 days') AND COALESCE(l.gearchiveerd, 0) = 0
         ORDER BY CASE WHEN l.status IN ('klant','verloren') THEN 1 ELSE 0 END, warmte DESC LIMIT 40`,
      )
        .bind(team)
        .all<{ naam: string; onderwerp: string; kanaal: string; status: string; created_at: string; warmte: number; reden: string | null; contact: string | null }>(),
      DB.prepare("SELECT titel, start, locatie FROM afspraken WHERE team_id = ? AND voorbeeld = 0 AND substr(start, 1, 10) >= ? ORDER BY start LIMIT 30")
        .bind(team, amsDatum(new Date(Date.now() - 7 * 86400000)))
        .all<{ titel: string; start: string; locatie: string | null }>(),
      DB.prepare("SELECT bezoeker, kanaal, onderwerp, status, laatste, warmte FROM ava_gesprekken WHERE team_id = ? AND voorbeeld = 0 ORDER BY laatste DESC LIMIT 20")
        .bind(team)
        .all<{ bezoeker: string; kanaal: string; onderwerp: string; status: string; laatste: string; warmte: number }>(),
      DB.prepare(
        `SELECT a.naam, a.boeken, a.open_dagen, a.open_van, a.open_tot, a.afspraak_duur, a.afspraak_soorten, a.tijdzone, a.site_url, a.review_url, a.zakelijk_nummer,
                a.knop_whatsapp, a.knop_bellen, a.agenda_ics, a.taal, a.auto_herinnering, a.auto_review, a.auto_opvolging, a.auto_seizoen, a.vragen, a.toestemming
         FROM ava_instellingen a WHERE a.team_id = ?`,
      )
        .bind(team)
        .first<Record<string, string | number>>(),
      DB.prepare("SELECT bedrijf, plan, status FROM gebruikers WHERE id = ?").bind(team).first<{ bedrijf: string; plan: string; status: string }>(),
      woorden.length
        ? veilig(
            DB.prepare(
              `SELECT l.naam, l.onderwerp, l.status, l.created_at, l.laatste_actie FROM klant_leads l WHERE l.gebruiker_id = ? AND ${like(["l.naam", "l.onderwerp", "COALESCE(l.laatste_actie,'')"])} ORDER BY l.created_at DESC LIMIT 15`,
            )
              .bind(team, ...binds(3))
              .all<{ naam: string; onderwerp: string; status: string; created_at: string; laatste_actie: string | null }>(),
            leeg,
          )
        : leeg,
      woorden.length
        ? veilig(
            DB.prepare(
              `SELECT g.bezoeker, b.rol, b.tekst, b.created_at FROM ava_berichten b JOIN ava_gesprekken g ON g.id = b.gesprek_id
               WHERE g.team_id = ? AND g.voorbeeld = 0 AND b.rol IN ('bezoeker','ava','mens') AND ${like(["b.tekst", "g.bezoeker"])} ORDER BY b.id DESC LIMIT 20`,
            )
              .bind(team, ...binds(2))
              .all<{ bezoeker: string; rol: string; tekst: string; created_at: string }>(),
            leeg,
          )
        : leeg,
      woorden.length
        ? veilig(
            DB.prepare(`SELECT titel, start, locatie, notitie FROM afspraken WHERE team_id = ? AND voorbeeld = 0 AND ${like(["titel", "COALESCE(notitie,'')", "COALESCE(locatie,'')"])} ORDER BY start DESC LIMIT 15`)
              .bind(team, ...binds(3))
              .all<{ titel: string; start: string; locatie: string | null; notitie: string | null }>(),
            leeg,
          )
        : leeg,
      veilig1(
        DB.prepare(
          `SELECT SUM(CASE WHEN dag >= date('now','-6 days') THEN 1 ELSE 0 END) AS v7, COUNT(DISTINCT CASE WHEN dag >= date('now','-6 days') THEN sessie END) AS s7,
                  SUM(CASE WHEN dag >= date('now','-29 days') THEN 1 ELSE 0 END) AS v30, COUNT(DISTINCT CASE WHEN dag >= date('now','-29 days') THEN sessie END) AS s30,
                  SUM(CASE WHEN dag = date('now') THEN 1 ELSE 0 END) AS vandaag
           FROM site_views WHERE team_id = ? AND dag >= date('now','-29 days')`,
        )
          .bind(team)
          .first<{ v7: number; s7: number; v30: number; s30: number; vandaag: number }>(),
        null,
      ),
      veilig(DB.prepare("SELECT COALESCE(NULLIF(bron,''),'direct') AS k, COUNT(DISTINCT sessie) AS n FROM site_views WHERE team_id = ? AND dag >= date('now','-29 days') GROUP BY k ORDER BY n DESC LIMIT 6").bind(team).all<{ k: string; n: number }>(), leeg),
      veilig(DB.prepare("SELECT pad AS k, COUNT(*) AS n FROM site_views WHERE team_id = ? AND dag >= date('now','-29 days') GROUP BY pad ORDER BY n DESC LIMIT 6").bind(team).all<{ k: string; n: number }>(), leeg),
      veilig(DB.prepare("SELECT COALESCE(stad, land) AS k, COUNT(DISTINCT sessie) AS n FROM site_views WHERE team_id = ? AND dag >= date('now','-29 days') AND COALESCE(stad, land) IS NOT NULL GROUP BY k ORDER BY n DESC LIMIT 6").bind(team).all<{ k: string; n: number }>(), leeg),
      veilig(DB.prepare("SELECT soort AS k, COUNT(DISTINCT sessie) AS n FROM site_events WHERE team_id = ? AND dag >= date('now','-29 days') GROUP BY soort ORDER BY n DESC").bind(team).all<{ k: string; n: number }>(), leeg),
      veilig(DB.prepare("SELECT soort AS k, COUNT(*) AS n FROM auto_berichten WHERE team_id = ? AND status = 'verstuurd' AND gemaakt > datetime('now','-30 days') GROUP BY soort").bind(team).all<{ k: string; n: number }>(), leeg),
      veilig1(DB.prepare("SELECT geinstalleerd FROM onboarding WHERE team_id = ?").bind(team).first<{ geinstalleerd: number }>(), null),
    ]);

    const naamBedrijf = gebruiker?.bedrijf ?? g.bedrijf;
    const voornaam = g.naam.split(/\s+/)[0];
    const lijst = <T,>(r: { results: T[] }, f: (x: T) => string) => (r.results.length ? r.results.map((x) => `- ${f(x)}`) : ["(none)"]);
    const DAG = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const i = inst ?? {};

    if (!ANTHROPIC_API_KEY) {
      const open = leads.results.filter((l) => l.status !== "klant" && l.status !== "verloren");
      const top = open.slice(0, 3).map((l) => `${l.naam} (warmth ${l.warmte}): ${l.onderwerp}`);
      return {
        ok: true as const,
        antwoord: top.length
          ? `You have ${open.length} open ${open.length === 1 ? "request" : "requests"}. Call these first:\n${top.map((t) => `- ${t}`).join("\n")}`
          : "You have no open requests right now. As soon as Volgo talks to someone on your website, you will see them here.",
      };
    }

    const context = [
      `Today: ${ams(new Date().toISOString())}`,
      `Plan: ${gebruiker?.plan ?? ""} (${gebruiker?.status ?? ""}).`,
      "",
      "SETTINGS:",
      `- Volgo on the website: ${ob?.geinstalleerd ? "yes, checked" : "not confirmed yet"}; website address: ${i.site_url || "not filled in"}.`,
      `- Booking in the chat: ${i.boeken ? "on" : "off"}; days: ${String(i.open_dagen ?? "").split(",").filter(Boolean).map((d) => DAG[Number(d)]).join(", ")}; hours ${i.open_van}–${i.open_tot}; ${i.afspraak_duur} min; kinds: ${i.afspraak_soorten}; time zone ${i.tijdzone}.`,
      `- Own calendar (Google/Outlook/Apple) linked: ${i.agenda_ics ? "yes" : "no"}.`,
      `- Business number: ${i.zakelijk_nummer ? "set" : "not set"}; WhatsApp button in chat: ${i.knop_whatsapp ? "on" : "off"}; call button: ${i.knop_bellen ? "on" : "off"}.`,
      `- Google review link: ${i.review_url ? "set" : "not set"}.`,
      `- Automatic messages: reminder ${i.auto_herinnering ? "on" : "off"}, follow-up ${i.auto_opvolging ? "on" : "off"}, review request ${i.auto_review ? "on" : "off"}, seasonal ${i.auto_seizoen ? "on" : "off"}; language ${i.taal === "nl" ? "Dutch" : "English"}.`,
      `- Questions the chat asks: ${String(i.vragen ?? "").split("\n").filter(Boolean).join(" / ") || "(none set)"}.`,
      `- Sent automatically in the last 30 days: ${auto.results.map((x) => `${x.k} ${x.n}`).join(", ") || "nothing yet"}.`,
      "",
      "WEBSITE ANALYTICS (measured by Volgo on the website):",
      views ? `- Today ${views.vandaag ?? 0} page views. Last 7 days: ${views.v7 ?? 0} page views, ${views.s7 ?? 0} visits. Last 30 days: ${views.v30 ?? 0} page views, ${views.s30 ?? 0} visits.` : "- (no data)",
      `- Sources (30 days, visits): ${bronnen.results.map((x) => `${x.k} ${x.n}`).join(", ") || "(none)"}.`,
      `- Most viewed pages (30 days): ${paginas.results.map((x) => `${x.k} ${x.n}`).join(", ") || "(none)"}.`,
      `- Where visitors are (30 days, only those who allowed it): ${landen.results.map((x) => `${x.k} ${x.n}`).join(", ") || "(none)"}.`,
      `- Actions (30 days, visits): ${gebeurt.results.map((x) => `${x.k} ${x.n}`).join(", ") || "(none)"}.`,
      "",
      "REQUESTS (open first, then hottest; warmth 0-100):",
      ...lijst(leads, (l) => `${l.naam} | warmth ${l.warmte} | ${STATUS_EN[l.status] ?? l.status} | via ${l.kanaal} | received ${ams(l.created_at)} | ${l.onderwerp}${l.contact ? ` | contact ${l.contact}` : ""}${l.reden ? ` | ${l.reden}` : ""}`),
      "",
      "CALENDAR (from a week ago onwards):",
      ...lijst(afspraken, (a) => `${lokaal(a.start)} | ${a.titel}${a.locatie ? ` | ${a.locatie}` : ""}`),
      "",
      "RECENT CONVERSATIONS:",
      ...lijst(gesprekken, (c) => `${c.bezoeker} | ${c.kanaal} | ${c.status === "live" ? "live" : "finished"} | last message ${ams(c.laatste)} | warmth ${c.warmte} | ${c.onderwerp}`),
      ...(woorden.length
        ? [
            "",
            `SEARCH RESULTS for: ${woorden.join(", ")}`,
            "Requests:",
            ...lijst(zoekLeads, (l) => `${l.naam} | ${STATUS_EN[l.status] ?? l.status} | ${ams(l.created_at)} | ${l.onderwerp}${l.laatste_actie ? ` | ${l.laatste_actie}` : ""}`),
            "Messages in conversations:",
            ...lijst(zoekBerichten, (b) => `${b.bezoeker} | ${b.rol === "bezoeker" ? "visitor" : b.rol === "mens" ? "you" : "Volgo"} | ${ams(b.created_at)} | ${b.tekst.slice(0, 220).replace(/\n/g, " ")}`),
            "Appointments:",
            ...lijst(zoekAfspraken, (a) => `${lokaal(a.start)} | ${a.titel}${a.notitie ? ` | ${a.notitie.slice(0, 140).replace(/\n/g, " ")}` : ""}`),
          ]
        : []),
    ].join("\n");

    const system = `You are Volgo, the assistant of ${voornaam} at ${naamBedrijf} inside the Volgo dashboard. You know everything in this account.
You help with: finding customers, conversations and appointments; reading the website analytics; deciding who to call; writing messages; and setting up Volgo step by step.

Rules:
- Answer in the language the owner writes in. Short and concrete; short lists when helpful. No emojis.
- Base answers only on the data below. If something is not in it, say so honestly and say where in the dashboard they can look.
- Never make up names, phone numbers, prices, numbers or appointments.
- When the owner wants to change or set up something, explain in one or two steps what to do and add a button with [[open:id]] (one per line, ids from the list below). You cannot change settings yourself.
- When a setting is missing that matters for their question (for example no own calendar linked, no review link, notifications off), mention it once with its [[open:id]].
- Volgo works through the website chat and contact form. WhatsApp and missed calls only land in the inbox after the Volgo team connects them; Instagram DMs are not connected to Volgo.

${PAGINAS}

DATA FOR ${naamBedrijf.toUpperCase()}
${context}`;

    const messages = [
      ...data.historie.map((h) => ({ role: h.rol === "ik" ? ("user" as const) : ("assistant" as const), content: h.tekst })),
      { role: "user" as const, content: data.vraag },
    ];
    while (messages.length && messages[0].role !== "user") messages.shift();

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: CLAUDE_MODEL || "claude-haiku-5-5", max_tokens: 1200, thinking: { type: "disabled" }, system, messages }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`Claude ${res.status}`);
      const out = (await res.json()) as { content: { type: string; text?: string }[] };
      const antwoord = out.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim();
      return { ok: true as const, antwoord: antwoord || "I don't have an answer to that right now. Try asking it differently." };
    } catch (err) {
      console.error("[assistent]", err);
      return { ok: false as const, antwoord: "Volgo is temporarily unavailable. Please try again in a minute." };
    }
  });

/** Eerste dag: welke van de drie stappen zijn al gedaan? */
export const haalOnboarding = createServerFn({ method: "GET" }).handler(async () => {
  const g = await actieveGebruiker().catch(() => null);
  const { DB } = bindings();
  if (!g || !DB) return null;
  const { instellingenVoorTeam } = await import("../ava.server");
  const inst = await instellingenVoorTeam(DB, g.team_id);
  const [ob, leden, uitnod, echteChat] = await Promise.all([
    DB.prepare("SELECT ava_getest, verborgen, geinstalleerd FROM onboarding WHERE team_id = ?").bind(g.team_id).first<{ ava_getest: number; verborgen: number; geinstalleerd: number }>(),
    DB.prepare("SELECT COUNT(*) AS n FROM team_leden WHERE team_id = ? AND gebruiker_id != ?").bind(g.team_id, g.team_id).first<{ n: number }>(),
    DB.prepare("SELECT COUNT(*) AS n FROM uitnodigingen WHERE team_id = ?").bind(g.team_id).first<{ n: number }>(),
    DB.prepare("SELECT id FROM ava_gesprekken WHERE team_id = ? AND voorbeeld = 0 LIMIT 1").bind(g.team_id).first(),
  ]);
  return {
    verborgen: Boolean(ob?.verborgen),
    teamMogelijk: (await import("../limieten.server").then((m) => m.planVoorTeam(DB, g.team_id))).limieten.teamChat,
    sleutel: inst.sleutel,
    stappen: {
      info: inst.bedrijfsinfo.trim().length >= 40,
      getest: Boolean(ob?.ava_getest) || Boolean(echteChat),
      team: (leden?.n ?? 0) + (uitnod?.n ?? 0) > 0,
      geinstalleerd: Boolean(ob?.geinstalleerd),
    },
  };
});

export const markeerOnboarding = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ actie: z.enum(["getest", "verbergen", "geinstalleerd"]) }).parse(d))
  .handler(async ({ data }) => {
    const g = await actieveGebruiker().catch(() => null);
    const { DB } = bindings();
    if (!g || !DB) return { ok: false };
    const kolom = data.actie === "getest" ? "ava_getest" : data.actie === "geinstalleerd" ? "geinstalleerd" : "verborgen";
    await DB.prepare(`INSERT INTO onboarding (team_id, ${kolom}) VALUES (?, 1) ON CONFLICT(team_id) DO UPDATE SET ${kolom} = 1`).bind(g.team_id).run();
    return { ok: true };
  });

/** Voor publieke pagina's: ben je ingelogd en heb je al toegang? */
export const accountStatus = createServerFn({ method: "GET" }).handler(async () => {
  const g = await huidigeGebruiker().catch(() => null);
  const { DB } = bindings();
  if (!g || !DB) return { ingelogd: false, toegang: false, email: "", plan: "", eigenaar: false };
  const { heeftToegang } = await import("../toegang.server");
  const p = await DB.prepare("SELECT plan FROM gebruikers WHERE id = ?").bind(g.team_id).first<{ plan: string }>();
  return { ingelogd: true, toegang: await heeftToegang(DB, g.team_id), email: g.email, plan: p?.plan ?? "", eigenaar: g.rol === "eigenaar" };
});

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { huidigeGebruiker } from "../auth.server";
import { bindings } from "../bindings.server";

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
  opvolging: "AVA following up",
  offerte: "quote sent",
  afspraak: "appointment",
  klant: "customer",
  verloren: "lost",
};

const ams = (iso: string) =>
  new Date(iso.replace(" ", "T") + (iso.includes("Z") || iso.includes("+") ? "" : "Z")).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });

/** AVA voor de ondernemer zelf: beantwoordt vragen over de eigen leads, gesprekken en agenda. */
export const vraagAssistent = createServerFn({ method: "POST" })
  .validator((d: unknown) => invoer.parse(d))
  .handler(async ({ data }) => {
    const g = await huidigeGebruiker();
    if (!g) return { ok: false as const, antwoord: "You are logged out. Log in again to continue." };
    const { DB, ANTHROPIC_API_KEY, CLAUDE_MODEL } = bindings();
    if (!DB) return { ok: false as const, antwoord: "The database is temporarily unavailable." };
    const team = g.team_id;

    const [leads, afspraken, gesprekken, bedrijf] = await Promise.all([
      DB.prepare(
        `SELECT l.naam, l.onderwerp, l.kanaal, l.status, l.created_at, COALESCE(s.warmte, 50) AS warmte, s.reden
         FROM klant_leads l LEFT JOIN lead_scores s ON s.lead_id = l.id
         WHERE l.gebruiker_id = ? AND l.created_at > datetime('now', '-90 days')
         ORDER BY CASE WHEN l.status IN ('klant','verloren') THEN 1 ELSE 0 END, warmte DESC LIMIT 40`,
      )
        .bind(team)
        .all<{ naam: string; onderwerp: string; kanaal: string; status: string; created_at: string; warmte: number; reden: string | null }>(),
      DB.prepare("SELECT titel, start, locatie FROM afspraken WHERE team_id = ? AND start >= datetime('now', '-1 day') ORDER BY start LIMIT 25")
        .bind(team)
        .all<{ titel: string; start: string; locatie: string | null }>(),
      DB.prepare("SELECT bezoeker, onderwerp, status, laatste, warmte FROM ava_gesprekken WHERE team_id = ? ORDER BY laatste DESC LIMIT 15")
        .bind(team)
        .all<{ bezoeker: string; onderwerp: string; status: string; laatste: string; warmte: number }>(),
      DB.prepare("SELECT bedrijf FROM gebruikers WHERE id = ?").bind(team).first<{ bedrijf: string }>(),
    ]);

    const naamBedrijf = bedrijf?.bedrijf ?? g.bedrijf;
    const voornaam = g.naam.split(/\s+/)[0];

    if (!ANTHROPIC_API_KEY) {
      const open = leads.results.filter((l) => l.status !== "klant" && l.status !== "verloren");
      const top = open.slice(0, 3).map((l) => `${l.naam} (warmth ${l.warmte}): ${l.onderwerp}`);
      return {
        ok: true as const,
        antwoord: top.length
          ? `You have ${open.length} open ${open.length === 1 ? "lead" : "leads"}. Call these first:\n${top.map((t) => `- ${t}`).join("\n")}`
          : "You have no open leads right now. As soon as AVA talks to someone on your website, you will see them here.",
      };
    }

    const context = [
      `Today: ${ams(new Date().toISOString())}`,
      "",
      "LEADS (hottest open leads first; warmth 0-100):",
      ...(leads.results.length
        ? leads.results.map((l) => `- ${l.naam} | warmth ${l.warmte} | status ${STATUS_EN[l.status] ?? l.status} | via ${l.kanaal} | received ${ams(l.created_at)} | ${l.onderwerp}${l.reden ? ` | ${l.reden}` : ""}`)
        : ["(none)"]),
      "",
      "CALENDAR (upcoming appointments):",
      ...(afspraken.results.length ? afspraken.results.map((a) => `- ${ams(a.start)} | ${a.titel}${a.locatie ? ` | ${a.locatie}` : ""}`) : ["(none)"]),
      "",
      "RECENT AVA CONVERSATIONS ON THE WEBSITE:",
      ...(gesprekken.results.length
        ? gesprekken.results.map((c) => `- ${c.bezoeker} | ${c.status === "live" ? "live" : "finished"} | last message ${ams(c.laatste)} | warmth ${c.warmte} | ${c.onderwerp}`)
        : ["(none)"]),
    ].join("\n");

    const system = `You are AVA, the personal assistant of ${voornaam} at ${naamBedrijf} in the Volgo dashboard.
You help the business owner with their own customers: who to call, what is on the calendar, what visitors asked about, and you write messages and quote texts.

Rules:
- Always answer in English. Be short and concrete. Use short lists when helpful. No emojis.
- Base your answers only on the data below. If something is not in it, say so honestly.
- Never make up phone numbers, prices or appointments.

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
      return { ok: false as const, antwoord: "AVA is temporarily unavailable. Please try again in a minute." };
    }
  });

/** Eerste dag: welke van de drie stappen zijn al gedaan? */
export const haalOnboarding = createServerFn({ method: "GET" }).handler(async () => {
  const g = await huidigeGebruiker();
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
    const g = await huidigeGebruiker();
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

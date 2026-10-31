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

const ams = (iso: string) =>
  new Date(iso.replace(" ", "T") + (iso.includes("Z") || iso.includes("+") ? "" : "Z")).toLocaleString("nl-NL", {
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
    if (!g) return { ok: false as const, antwoord: "Je bent uitgelogd. Log opnieuw in om verder te gaan." };
    const { DB, ANTHROPIC_API_KEY, CLAUDE_MODEL } = bindings();
    if (!DB) return { ok: false as const, antwoord: "De database is even niet bereikbaar." };
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
      const top = open.slice(0, 3).map((l) => `${l.naam} (warmte ${l.warmte}): ${l.onderwerp}`);
      return {
        ok: true as const,
        antwoord: top.length
          ? `Je hebt ${open.length} open ${open.length === 1 ? "lead" : "leads"}. Bel als eerste:\n${top.map((t) => `- ${t}`).join("\n")}`
          : "Je hebt op dit moment geen open leads. Zodra AVA iemand spreekt op je website, zie je die hier.",
      };
    }

    const context = [
      `Vandaag: ${ams(new Date().toISOString())}`,
      "",
      "LEADS (warmste open leads eerst; warmte 0-100):",
      ...(leads.results.length
        ? leads.results.map((l) => `- ${l.naam} | warmte ${l.warmte} | status ${l.status} | via ${l.kanaal} | binnen ${ams(l.created_at)} | ${l.onderwerp}${l.reden ? ` | ${l.reden}` : ""}`)
        : ["(geen)"]),
      "",
      "AGENDA (komende afspraken):",
      ...(afspraken.results.length ? afspraken.results.map((a) => `- ${ams(a.start)} | ${a.titel}${a.locatie ? ` | ${a.locatie}` : ""}`) : ["(geen)"]),
      "",
      "RECENTE GESPREKKEN VAN AVA OP DE WEBSITE:",
      ...(gesprekken.results.length
        ? gesprekken.results.map((c) => `- ${c.bezoeker} | ${c.status} | laatst ${ams(c.laatste)} | warmte ${c.warmte} | ${c.onderwerp}`)
        : ["(geen)"]),
    ].join("\n");

    const system = `Je bent AVA, de persoonlijke assistent van ${voornaam} van ${naamBedrijf} in het Volgo-dashboard.
Je helpt de ondernemer met zijn eigen klanten: wie hij moet bellen, wat er in de agenda staat, wat bezoekers vroegen, en je schrijft berichten en offerteteksten.

Regels:
- Nederlands, "je", kort en concreet. Gebruik korte lijstjes als dat helpt. Geen emoji's.
- Baseer je alleen op de gegevens hieronder. Staat iets er niet in, zeg dat eerlijk.
- Verzin geen telefoonnummers, prijzen of afspraken.

GEGEVENS VAN ${naamBedrijf.toUpperCase()}
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
      return { ok: true as const, antwoord: antwoord || "Ik heb daar even geen antwoord op. Probeer het anders te vragen." };
    } catch (err) {
      console.error("[assistent]", err);
      return { ok: false as const, antwoord: "AVA is even niet bereikbaar. Probeer het over een minuut opnieuw." };
    }
  });

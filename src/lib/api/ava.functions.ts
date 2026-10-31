import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { instellingenVoorTeam } from "../ava.server";
import { stijlSchema } from "../stijl.server";
import { huidigeGebruiker } from "../auth.server";
import { bindings } from "../bindings.server";

async function sessie() {
  const g = await huidigeGebruiker();
  const { DB, ANTHROPIC_API_KEY } = bindings();
  if (!g || !DB) throw new Error("Not logged in");
  return { g, DB, aiActief: Boolean(ANTHROPIC_API_KEY) };
}

export const haalAva = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB, aiActief } = await sessie();
  const inst = await instellingenVoorTeam(DB, g.team_id);
  const m = await DB.prepare("SELECT chat, lead, email, heet_mail, samenvatting FROM meldingen WHERE gebruiker_id = ?")
    .bind(g.id)
    .first<{ chat: number; lead: number; email: number; heet_mail: number; samenvatting: number }>();
  const { haalStijl, STANDAARD_STIJL } = await import("../stijl.server");
  const { planVoorTeam } = await import("../limieten.server");
  const magStijl = (await planVoorTeam(DB, g.team_id)).limieten.eigenStijl;
  const stijl = (await haalStijl(DB, g.team_id)) ?? { ...STANDAARD_STIJL, branding: !magStijl };
  return { inst, meldingen: m ?? { chat: 1, lead: 1, email: 0, heet_mail: 1, samenvatting: 1 }, aiActief, stijl, magStijl };
});

export const bewaarAva = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        naam: z.string().trim().min(1).max(30),
        begroeting: z.string().trim().min(5).max(300),
        bedrijfsinfo: z.string().trim().max(4000),
        kleur: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    await instellingenVoorTeam(DB, g.team_id);
    await DB.prepare("UPDATE ava_instellingen SET naam = ?, begroeting = ?, bedrijfsinfo = ?, kleur = ? WHERE team_id = ?")
      .bind(data.naam, data.begroeting, data.bedrijfsinfo, data.kleur, g.team_id)
      .run();
    return { ok: true };
  });

export const bewaarMeldingen = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ chat: z.boolean(), lead: z.boolean(), email: z.boolean(), heet_mail: z.boolean(), samenvatting: z.boolean() }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    await DB.prepare("INSERT OR REPLACE INTO meldingen (gebruiker_id, chat, lead, email, heet_mail, samenvatting) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(g.id, data.chat ? 1 : 0, data.lead ? 1 : 0, data.email ? 1 : 0, data.heet_mail ? 1 : 0, data.samenvatting ? 1 : 0)
      .run();
    return { ok: true };
  });

export const haalGesprek = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ id: z.number().int() }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    const gesprek = await DB.prepare(
      `SELECT g.id, g.bezoeker, g.kanaal, g.onderwerp, g.status, g.gestart, g.laatste, g.berichten, g.warmte, g.voorbeeld, m.contact, m.lead_id,
              m.overgenomen_door, m.overgenomen_naam, m.token IS NOT NULL AS kan_chatten
       FROM ava_gesprekken g LEFT JOIN ava_gesprek_meta m ON m.gesprek_id = g.id WHERE g.id = ? AND g.team_id = ?`,
    )
      .bind(data.id, g.team_id)
      .first<{ id: number; bezoeker: string; kanaal: string; onderwerp: string; status: string; gestart: string; laatste: string; berichten: number; warmte: number; voorbeeld: number; contact: string | null; lead_id: number | null; overgenomen_door: number | null; overgenomen_naam: string | null; kan_chatten: number }>();
    if (!gesprek) return null;
    const berichten = (
      await DB.prepare("SELECT id, rol, tekst, created_at FROM ava_berichten WHERE gesprek_id = ? ORDER BY id").bind(data.id).all<{ id: number; rol: string; tekst: string; created_at: string }>()
    ).results;
    return { gesprek, berichten };
  });

// Voor meldingen: wat is er nieuw sinds het laatste moment dat het dashboard keek?
export const checkNieuw = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ sinds: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/) }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    const [chats, leads, nu] = await Promise.all([
      DB.prepare("SELECT id, bezoeker, onderwerp FROM ava_gesprekken WHERE team_id = ? AND voorbeeld = 0 AND gestart > ? ORDER BY id").bind(g.team_id, data.sinds).all<{ id: number; bezoeker: string; onderwerp: string }>(),
      DB.prepare(
        "SELECT l.id, l.naam, l.onderwerp, COALESCE(s.warmte, 50) AS warmte FROM klant_leads l LEFT JOIN lead_scores s ON s.lead_id = l.id WHERE l.gebruiker_id = ? AND l.voorbeeld = 0 AND l.created_at > ? ORDER BY l.id",
      )
        .bind(g.team_id, data.sinds)
        .all<{ id: number; naam: string; onderwerp: string; warmte: number }>(),
      DB.prepare("SELECT datetime('now') AS nu").first<{ nu: string }>(),
    ]);
    const m = await DB.prepare("SELECT chat, lead FROM meldingen WHERE gebruiker_id = ?").bind(g.id).first<{ chat: number; lead: number }>();
    return { chats: chats.results, leads: leads.results, nu: nu?.nu ?? data.sinds, meldChat: m ? !!m.chat : true, meldLead: m ? !!m.lead : true };
  });

export const bewaarStijl = createServerFn({ method: "POST" })
  .validator((v: unknown) => stijlSchema.parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    const { planVoorTeam } = await import("../limieten.server");
    if (!(await planVoorTeam(DB, g.team_id)).limieten.eigenStijl) return { ok: false as const, message: "Your own style is part of Pro and Premium." };
    await DB.prepare(
      "INSERT OR REPLACE INTO ava_stijl (team_id, avatar, positie, thema, vorm, lettertype, knoptekst, branding) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(g.team_id, data.avatar, data.positie, data.thema, data.vorm, data.lettertype, data.knoptekst, data.branding ? 1 : 0)
      .run();
    return { ok: true as const, message: "" };
  });

// ── A person takes over a conversation from AVA ─────────────────
async function eigenGesprek(DB: NonNullable<ReturnType<typeof bindings>["DB"]>, team: number, id: number) {
  return DB.prepare("SELECT g.id FROM ava_gesprekken g JOIN ava_gesprek_meta m ON m.gesprek_id = g.id WHERE g.id = ? AND g.team_id = ?").bind(id, team).first();
}

export const neemGesprekOver = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int(), aan: z.boolean() }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    if (!(await eigenGesprek(DB, g.team_id, data.id))) return { ok: false as const };
    const voornaam = g.naam.split(/\s+/)[0] || g.naam;
    if (data.aan) {
      await DB.batch([
        DB.prepare("UPDATE ava_gesprek_meta SET overgenomen_door = ?, overgenomen_naam = ? WHERE gesprek_id = ?").bind(g.id, voornaam, data.id),
        DB.prepare("INSERT INTO ava_berichten (gesprek_id, rol, tekst) VALUES (?, 'systeem', ?)").bind(data.id, `${voornaam} joined the chat`),
      ]);
    } else {
      await DB.batch([
        DB.prepare("UPDATE ava_gesprek_meta SET overgenomen_door = NULL, overgenomen_naam = NULL WHERE gesprek_id = ?").bind(data.id),
        DB.prepare("INSERT INTO ava_berichten (gesprek_id, rol, tekst) VALUES (?, 'systeem', ?)").bind(data.id, `${voornaam} left the chat. AVA is back to help.`),
      ]);
    }
    return { ok: true as const };
  });

export const stuurMensBericht = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int(), tekst: z.string().trim().min(1).max(2000) }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    const m = await DB.prepare(
      "SELECT m.overgenomen_door FROM ava_gesprek_meta m JOIN ava_gesprekken g ON g.id = m.gesprek_id WHERE m.gesprek_id = ? AND g.team_id = ?",
    )
      .bind(data.id, g.team_id)
      .first<{ overgenomen_door: number | null }>();
    if (!m) return { ok: false as const, message: "Conversation not found." };
    if (!m.overgenomen_door) return { ok: false as const, message: "Take over the conversation first." };
    await DB.batch([
      DB.prepare("INSERT INTO ava_berichten (gesprek_id, rol, tekst) VALUES (?, 'mens', ?)").bind(data.id, data.tekst),
      DB.prepare("UPDATE ava_gesprekken SET laatste = datetime('now'), status = 'live', berichten = berichten + 1 WHERE id = ?").bind(data.id),
    ]);
    return { ok: true as const, message: "" };
  });

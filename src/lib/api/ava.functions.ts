import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { instellingenVoorTeam } from "../ava.server";
import { stijlSchema } from "../stijl.server";
import { huidigeGebruiker } from "../auth.server";
import { bindings } from "../bindings.server";
import { actieveGebruiker } from "../toegang.server";
import { leesProfiel, profielCompleet } from "../profiel-vragen";

async function sessie() {
  const g = await actieveGebruiker().catch(() => null);
  const { DB, ANTHROPIC_API_KEY } = bindings();
  if (!g || !DB) throw new Error("Not logged in");
  return { g, DB, aiActief: Boolean(ANTHROPIC_API_KEY) };
}

export const haalAva = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB, aiActief } = await sessie();
  const inst = await instellingenVoorTeam(DB, g.team_id);
  const m = await DB.prepare("SELECT chat, lead, email, heet_mail, samenvatting, chat_mail FROM meldingen WHERE gebruiker_id = ?")
    .bind(g.id)
    .first<{ chat: number; lead: number; email: number; heet_mail: number; samenvatting: number; chat_mail: number }>();
  const { haalStijl, STANDAARD_STIJL } = await import("../stijl.server");
  const { planVoorTeam } = await import("../limieten.server");
  const magStijl = (await planVoorTeam(DB, g.team_id)).limieten.eigenStijl;
  const stijl = (await haalStijl(DB, g.team_id)) ?? { ...STANDAARD_STIJL, branding: !magStijl };
  return { inst, meldingen: m ?? { chat: 1, lead: 1, email: 0, heet_mail: 1, samenvatting: 1, chat_mail: 1 }, aiActief, stijl, magStijl };
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

/** The five profile questions (what kind of business, customers, next step, lead time, tone). All five are required. */
export const bewaarProfiel = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.record(z.string(), z.string()).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    const p = leesProfiel(JSON.stringify(data));
    if (!profielCompleet(p)) return { ok: false as const, message: "Please answer all five questions." };
    await instellingenVoorTeam(DB, g.team_id);
    await DB.prepare("UPDATE ava_instellingen SET profiel = ? WHERE team_id = ?").bind(JSON.stringify(p), g.team_id).run();
    return { ok: true as const, message: "" };
  });

/** Appointments AVA lets visitors book in the chat: on/off, opening days and hours, duration, kinds and time zone. */
export const bewaarAgenda = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        boeken: z.boolean(),
        open_dagen: z.array(z.number().int().min(0).max(6)).min(1).max(7),
        open_van: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        open_tot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        afspraak_duur: z.number().int().min(15).max(240),
        afspraak_soorten: z.array(z.enum(["bellen", "langs", "kantoor", "insta"])).min(1).max(4),
        instagram: z
          .string()
          .trim()
          .max(40)
          .transform((v) => v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, ""))
          .refine((v) => v === "" || /^[A-Za-z0-9._]{1,30}$/.test(v), "Invalid Instagram username"),
        tijdzone: z.string().max(60),
      })
      .refine((d) => d.open_van < d.open_tot, "Opening time must be before closing time")
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    try {
      new Intl.DateTimeFormat("en", { timeZone: data.tijdzone });
    } catch {
      return { ok: false, message: "Unknown time zone." };
    }
    if (data.afspraak_soorten.includes("insta") && !data.instagram) return { ok: false, message: "Fill in your Instagram username for the Instagram option." };
    await instellingenVoorTeam(DB, g.team_id);
    await DB.prepare(
      "UPDATE ava_instellingen SET boeken = ?, open_dagen = ?, open_van = ?, open_tot = ?, afspraak_duur = ?, afspraak_soorten = ?, tijdzone = ?, instagram = ? WHERE team_id = ?",
    )
      .bind(data.boeken ? 1 : 0, [...new Set(data.open_dagen)].sort().join(","), data.open_van, data.open_tot, data.afspraak_duur, [...new Set(data.afspraak_soorten)].join(","), data.tijdzone, data.instagram, g.team_id)
      .run();
    return { ok: true, message: "Saved." };
  });

/** Consent screen on the website: on = visitors choose first, and location/device details are kept for those who accept. */
export const bewaarToestemming = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ aan: z.boolean() }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    await instellingenVoorTeam(DB, g.team_id);
    await DB.prepare("UPDATE ava_instellingen SET toestemming = ? WHERE team_id = ?").bind(data.aan ? 1 : 0, g.team_id).run();
    return { ok: true };
  });

export const bewaarMeldingen = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ chat: z.boolean(), lead: z.boolean(), email: z.boolean(), heet_mail: z.boolean(), samenvatting: z.boolean(), chat_mail: z.boolean().default(true) }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    await DB.prepare("INSERT OR REPLACE INTO meldingen (gebruiker_id, chat, lead, email, heet_mail, samenvatting, chat_mail) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(g.id, data.chat ? 1 : 0, data.lead ? 1 : 0, data.email ? 1 : 0, data.heet_mail ? 1 : 0, data.samenvatting ? 1 : 0, data.chat_mail ? 1 : 0)
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
    // The visit this chat came from: where (with permission) and which pages they looked at first.
    const meta = await DB.prepare("SELECT sessie, herkomst FROM ava_gesprek_meta WHERE gesprek_id = ?").bind(data.id).first<{ sessie: string | null; herkomst: string | null }>();
    const bezoek = meta?.sessie
      ? (
          await DB.prepare("SELECT pad, titel, bron, duur, created_at FROM site_views WHERE team_id = ? AND sessie = ? ORDER BY id LIMIT 20")
            .bind(g.team_id, meta.sessie)
            .all<{ pad: string; titel: string | null; bron: string | null; duur: number; created_at: string }>()
        ).results
      : [];
    const berichten = (
      await DB.prepare("SELECT id, rol, tekst, created_at FROM ava_berichten WHERE gesprek_id = ? ORDER BY id").bind(data.id).all<{ id: number; rol: string; tekst: string; created_at: string }>()
    ).results;
    return { gesprek, berichten, herkomst: meta?.herkomst ?? null, bezoek };
  });

/** Chat list for the DM-style Conversations page, newest first, with the last message as preview. */
export const haalGesprekken = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB } = await sessie();
  const r = await DB.prepare(
    `SELECT g.id, g.bezoeker, g.onderwerp, g.status, g.laatste, g.warmte, g.voorbeeld, m.overgenomen_naam, m.lead_id,
            (SELECT b.tekst FROM ava_berichten b WHERE b.gesprek_id = g.id AND b.rol != 'systeem' ORDER BY b.id DESC LIMIT 1) AS laatste_tekst,
            (SELECT b.rol FROM ava_berichten b WHERE b.gesprek_id = g.id AND b.rol != 'systeem' ORDER BY b.id DESC LIMIT 1) AS laatste_rol,
            datetime('now') AS nu
     FROM ava_gesprekken g LEFT JOIN ava_gesprek_meta m ON m.gesprek_id = g.id
     WHERE g.team_id = ? ORDER BY g.laatste DESC LIMIT 60`,
  )
    .bind(g.team_id)
    .all<{ id: number; bezoeker: string; onderwerp: string; status: string; laatste: string; warmte: number; voorbeeld: number; overgenomen_naam: string | null; lead_id: number | null; laatste_tekst: string | null; laatste_rol: string | null; nu: string }>();
  return r.results;
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
    await slaStijlOp(DB, g.team_id, data);
    return { ok: true as const, message: "" };
  });

async function slaStijlOp(DB: NonNullable<ReturnType<typeof bindings>["DB"]>, team: number, d: z.infer<typeof stijlSchema>) {
  await DB.prepare(
    "INSERT OR REPLACE INTO ava_stijl (team_id, avatar, positie, thema, vorm, lettertype, knoptekst, branding, knop, grootte, afstand, zij, uitnodiging) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(team, d.avatar, d.positie, d.thema, d.vorm, d.lettertype, d.knoptekst, d.branding ? 1 : 0, d.knop, d.grootte, d.afstand, d.zij, d.uitnodiging)
    .run();
}

/** Editor ("Customize"): everything the editor shows, in one go. */
export const haalOntwerp = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB } = await sessie();
  const inst = await instellingenVoorTeam(DB, g.team_id);
  const site = await DB.prepare("SELECT site_url FROM ava_instellingen WHERE team_id = ?").bind(g.team_id).first<{ site_url: string }>();
  const { haalStijl, STANDAARD_STIJL } = await import("../stijl.server");
  const { planVoorTeam } = await import("../limieten.server");
  const magStijl = (await planVoorTeam(DB, g.team_id)).limieten.eigenStijl;
  const stijl = (await haalStijl(DB, g.team_id)) ?? { ...STANDAARD_STIJL, branding: !magStijl };
  return { sleutel: inst.sleutel, naam: inst.naam, kleur: inst.kleur, begroeting: inst.begroeting, bedrijf: inst.bedrijf, site: site?.site_url ?? "", stijl, magStijl, soorten: inst.boeken ? inst.afspraak_soorten.split(",") : [] };
});

/** Editor: save colour, greeting, website address and (Pro/Premium) the style. */
export const bewaarOntwerp = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        kleur: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        begroeting: z.string().trim().min(5).max(300),
        site: z.union([z.literal(""), z.string().trim().max(300).regex(/^https:\/\/[^\s]+$/)]),
        stijl: stijlSchema,
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    await instellingenVoorTeam(DB, g.team_id);
    await DB.prepare("UPDATE ava_instellingen SET kleur = ?, begroeting = ?, site_url = ? WHERE team_id = ?").bind(data.kleur, data.begroeting, data.site, g.team_id).run();
    const { planVoorTeam } = await import("../limieten.server");
    if ((await planVoorTeam(DB, g.team_id)).limieten.eigenStijl) await slaStijlOp(DB, g.team_id, data.stijl);
    return { ok: true as const };
  });

/** Editor: can this website be shown inside the preview? (Some sites forbid being shown in a frame.) */
export const controleerSite = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ url: z.string().trim().max(300) }).parse(v))
  .handler(async ({ data }) => {
    await sessie();
    let u: URL;
    try {
      u = new URL(/^https?:\/\//i.test(data.url) ? data.url : `https://${data.url}`);
    } catch {
      return { ok: false as const, reden: "That doesn't look like a web address." };
    }
    u.protocol = "https:";
    if (!/\./.test(u.hostname) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) return { ok: false as const, reden: "That doesn't look like a public website." };
    try {
      const r = await fetch(u.toString(), { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (Volgo preview check)" }, signal: AbortSignal.timeout(8000) });
      const xfo = (r.headers.get("x-frame-options") ?? "").toLowerCase();
      const csp = (r.headers.get("content-security-policy") ?? "").toLowerCase();
      const fa = /frame-ancestors([^;]*)/.exec(csp)?.[1]?.trim() ?? "";
      const geblokt = xfo.includes("deny") || xfo.includes("sameorigin") || (fa !== "" && !fa.includes("*") && !fa.includes("thevolgo.app"));
      const eind = r.url || u.toString();
      return { ok: true as const, url: eind.startsWith("https://") ? eind : u.toString(), inbedden: !geblokt, bereikbaar: r.ok };
    } catch {
      return { ok: true as const, url: u.toString(), inbedden: false, bereikbaar: false };
    }
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

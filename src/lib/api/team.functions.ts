import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { hashWachtwoord, huidigeGebruiker, maakSessie, randomToken } from "../auth.server";
import { bindings } from "../bindings.server";
import { actieveGebruiker } from "../toegang.server";
import { aantalPlekken, planVoorTeam } from "../limieten.server";
import { SITE_URL, esc, mailOpmaak, verstuurMail } from "../mail.server";
import { dmKey } from "../team.server";

async function sessie() {
  const g = await actieveGebruiker().catch(() => null);
  const { DB } = bindings();
  if (!g || !DB) throw new Error("Not logged in");
  return { g, DB };
}

/** Team chat and video are part of Complete. */
async function chatSessie() {
  const s = await sessie();
  if (!(await planVoorTeam(s.DB, s.g.team_id)).limieten.teamChat) throw new Error("Team chat is part of Complete.");
  return s;
}

// ── Chat ────────────────────────────────────────────────
const doel = z.object({ kanaal_id: z.number().int().optional(), dm_met: z.number().int().optional() });

async function filter(DB: D1Like, teamId: number, mijnId: number, d: z.infer<typeof doel>) {
  if (d.kanaal_id) {
    const k = await DB.prepare("SELECT id FROM kanalen WHERE id = ? AND team_id = ?").bind(d.kanaal_id, teamId).first();
    if (!k) throw new Error("Channel not found");
    return { sql: "kanaal_id = ?", waarde: d.kanaal_id as number | string, kanaal_id: d.kanaal_id, dm_key: null as string | null };
  }
  if (d.dm_met) {
    const lid = await DB.prepare("SELECT g.id FROM gebruikers g LEFT JOIN team_leden t ON t.gebruiker_id = g.id WHERE g.id = ? AND (g.id = ? OR t.team_id = ?)")
      .bind(d.dm_met, teamId, teamId)
      .first();
    if (!lid) throw new Error("Team member not found");
    const key = dmKey(mijnId, d.dm_met);
    return { sql: "dm_key = ?", waarde: key as number | string, kanaal_id: null as number | null, dm_key: key };
  }
  throw new Error("No channel or person selected");
}
type D1Like = NonNullable<ReturnType<typeof bindings>["DB"]>;

export const haalBerichten = createServerFn({ method: "GET" })
  .validator((v: unknown) => doel.extend({ na_id: z.number().int().default(0) }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await chatSessie();
    const f = await filter(DB, g.team_id, g.id, data);
    const rows = await DB.prepare(
      `SELECT b.id, b.tekst, b.soort, b.created_at, b.afzender_id, u.naam AS afzender
       FROM berichten b JOIN gebruikers u ON u.id = b.afzender_id
       WHERE b.team_id = ? AND b.${f.sql} AND b.id > ? ORDER BY b.id DESC LIMIT 100`,
    )
      .bind(g.team_id, f.waarde, data.na_id)
      .all<{ id: number; tekst: string; soort: string; created_at: string; afzender_id: number; afzender: string }>();
    return rows.results.reverse();
  });

export const stuurBericht = createServerFn({ method: "POST" })
  .validator((v: unknown) => doel.extend({ tekst: z.string().trim().min(1).max(4000), soort: z.enum(["tekst", "video"]).default("tekst") }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await chatSessie();
    const f = await filter(DB, g.team_id, g.id, data);
    await DB.prepare("INSERT INTO berichten (team_id, kanaal_id, dm_key, afzender_id, tekst, soort) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(g.team_id, f.kanaal_id, f.dm_key, g.id, data.tekst, data.soort)
      .run();
    return { ok: true };
  });

export const maakKanaal = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ naam: z.string().trim().min(2).max(40) }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await chatSessie();
    const naam = data.naam.toLowerCase().replace(/[^a-z0-9à-ü-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "kanaal";
    const r = await DB.prepare("INSERT INTO kanalen (team_id, naam) VALUES (?, ?)").bind(g.team_id, naam).run();
    return { id: Number(r.meta?.last_row_id), naam };
  });

// ── Uitnodigen ──────────────────────────────────────────
export const maakUitnodiging = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(200) }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    if (g.rol !== "eigenaar") return { link: "", gemaild: false, fout: "Only the account owner can invite people." };
    const plan = await planVoorTeam(DB, g.team_id);
    if (plan.limieten.leden !== null && (await aantalPlekken(DB, g.team_id)) >= plan.limieten.leden) {
      return {
        link: "",
        gemaild: false,
        fout:
          plan.limieten.leden === 1
            ? "Volgo Assistant is for one person. Upgrade to Complete to add your team."
            : `Your ${plan.naam} plan includes up to ${plan.limieten.leden} users. Upgrade to Premium for unlimited users.`,
      };
    }
    const token = randomToken(20);
    await DB.prepare("INSERT INTO uitnodigingen (token, team_id, email) VALUES (?, ?, ?)").bind(token, g.team_id, data.email).run();
    const link = `${SITE_URL}/invite?token=${token}`;
    const gemaild = await verstuurMail(
      data.email,
      `${g.naam} invited you to the ${g.bedrijf} team on Volgo`,
      mailOpmaak(
        "You're invited",
        `<p>${esc(g.naam)} invited you to join the <strong>${esc(g.bedrijf)}</strong> team on Volgo, to follow up on leads together.</p>`,
        { tekst: "Accept invitation", url: link },
      ),
    );
    return { link, gemaild, fout: "" };
  });

export const bekijkUitnodiging = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ token: z.string().max(80) }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = bindings();
    if (!DB) return null;
    return await DB.prepare(
      "SELECT u.email, g.bedrijf, g.naam AS van FROM uitnodigingen u JOIN gebruikers g ON g.id = u.team_id WHERE u.token = ? AND u.gebruikt = 0 AND u.created_at > datetime('now', '-14 days')",
    )
      .bind(data.token)
      .first<{ email: string; bedrijf: string; van: string }>();
  });

export const accepteerUitnodiging = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z.object({ token: z.string().max(80), naam: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().email().max(200), wachtwoord: z.string().min(8).max(200) }).parse(v),
  )
  .handler(async ({ data }) => {
    const { DB } = bindings();
    if (!DB) return { ok: false as const, message: "Database unavailable." };
    const u = await DB.prepare("SELECT team_id FROM uitnodigingen WHERE token = ? AND gebruikt = 0 AND created_at > datetime('now', '-14 days')").bind(data.token).first<{ team_id: number }>();
    if (!u) return { ok: false as const, message: "This invitation has expired or was already used." };
    const eigenaar = await DB.prepare("SELECT bedrijf, plan FROM gebruikers WHERE id = ?").bind(u.team_id).first<{ bedrijf: string; plan: string }>();
    const lim = (await planVoorTeam(DB, u.team_id)).limieten.leden;
    const bezet = await DB.prepare("SELECT COUNT(*) AS n FROM team_leden WHERE team_id = ? AND gebruiker_id != ?").bind(u.team_id, u.team_id).first<{ n: number }>();
    if (lim !== null && 1 + (bezet?.n ?? 0) >= lim) return { ok: false as const, message: "This team is full on its current plan. Ask the owner to upgrade." };
    if (!eigenaar) return { ok: false as const, message: "This team no longer exists." };
    if (await DB.prepare("SELECT id FROM gebruikers WHERE email = ?").bind(data.email).first()) {
      return { ok: false as const, message: "An account with this email address already exists." };
    }
    const r = await DB.prepare("INSERT INTO gebruikers (email, naam, bedrijf, wachtwoord, plan, status) VALUES (?, ?, ?, ?, ?, 'actief')")
      .bind(data.email, data.naam, eigenaar.bedrijf, await hashWachtwoord(data.wachtwoord), eigenaar.plan)
      .run();
    const id = Number(r.meta?.last_row_id);
    await DB.batch([
      DB.prepare("INSERT INTO team_leden (gebruiker_id, team_id, rol) VALUES (?, ?, 'lid')").bind(id, u.team_id),
      DB.prepare("UPDATE uitnodigingen SET gebruikt = 1 WHERE token = ?").bind(data.token),
    ]);
    await maakSessie(id);
    return { ok: true as const };
  });

// ── Agenda ──────────────────────────────────────────────
const tijd = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
export const maakAfspraak = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({ titel: z.string().trim().min(2).max(120), start: tijd, eind: tijd, locatie: z.string().trim().max(120).optional(), notitie: z.string().trim().max(1000).optional(), lead_id: z.number().int().optional() })
      .refine((a) => a.eind > a.start, "End time must be after start time")
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    if (data.lead_id) {
      const ok = await DB.prepare("SELECT id FROM klant_leads WHERE id = ? AND gebruiker_id = ?").bind(data.lead_id, g.team_id).first();
      if (!ok) return { ok: false, reden: "" };
    }
    // Never two appointments at the same time: checked and saved in one statement.
    const r = await DB.prepare(
      "INSERT INTO afspraken (team_id, lead_id, titel, start, eind, locatie, notitie) SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM afspraken WHERE team_id = ? AND voorbeeld = 0 AND start < ? AND eind > ?)",
    )
      .bind(g.team_id, data.lead_id ?? null, data.titel, data.start, data.eind, data.locatie ?? "", data.notitie ?? "", g.team_id, data.eind, data.start)
      .run();
    if (!r.meta?.changes) return { ok: false, reden: "There is already an appointment at this time. Pick another time." };
    if (data.lead_id) await DB.prepare("UPDATE klant_leads SET status = 'afspraak' WHERE id = ? AND status IN ('nieuw','opvolging','offerte')").bind(data.lead_id).run();
    return { ok: true, reden: "" };
  });

export const verwijderAfspraak = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int() }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    await DB.prepare("DELETE FROM afspraken WHERE id = ? AND team_id = ?").bind(data.id, g.team_id).run();
    return { ok: true };
  });

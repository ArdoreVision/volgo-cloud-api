import type { D1Database } from "@cloudflare/workers-types";

import { planVan } from "./plans";

/** The plan of a team (the owner's plan). */
export async function planVoorTeam(DB: D1Database, teamId: number) {
  const r = await DB.prepare("SELECT plan FROM gebruikers WHERE id = ?").bind(teamId).first<{ plan: string }>();
  return planVan(r?.plan);
}

/** Owner + members + open invitations. */
export async function aantalPlekken(DB: D1Database, teamId: number) {
  const [leden, open] = await Promise.all([
    DB.prepare("SELECT COUNT(*) AS n FROM team_leden WHERE team_id = ? AND gebruiker_id != ?").bind(teamId, teamId).first<{ n: number }>(),
    DB.prepare("SELECT COUNT(*) AS n FROM uitnodigingen WHERE team_id = ? AND gebruikt = 0 AND created_at > datetime('now', '-14 days')").bind(teamId).first<{ n: number }>(),
  ]);
  return 1 + (leden?.n ?? 0) + (open?.n ?? 0);
}

export class PlanLimiet extends Error {}

/** Volgo conversations started this calendar month (Amsterdam time is close enough to UTC month here). */
export async function gesprekkenDezeMaand(DB: D1Database, teamId: number) {
  const r = await DB.prepare("SELECT COUNT(*) AS n FROM ava_gesprekken WHERE team_id = ? AND voorbeeld = 0 AND gestart >= datetime('now', 'start of month')")
    .bind(teamId)
    .first<{ n: number }>();
  return r?.n ?? 0;
}

/** Over the monthly AI limit? Then Volgo keeps capturing leads in basic mode (no AI). */
export async function boveLimiet(DB: D1Database, teamId: number) {
  const plan = await planVoorTeam(DB, teamId);
  if (plan.limieten.gesprekken === null) return false;
  return (await gesprekkenDezeMaand(DB, teamId)) > plan.limieten.gesprekken;
}

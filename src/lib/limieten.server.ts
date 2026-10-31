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

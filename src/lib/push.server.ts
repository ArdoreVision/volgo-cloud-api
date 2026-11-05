import type { D1Database } from "@cloudflare/workers-types";

import { bindings } from "./bindings.server";

/** The AVA key on thevolgo.app itself: activity for this team is Volgo's own (the "shop"). */
const VOLGO_SLEUTEL = "c2c0abaa339e5c0a8c9e4064";

let volgoTeam: number | null | undefined;

/**
 * Push notification to the owner's phone via ntfy (app "ntfy", subscribe to the secret topic PUSH_TOPIC).
 * Never throws and never takes longer than 2.5 s, so it can't break or slow down a signup or a visit.
 */
export async function push(titel: string, tekst: string, opties: { tags?: string[]; prioriteit?: 1 | 2 | 3 | 4 | 5; link?: string } = {}) {
  const { PUSH_TOPIC } = bindings();
  if (!PUSH_TOPIC) return;
  try {
    await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: PUSH_TOPIC,
        title: titel.slice(0, 120),
        message: tekst.slice(0, 600),
        tags: opties.tags ?? [],
        priority: opties.prioriteit ?? 3,
        ...(opties.link ? { click: opties.link } : {}),
      }),
      signal: AbortSignal.timeout(2500),
    });
  } catch (err) {
    console.error("[push]", err);
  }
}

/** Is this team Volgo's own account (the one behind the chat on thevolgo.app)? */
export async function isVolgoZelf(DB: D1Database, team: number) {
  if (volgoTeam === undefined) {
    const r = await DB.prepare("SELECT team_id FROM ava_instellingen WHERE sleutel = ?").bind(VOLGO_SLEUTEL).first<{ team_id: number }>().catch(() => null);
    volgoTeam = r?.team_id ?? null;
  }
  return volgoTeam === team;
}

export function isVolgoSleutel(sleutel: string) {
  return sleutel === VOLGO_SLEUTEL;
}

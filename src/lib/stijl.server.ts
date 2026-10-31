import type { D1Database } from "@cloudflare/workers-types";
import { z } from "zod";

import { planVoorTeam } from "./limieten.server";

export const stijlSchema = z.object({
  avatar: z
    .string()
    .max(250_000)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
    .nullable(),
  positie: z.enum(["rechts", "links"]),
  thema: z.enum(["licht", "donker", "auto"]),
  vorm: z.enum(["rond", "zacht", "strak"]),
  lettertype: z.enum(["systeem", "website"]),
  knoptekst: z.string().trim().max(30),
  branding: z.boolean(),
  knop: z.enum(["pil", "bol", "icoon"]).default("pil"),
  grootte: z.enum(["compact", "normaal", "groot"]).default("normaal"),
  afstand: z.number().int().min(8).max(140).default(18),
  zij: z.number().int().min(8).max(60).default(18),
  uitnodiging: z.string().trim().max(90).default(""),
});
export type Stijl = z.infer<typeof stijlSchema>;

export const STANDAARD_STIJL: Stijl = {
  avatar: null, positie: "rechts", thema: "licht", vorm: "rond", lettertype: "systeem", knoptekst: "", branding: true,
  knop: "pil", grootte: "normaal", afstand: 18, zij: 18, uitnodiging: "",
};

/** The style a team has saved (null if none). */
export async function haalStijl(DB: D1Database, teamId: number): Promise<Stijl | null> {
  const r = await DB.prepare("SELECT avatar, positie, thema, vorm, lettertype, knoptekst, branding, knop, grootte, afstand, zij, uitnodiging FROM ava_stijl WHERE team_id = ?")
    .bind(teamId)
    .first<{ avatar: string | null; positie: string; thema: string; vorm: string; lettertype: string; knoptekst: string; branding: number; knop: string; grootte: string; afstand: number; zij: number; uitnodiging: string }>();
  if (!r) return null;
  const p = stijlSchema.safeParse({ ...r, branding: Boolean(r.branding) });
  return p.success ? p.data : null;
}

/** The style the widget should use: custom on Pro/Premium, Volgo default on Start. */
export async function actieveStijl(DB: D1Database, teamId: number): Promise<Stijl> {
  const plan = await planVoorTeam(DB, teamId);
  if (!plan.limieten.eigenStijl) return STANDAARD_STIJL;
  return (await haalStijl(DB, teamId)) ?? { ...STANDAARD_STIJL, branding: false };
}

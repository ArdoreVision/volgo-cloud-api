import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { huidigeGebruiker } from "../auth.server";
import { bindings } from "../bindings.server";
import { actieveGebruiker } from "../toegang.server";

/** Is er iemand ingelogd? Gebruikt om ingelogde gebruikers van de landingspagina naar hun home te sturen. */
export const isIngelogd = createServerFn({ method: "GET" }).handler(async () => {
  const g = await huidigeGebruiker().catch(() => null);
  return Boolean(g);
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

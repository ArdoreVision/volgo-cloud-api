import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { huidigeGebruiker } from "../auth.server";
import { bindings } from "../bindings.server";
import { PLANS, isPlan } from "../plans";

/** Only the Volgo owners (ADMIN_EMAILS in wrangler.jsonc) may use these. */
async function admin() {
  const g = await huidigeGebruiker().catch(() => null);
  const { DB, ADMIN_EMAILS } = bindings();
  const lijst = (ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!g || !DB || !lijst.includes(g.email.toLowerCase())) return null;
  return { g, DB };
}

export const isAdmin = createServerFn({ method: "GET" }).handler(async () => Boolean(await admin()));

export const haalAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const a = await admin();
  if (!a) return null;
  const { DB } = a;
  const [klanten, aanvragen] = await Promise.all([
    DB.prepare(
      `SELECT g.id, g.bedrijf, g.naam, g.email, g.plan, g.status, g.proef_tot, g.created_at, g.testmodus,
              (SELECT COUNT(*) FROM team_leden t WHERE t.team_id = g.id AND t.gebruiker_id != g.id) AS leden,
              (SELECT COUNT(*) FROM ava_gesprekken c WHERE c.team_id = g.id AND c.voorbeeld = 0 AND c.gestart >= datetime('now', 'start of month')) AS gesprekken,
              (SELECT COUNT(*) FROM klant_leads l WHERE l.gebruiker_id = g.id AND l.voorbeeld = 0) AS leads,
              (SELECT MAX(c.laatste) FROM ava_gesprekken c WHERE c.team_id = g.id AND c.voorbeeld = 0) AS laatst_actief
       FROM gebruikers g
       WHERE g.id NOT IN (SELECT gebruiker_id FROM team_leden WHERE gebruiker_id != team_id) AND g.status != 'verwijderd'
       ORDER BY g.created_at DESC LIMIT 500`,
    ).all<{
      id: number;
      bedrijf: string;
      naam: string;
      email: string;
      plan: string;
      status: string;
      proef_tot: string | null;
      created_at: string;
      testmodus: number;
      leden: number;
      gesprekken: number;
      leads: number;
      laatst_actief: string | null;
    }>(),
    DB.prepare(
      `SELECT w.id, w.team_id, w.created_at, w.contact, w.telefoon, w.domein, w.huidige_site, w.wensen, w.status, g.bedrijf, g.naam, g.email, g.plan
       FROM website_aanvragen w JOIN gebruikers g ON g.id = w.team_id ORDER BY w.id DESC LIMIT 200`,
    ).all<{
      id: number;
      team_id: number;
      created_at: string;
      contact: string;
      telefoon: string;
      domein: string;
      huidige_site: string;
      wensen: string;
      status: string;
      bedrijf: string;
      naam: string;
      email: string;
      plan: string;
    }>(),
  ]);
  const betalend = klanten.results.filter((k) => k.status === "actief" && !k.testmodus);
  const mrr = betalend.reduce((som, k) => som + (isPlan(k.plan) ? PLANS[k.plan].prijs : 0), 0) / 100;
  return {
    klanten: klanten.results,
    aanvragen: aanvragen.results,
    cijfers: {
      totaal: klanten.results.length,
      proef: klanten.results.filter((k) => k.status === "proef").length,
      actief: klanten.results.filter((k) => k.status === "actief").length,
      verlopen: klanten.results.filter((k) => k.status === "verlopen").length,
      mrr,
      openAanvragen: aanvragen.results.filter((w) => w.status !== "live").length,
    },
  };
});

export const zetAanvraagStatus = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int(), status: z.enum(["ontvangen", "in_gesprek", "in_aanbouw", "review", "live"]) }).parse(v))
  .handler(async ({ data }) => {
    const a = await admin();
    if (!a) return { ok: false };
    await a.DB.prepare("UPDATE website_aanvragen SET status = ? WHERE id = ?").bind(data.status, data.id).run();
    return { ok: true };
  });

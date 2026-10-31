import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { bindings } from "../bindings.server";
import { actieveGebruiker } from "../toegang.server";

/** Website analytics for the dashboard: visitors, pages, sources, devices, countries and how many become leads. */
export const haalVerkeer = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ dagen: z.number().int().min(1).max(90) }).parse(v))
  .handler(async ({ data }) => {
    const g = await actieveGebruiker();
    const { DB } = bindings();
    if (!DB) throw new Error("Database unavailable.");
    const team = g.team_id;
    const { planVoorTeam } = await import("../limieten.server");
    const max = (await planVoorTeam(DB, team)).limieten.analyticsDagen;
    const dagen = Math.min(data.dagen, max);
    const van = `-${dagen - 1} days`;
    const vorigVan = `-${dagen * 2 - 1} days`;
    const w = "team_id = ? AND dag >= date('now', ?)";

    const [tot, vorig, perDag, paginas, bronnen, apparaten, landen, events, leads, live] = await Promise.all([
      DB.prepare(
        `SELECT COUNT(*) AS views, COUNT(DISTINCT bezoeker) AS bezoekers, COUNT(DISTINCT sessie) AS sessies,
                COALESCE(SUM(duur), 0) AS duur, COALESCE(AVG(NULLIF(scroll, 0)), 0) AS scroll
         FROM site_views WHERE ${w}`,
      )
        .bind(team, van)
        .first<{ views: number; bezoekers: number; sessies: number; duur: number; scroll: number }>(),
      DB.prepare(`SELECT COUNT(DISTINCT bezoeker) AS bezoekers, COUNT(*) AS views FROM site_views WHERE team_id = ? AND dag >= date('now', ?) AND dag < date('now', ?)`)
        .bind(team, vorigVan, van)
        .first<{ bezoekers: number; views: number }>(),
      DB.prepare(`SELECT dag, COUNT(DISTINCT bezoeker) AS bezoekers, COUNT(*) AS views FROM site_views WHERE ${w} GROUP BY dag ORDER BY dag`)
        .bind(team, van)
        .all<{ dag: string; bezoekers: number; views: number }>(),
      DB.prepare(
        `SELECT pad, MAX(titel) AS titel, COUNT(*) AS views, CAST(AVG(duur) AS INTEGER) AS duur, CAST(AVG(scroll) AS INTEGER) AS scroll
         FROM site_views WHERE ${w} GROUP BY pad ORDER BY views DESC LIMIT 8`,
      )
        .bind(team, van)
        .all<{ pad: string; titel: string | null; views: number; duur: number; scroll: number }>(),
      DB.prepare(`SELECT COALESCE(bron, 'Direct') AS naam, COUNT(DISTINCT sessie) AS n FROM site_views WHERE ${w} GROUP BY naam ORDER BY n DESC LIMIT 8`)
        .bind(team, van)
        .all<{ naam: string; n: number }>(),
      DB.prepare(`SELECT COALESCE(apparaat, 'Desktop') AS naam, COUNT(DISTINCT sessie) AS n FROM site_views WHERE ${w} GROUP BY naam ORDER BY n DESC`)
        .bind(team, van)
        .all<{ naam: string; n: number }>(),
      DB.prepare(`SELECT COALESCE(NULLIF(land, ''), '??') AS naam, COUNT(DISTINCT sessie) AS n FROM site_views WHERE ${w} GROUP BY naam ORDER BY n DESC LIMIT 8`)
        .bind(team, van)
        .all<{ naam: string; n: number }>(),
      DB.prepare(`SELECT soort, COUNT(DISTINCT sessie) AS n FROM site_events WHERE ${w} GROUP BY soort`)
        .bind(team, van)
        .all<{ soort: string; n: number }>(),
      DB.prepare("SELECT COUNT(*) AS n FROM klant_leads WHERE gebruiker_id = ? AND voorbeeld = 0 AND kanaal = 'Website-chat' AND date(created_at) >= date('now', ?)")
        .bind(team, van)
        .first<{ n: number }>(),
      DB.prepare("SELECT COUNT(DISTINCT sessie) AS n FROM site_views WHERE team_id = ? AND created_at >= datetime('now', '-5 minutes')")
        .bind(team)
        .first<{ n: number }>(),
    ]);

    // Sessions with a single page view and under 10 seconds count as a bounce.
    const stuiter = await DB.prepare(
      `SELECT COUNT(*) AS n FROM (SELECT sessie FROM site_views WHERE ${w} GROUP BY sessie HAVING COUNT(*) = 1 AND SUM(duur) < 10)`,
    )
      .bind(team, van)
      .first<{ n: number }>();

    const ev = Object.fromEntries(events.results.map((e) => [e.soort, e.n]));
    const t = tot ?? { views: 0, bezoekers: 0, sessies: 0, duur: 0, scroll: 0 };
    return {
      dagen,
      max,
      bezoekers: t.bezoekers,
      vorigeBezoekers: vorig?.bezoekers ?? 0,
      views: t.views,
      vorigeViews: vorig?.views ?? 0,
      sessies: t.sessies,
      tijdPerBezoek: t.sessies ? Math.round(t.duur / t.sessies) : 0,
      scroll: Math.round(t.scroll),
      stuiter: t.sessies ? Math.round(((stuiter?.n ?? 0) / t.sessies) * 100) : 0,
      live: live?.n ?? 0,
      perDag: perDag.results,
      paginas: paginas.results,
      bronnen: bronnen.results,
      apparaten: apparaten.results,
      landen: landen.results,
      chatOpen: ev.chat_open ?? 0,
      chatBericht: ev.chat_bericht ?? 0,
      agendaOpen: ev.agenda_open ?? 0,
      geboekt: ev.geboekt ?? 0,
      leads: leads?.n ?? 0,
    };
  });

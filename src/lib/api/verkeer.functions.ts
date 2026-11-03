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

    // With the visitor's permission: city/region, browser, system, language, returning visitors, and who is on the site right now.
    const metOk = `${w} AND toestemming = 1`;
    const [steden, browsers, systemen, talen, ok, terug, nuOp] = await Promise.all([
      DB.prepare(`SELECT stad, regio, land, COUNT(DISTINCT sessie) AS n FROM site_views WHERE ${metOk} AND stad IS NOT NULL GROUP BY stad, regio, land ORDER BY n DESC LIMIT 10`)
        .bind(team, van)
        .all<{ stad: string; regio: string | null; land: string | null; n: number }>(),
      DB.prepare(`SELECT browser AS naam, COUNT(DISTINCT sessie) AS n FROM site_views WHERE ${metOk} AND browser IS NOT NULL GROUP BY naam ORDER BY n DESC LIMIT 6`)
        .bind(team, van)
        .all<{ naam: string; n: number }>(),
      DB.prepare(`SELECT os AS naam, COUNT(DISTINCT sessie) AS n FROM site_views WHERE ${metOk} AND os IS NOT NULL GROUP BY naam ORDER BY n DESC LIMIT 6`)
        .bind(team, van)
        .all<{ naam: string; n: number }>(),
      DB.prepare(`SELECT substr(taal, 1, 2) AS naam, COUNT(DISTINCT sessie) AS n FROM site_views WHERE ${metOk} AND taal IS NOT NULL GROUP BY naam ORDER BY n DESC LIMIT 6`)
        .bind(team, van)
        .all<{ naam: string; n: number }>(),
      DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN toestemming = 1 THEN sessie END) AS ja, COUNT(DISTINCT sessie) AS alle FROM site_views WHERE ${w}`)
        .bind(team, van)
        .first<{ ja: number; alle: number }>(),
      DB.prepare(`SELECT COUNT(*) AS n FROM (SELECT vast FROM site_views WHERE ${metOk} AND vast IS NOT NULL GROUP BY vast HAVING COUNT(DISTINCT dag) > 1)`)
        .bind(team, van)
        .first<{ n: number }>(),
      DB.prepare(
        `SELECT sessie, MAX(created_at) AS laatst, MAX(stad) AS stad, MAX(land) AS land, MAX(apparaat) AS apparaat, MAX(bron) AS bron,
                (SELECT pad FROM site_views v2 WHERE v2.team_id = v.team_id AND v2.sessie = v.sessie ORDER BY v2.id DESC LIMIT 1) AS pad, COUNT(*) AS paginas
         FROM site_views v WHERE team_id = ? AND created_at >= datetime('now', '-5 minutes') GROUP BY sessie ORDER BY laatst DESC LIMIT 12`,
      )
        .bind(team)
        .all<{ sessie: string; laatst: string; stad: string | null; land: string | null; apparaat: string | null; bron: string | null; pad: string; paginas: number }>(),
    ]);

    // Ads: every session is attributed to the ad of its first page view (campaign / ad set / ad / placement from the landing URL).
    const eersteView = `(SELECT sessie, MIN(id) AS id FROM site_views WHERE team_id = ? AND dag >= date('now', ?) GROUP BY sessie)`;
    const adWhere = "(v.campagne IS NOT NULL OR v.advertentie IS NOT NULL OR v.adset IS NOT NULL)";
    const [adSessies, adEvents, adLeads, adVragen, adPlaatsing, adPubliek] = await Promise.all([
      DB.prepare(
        `SELECT COALESCE(v.campagne, '') AS campagne, COALESCE(v.adset, '') AS adset, COALESCE(v.advertentie, '') AS advertentie, COALESCE(v.bron, '') AS bron,
                COUNT(DISTINCT v.sessie) AS sessies, COUNT(DISTINCT v.bezoeker) AS bezoekers,
                CAST(AVG(s.duur) AS INTEGER) AS duur, CAST(AVG(s.scroll) AS INTEGER) AS scroll,
                SUM(CASE WHEN v.apparaat = 'Mobile' THEN 1 ELSE 0 END) AS mobiel
         FROM ${eersteView} f JOIN site_views v ON v.id = f.id
         JOIN (SELECT sessie, SUM(duur) AS duur, MAX(scroll) AS scroll FROM site_views WHERE team_id = ? AND dag >= date('now', ?) GROUP BY sessie) s ON s.sessie = v.sessie
         WHERE ${adWhere} GROUP BY 1, 2, 3, 4 ORDER BY sessies DESC LIMIT 60`,
      )
        .bind(team, van, team, van)
        .all<{ campagne: string; adset: string; advertentie: string; bron: string; sessies: number; bezoekers: number; duur: number; scroll: number; mobiel: number }>(),
      DB.prepare(
        `SELECT COALESCE(v.campagne, '') AS campagne, COALESCE(v.adset, '') AS adset, COALESCE(v.advertentie, '') AS advertentie, e.soort, COUNT(DISTINCT e.sessie) AS n
         FROM site_events e JOIN ${eersteView} f ON f.sessie = e.sessie JOIN site_views v ON v.id = f.id
         WHERE e.team_id = ? AND ${adWhere} GROUP BY 1, 2, 3, 4`,
      )
        .bind(team, van, team)
        .all<{ campagne: string; adset: string; advertentie: string; soort: string; n: number }>(),
      DB.prepare(
        `SELECT COALESCE(v.campagne, '') AS campagne, COALESCE(v.adset, '') AS adset, COALESCE(v.advertentie, '') AS advertentie, COUNT(DISTINCT m.lead_id) AS n
         FROM ava_gesprek_meta m JOIN ava_gesprekken g ON g.id = m.gesprek_id JOIN ${eersteView} f ON f.sessie = m.sessie JOIN site_views v ON v.id = f.id
         WHERE g.team_id = ? AND g.voorbeeld = 0 AND m.lead_id IS NOT NULL AND ${adWhere} GROUP BY 1, 2, 3`,
      )
        .bind(team, van, team)
        .all<{ campagne: string; adset: string; advertentie: string; n: number }>(),
      DB.prepare(
        `SELECT COALESCE(v.advertentie, v.adset, v.campagne, '') AS advertentie, g.onderwerp, g.warmte, g.laatste, (m.lead_id IS NOT NULL) AS lead
         FROM ava_gesprekken g JOIN ava_gesprek_meta m ON m.gesprek_id = g.id JOIN ${eersteView} f ON f.sessie = m.sessie JOIN site_views v ON v.id = f.id
         WHERE g.team_id = ? AND g.voorbeeld = 0 AND ${adWhere} ORDER BY g.id DESC LIMIT 40`,
      )
        .bind(team, van, team)
        .all<{ advertentie: string; onderwerp: string; warmte: number; laatste: string; lead: number }>(),
      DB.prepare(
        `SELECT COALESCE(v.plaatsing, 'Unknown') AS naam, COUNT(DISTINCT v.sessie) AS n FROM ${eersteView} f JOIN site_views v ON v.id = f.id WHERE ${adWhere} GROUP BY 1 ORDER BY n DESC LIMIT 8`,
      )
        .bind(team, van)
        .all<{ naam: string; n: number }>(),
      DB.prepare(
        `SELECT COALESCE(NULLIF(v.land, ''), '??') AS land, COALESCE(v.stad, '') AS stad, COUNT(DISTINCT v.sessie) AS n
         FROM ${eersteView} f JOIN site_views v ON v.id = f.id WHERE ${adWhere} GROUP BY 1, 2 ORDER BY n DESC LIMIT 10`,
      )
        .bind(team, van)
        .all<{ land: string; stad: string; n: number }>(),
    ]);
    const sleutel = (a: { campagne: string; adset: string; advertentie: string }) => `${a.campagne}|${a.adset}|${a.advertentie}`;
    const evMap = new Map<string, Record<string, number>>();
    for (const e of adEvents.results) {
      const k = sleutel(e);
      evMap.set(k, { ...(evMap.get(k) ?? {}), [e.soort]: e.n });
    }
    const leadMap = new Map(adLeads.results.map((l) => [sleutel(l), l.n]));
    const advertenties = adSessies.results.map((a) => {
      const ev = evMap.get(sleutel(a)) ?? {};
      return { ...a, chatOpen: ev.chat_open ?? 0, chatBericht: ev.chat_bericht ?? 0, geboekt: ev.geboekt ?? 0, leads: leadMap.get(sleutel(a)) ?? 0 };
    });

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
      steden: steden.results,
      browsers: browsers.results,
      systemen: systemen.results,
      talen: talen.results,
      toestemmingPct: ok?.alle ? Math.round((ok.ja / ok.alle) * 100) : 0,
      terugkerend: terug?.n ?? 0,
      nuOp: nuOp.results,
      advertenties,
      adPlaatsingen: adPlaatsing.results,
      adPubliek: adPubliek.results,
      adVragen: adVragen.results,
    };
  });

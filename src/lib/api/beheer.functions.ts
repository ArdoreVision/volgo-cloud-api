// Owner dashboard: Damien manages every customer's Volgo from his own account. Only for ADMIN_EMAILS.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { PLANS, isPlan } from "../plans";

async function eigenaar() {
  const { huidigeGebruiker } = await import("../auth.server");
  const { bindings } = await import("../bindings.server");
  const g = await huidigeGebruiker().catch(() => null);
  const { DB, ADMIN_EMAILS } = bindings();
  const lijst = (ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!g || !DB || !lijst.includes(g.email.toLowerCase())) throw new Error("Only the Volgo owner can do this.");
  return { g, DB, bindings };
}
async function inst(DB: DB, id: number) {
  const { instellingenVoorTeam } = await import("../ava.server");
  return instellingenVoorTeam(DB, id);
}
type DB = Awaited<ReturnType<typeof eigenaar>>["DB"];

const SOORTEN = ["bellen", "langs", "chat", "kantoor", "insta"] as const;

/** Everything the owner can change for a customer. All fields optional, so the AI can change just one thing. */
const instellingSchema = z.object({
  naam: z.string().trim().min(1).max(30).optional(),
  begroeting: z.string().trim().min(5).max(300).optional(),
  bedrijfsinfo: z.string().trim().max(4000).optional(),
  vragen: z.string().trim().max(1200).optional(),
  kleur: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  site_url: z.union([z.literal(""), z.string().trim().max(300).regex(/^https:\/\/[^\s]+$/)]).optional(),
  boeken: z.boolean().optional(),
  open_dagen: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  open_van: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  open_tot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  afspraak_duur: z.number().int().min(15).max(240).optional(),
  afspraak_soorten: z.array(z.enum(SOORTEN)).min(1).max(5).optional(),
  tijdzone: z.string().trim().min(3).max(60).optional(),
});
type Instelling = z.infer<typeof instellingSchema>;

async function bestaatKlant(DB: DB, id: number) {
  const k = await DB.prepare("SELECT id FROM gebruikers WHERE id = ? AND status != 'verwijderd'").bind(id).first();
  if (!k) throw new Error("Customer not found.");
}

async function pasAan(DB: DB, id: number, w: Instelling) {
  await inst(DB, id);
  const sets: string[] = [];
  const waarden: (string | number)[] = [];
  const zet = (kolom: string, v: string | number) => {
    sets.push(`${kolom} = ?`);
    waarden.push(v);
  };
  if (w.naam !== undefined) zet("naam", w.naam);
  if (w.begroeting !== undefined) zet("begroeting", w.begroeting);
  if (w.bedrijfsinfo !== undefined) zet("bedrijfsinfo", w.bedrijfsinfo);
  if (w.vragen !== undefined)
    zet(
      "vragen",
      w.vragen
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 10)
        .join("\n"),
    );
  if (w.kleur !== undefined) zet("kleur", w.kleur);
  if (w.site_url !== undefined) zet("site_url", w.site_url);
  if (w.boeken !== undefined) zet("boeken", w.boeken ? 1 : 0);
  if (w.open_dagen !== undefined) zet("open_dagen", [...new Set(w.open_dagen)].sort().join(","));
  if (w.open_van !== undefined) zet("open_van", w.open_van);
  if (w.open_tot !== undefined) zet("open_tot", w.open_tot);
  if (w.afspraak_duur !== undefined) zet("afspraak_duur", w.afspraak_duur);
  if (w.afspraak_soorten !== undefined) zet("afspraak_soorten", [...new Set(w.afspraak_soorten)].join(","));
  if (w.tijdzone !== undefined) zet("tijdzone", w.tijdzone);
  if (!sets.length) return [];
  await DB.prepare(`UPDATE ava_instellingen SET ${sets.join(", ")} WHERE team_id = ?`)
    .bind(...waarden, id)
    .run();
  return Object.keys(w).filter((k) => (w as Record<string, unknown>)[k] !== undefined);
}

/** What might be wrong with a customer's Volgo, in plain words. */
function problemen(k: {
  status: string;
  proef_tot: string | null;
  site_url: string;
  bedrijfsinfo: string;
  vragen: string;
  boeken: number;
  gesprekken: number;
  laatst: string | null;
  profiel: string;
}) {
  const p: { ernst: "rood" | "oranje"; tekst: string }[] = [];
  if (k.status === "verlopen") p.push({ ernst: "rood", tekst: "Subscription expired: the dashboard is locked and the chat is off." });
  if (k.status === "proef" && k.proef_tot) {
    const dagen = (new Date(k.proef_tot.replace(" ", "T") + "Z").getTime() - Date.now()) / 86400000;
    if (dagen <= 2) p.push({ ernst: "oranje", tekst: `Trial ends in ${Math.max(0, Math.ceil(dagen))} day(s).` });
  }
  if (!k.site_url) p.push({ ernst: "oranje", tekst: "No website address saved yet." });
  if (!k.gesprekken) p.push({ ernst: "rood", tekst: "No real chats yet: check that the install code is on the website." });
  else if (k.laatst && Date.now() - new Date(k.laatst.replace(" ", "T") + "Z").getTime() > 14 * 86400000)
    p.push({ ernst: "oranje", tekst: "No chats in the last 14 days: the chat may have disappeared from the website." });
  if (!k.bedrijfsinfo.trim()) p.push({ ernst: "oranje", tekst: "No business information: the assistant knows little about services, area and prices." });
  if (!k.vragen.trim()) p.push({ ernst: "oranje", tekst: "No questions set: the assistant doesn't know what to ask before an appointment." });
  if (!k.boeken) p.push({ ernst: "oranje", tekst: "Appointment booking is switched off." });
  if (!k.profiel) p.push({ ernst: "oranje", tekst: "The 5 start questions have not been answered yet." });
  return p;
}

async function laadKlant(DB: DB, id: number) {
  const g = await DB.prepare("SELECT id, bedrijf, naam, email, plan, status, proef_tot, created_at, testmodus FROM gebruikers WHERE id = ?")
    .bind(id)
    .first<{ id: number; bedrijf: string; naam: string; email: string; plan: string; status: string; proef_tot: string | null; created_at: string; testmodus: number }>();
  if (!g) throw new Error("Customer not found.");
  const i = await inst(DB, id);
  const extra = await DB.prepare("SELECT site_url FROM ava_instellingen WHERE team_id = ?").bind(id).first<{ site_url: string }>();
  const [gesprekken, afspraken, leads, telling] = await Promise.all([
    DB.prepare("SELECT id, bezoeker, onderwerp, status, gestart, laatste, berichten, warmte FROM ava_gesprekken WHERE team_id = ? AND voorbeeld = 0 ORDER BY laatste DESC LIMIT 25")
      .bind(id)
      .all<{ id: number; bezoeker: string; onderwerp: string; status: string; gestart: string; laatste: string; berichten: number; warmte: number }>(),
    DB.prepare("SELECT id, titel, start, eind, locatie, notitie FROM afspraken WHERE team_id = ? AND voorbeeld = 0 ORDER BY start DESC LIMIT 25")
      .bind(id)
      .all<{ id: number; titel: string; start: string; eind: string; locatie: string | null; notitie: string | null }>(),
    DB.prepare("SELECT id, created_at, naam, onderwerp, status, notitie FROM klant_leads WHERE gebruiker_id = ? AND voorbeeld = 0 ORDER BY id DESC LIMIT 25")
      .bind(id)
      .all<{ id: number; created_at: string; naam: string; onderwerp: string; status: string; notitie: string }>(),
    DB.prepare("SELECT COUNT(*) AS n, MAX(laatste) AS laatst FROM ava_gesprekken WHERE team_id = ? AND voorbeeld = 0").bind(id).first<{ n: number; laatst: string | null }>(),
  ]);
  const site_url = extra?.site_url ?? "";
  return {
    klant: { ...g, planNaam: isPlan(g.plan) ? PLANS[g.plan].naam : g.plan },
    inst: {
      sleutel: i.sleutel,
      naam: i.naam,
      begroeting: i.begroeting,
      bedrijfsinfo: i.bedrijfsinfo,
      vragen: i.vragen ?? "",
      kleur: i.kleur,
      site_url,
      boeken: Boolean(i.boeken),
      open_dagen: i.open_dagen.split(",").filter(Boolean).map(Number),
      open_van: i.open_van,
      open_tot: i.open_tot,
      afspraak_duur: i.afspraak_duur,
      afspraak_soorten: i.afspraak_soorten.split(",").filter(Boolean),
      tijdzone: i.tijdzone,
    },
    gesprekken: gesprekken.results,
    afspraken: afspraken.results,
    leads: leads.results,
    problemen: problemen({
      status: g.status,
      proef_tot: g.proef_tot,
      site_url,
      bedrijfsinfo: i.bedrijfsinfo,
      vragen: i.vragen ?? "",
      boeken: i.boeken,
      gesprekken: telling?.n ?? 0,
      laatst: telling?.laatst ?? null,
      profiel: i.profiel,
    }),
  };
}

export const haalKlant = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ id: z.number().int().positive() }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = await eigenaar();
    return laadKlant(DB, data.id);
  });

export const bewaarKlant = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int().positive(), w: instellingSchema }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = await eigenaar();
    await bestaatKlant(DB, data.id);
    if (data.w.open_van && data.w.open_tot && data.w.open_van >= data.w.open_tot) return { ok: false as const, message: "Opening time must be before closing time." };
    await pasAan(DB, data.id, data.w);
    return { ok: true as const, message: "" };
  });

export const haalKlantGesprek = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ id: z.number().int().positive(), gesprek: z.number().int().positive() }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = await eigenaar();
    const eigen = await DB.prepare("SELECT id FROM ava_gesprekken WHERE id = ? AND team_id = ?").bind(data.gesprek, data.id).first();
    if (!eigen) return [];
    const r = await DB.prepare("SELECT id, rol, tekst, created_at FROM ava_berichten WHERE gesprek_id = ? ORDER BY id LIMIT 200")
      .bind(data.gesprek)
      .all<{ id: number; rol: string; tekst: string; created_at: string }>();
    return r.results;
  });

// ── Websites hosted in Volgo ───────────────────────────────────────
const sitesLib = () => import("../sites.server");
const b64 = (s: string) => Uint8Array.from(atob(s.replace(/^data:[^,]*,/, "")), (c) => c.charCodeAt(0));

async function siteVan(DB: DB, id: number) {
  const L = await sitesLib();
  const site = await L.siteVoorTeam(DB, id);
  if (!site) throw new Error("This customer has no website in Volgo yet.");
  return { L, site };
}

export const haalWebsiteBeheer = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ id: z.number().int().positive() }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = await eigenaar();
    const L = await sitesLib();
    const site = await L.siteVoorTeam(DB, data.id);
    if (!site) return { site: null };
    const concept = await L.versie(DB, site.concept_versie);
    const controle = await DB.prepare("SELECT created_at, ok, details FROM site_controles WHERE site_id = ? ORDER BY id DESC LIMIT 1")
      .bind(site.id)
      .first<{ created_at: string; ok: number; details: string }>();
    return {
      site,
      liveUrl: L.liveUrl(site),
      tijdelijkUrl: `https://${site.slug}.${L.SITE_HOST}`,
      voorbeeld: concept ? L.voorbeeldUrl(concept.token) : null,
      conceptNummer: concept?.nummer ?? null,
      bestanden: concept
        ? Object.entries(concept.manifest)
            .map(([pad, f]) => ({ pad, grootte: f.grootte }))
            .sort((a, b) => a.pad.localeCompare(b.pad))
        : [],
      versies: await L.versies(DB, site.id),
      controle: controle ? { ...controle, punten: JSON.parse(controle.details) as { ernst: string; tekst: string }[] } : null,
    };
  });

export const maakWebsiteBeheer = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int().positive() }).parse(v))
  .handler(async ({ data }) => {
    const { DB, g } = await eigenaar();
    await bestaatKlant(DB, data.id);
    const b = await DB.prepare("SELECT bedrijf FROM gebruikers WHERE id = ?").bind(data.id).first<{ bedrijf: string }>();
    await (await sitesLib()).maakSite(DB, data.id, b?.bedrijf || "Website", g.naam);
    return { ok: true as const };
  });

export const importeerWebsite = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({ id: z.number().int().positive(), url: z.string().trim().max(300).optional(), zip: z.string().max(30_000_000).optional() })
      .refine((x) => Boolean(x.url) !== Boolean(x.zip), "Give a web address or a zip.")
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { DB, g } = await eigenaar();
    await bestaatKlant(DB, data.id);
    const L = await sitesLib();
    const b = await DB.prepare("SELECT bedrijf FROM gebruikers WHERE id = ?").bind(data.id).first<{ bedrijf: string }>();
    const site = await L.maakSite(DB, data.id, b?.bedrijf || "Website", g.naam);
    try {
      const bestanden = data.url ? await L.haalWebsiteOp(data.url) : await L.uitZip(b64(data.zip!));
      const v = await L.schrijf(DB, site, bestanden, [], g.naam, data.url ? `Imported from ${data.url}` : "Imported from zip", {});
      return { ok: true as const, message: `Imported ${bestanden.length} files as version ${v.nummer}.` };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : "Import failed." };
    }
  });

export const uploadSiteBestand = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int().positive(), naam: z.string().trim().min(1).max(120), data: z.string().max(8_000_000) }).parse(v))
  .handler(async ({ data }) => {
    const { DB, g } = await eigenaar();
    const { L, site } = await siteVan(DB, data.id);
    const schoon = data.naam
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, "-")
      .replace(/^-+/, "");
    const pad = `images/${schoon}`;
    if (!L.normPad(pad)) return { ok: false as const, message: "Use a png, jpg, webp, gif, svg or mp4 file." };
    try {
      await L.schrijf(DB, site, [{ pad, data: b64(data.data) }], [], g.naam, `Uploaded ${pad}`);
      return { ok: true as const, message: `Uploaded as ${pad}. Ask Claude to use it.`, pad };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : "Upload failed." };
    }
  });

export const websiteActie = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .discriminatedUnion("actie", [
        z.object({ id: z.number().int().positive(), actie: z.literal("publiceer"), versie: z.number().int().positive().optional() }),
        z.object({ id: z.number().int().positive(), actie: z.literal("terug"), versie: z.number().int().positive() }),
        z.object({ id: z.number().int().positive(), actie: z.literal("aanuit"), aan: z.boolean() }),
        z.object({ id: z.number().int().positive(), actie: z.literal("domein"), domein: z.string().trim().max(120) }),
        z.object({ id: z.number().int().positive(), actie: z.literal("domeincheck") }),
        z.object({ id: z.number().int().positive(), actie: z.literal("controleer") }),
      ])
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { DB } = await eigenaar();
    const { L, site } = await siteVan(DB, data.id);
    try {
      if (data.actie === "publiceer") {
        const v = data.versie ?? site.concept_versie;
        if (!v) return { ok: false as const, message: "Nothing to publish yet." };
        await L.publiceer(DB, site, v);
        return { ok: true as const, message: "Published. Visitors see it now." };
      }
      if (data.actie === "terug") {
        await L.zetTerug(DB, site, data.versie);
        return { ok: true as const, message: "Back to that version. It is live again." };
      }
      if (data.actie === "aanuit") {
        await DB.prepare("UPDATE klant_sites SET status = ? WHERE id = ?").bind(data.aan ? (site.live_versie ? "live" : "concept") : "uit", site.id).run();
        return { ok: true as const, message: data.aan ? "Website is on." : "Website is off." };
      }
      if (data.actie === "domein") {
        await L.koppelDomein(DB, site, data.domein);
        return { ok: true as const, message: `Linked. Ask the customer to point the domain (CNAME) to ${L.SITE_HOST}.` };
      }
      if (data.actie === "domeincheck") {
        const s = await L.verversDomein(DB, site);
        return { ok: true as const, message: s === "actief" ? "Domain and certificate are active." : s === "ssl" ? "DNS is right, the certificate is being made." : s === "wacht" ? "Waiting for the DNS change." : `Status: ${s}` };
      }
      const c = await L.controleerLive(DB, site);
      return { ok: true as const, message: c.punten.map((p) => p.tekst).join(" ") };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : "That didn't work." };
    }
  });

/** A new website made by Claude from a short description, saved as a concept version. */
export const nieuweWebsite = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ id: z.number().int().positive(), omschrijving: z.string().trim().min(10).max(3000) }).parse(v))
  .handler(async ({ data }) => {
    const { DB, g, bindings: b } = await eigenaar();
    const { ANTHROPIC_API_KEY, SITE_MODEL } = b();
    if (!ANTHROPIC_API_KEY) return { ok: false as const, message: "The AI key is not set up on the server." };
    await bestaatKlant(DB, data.id);
    const k = await DB.prepare("SELECT bedrijf FROM gebruikers WHERE id = ?").bind(data.id).first<{ bedrijf: string }>();
    const L = await sitesLib();
    const site = await L.maakSite(DB, data.id, k?.bedrijf || "Website", g.naam);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: SITE_MODEL || "claude-sonnet-5-5",
        max_tokens: 20000,
        system:
          "You build premium one-page business websites. Return ONLY the complete index.html, nothing else: no explanation, no code fences. One file with inline CSS and a little vanilla JS. Modern, fast, mobile-first, lots of white space, a strong hero, clear sections (services, how it works, reviews placeholder, area, contact), smooth scroll and subtle scroll-in animations (IntersectionObserver, respecting prefers-reduced-motion). Use system fonts or one Google Font. Real, natural copy in the language of the description. Include <title> and a meta description. No external images: use CSS gradients or simple inline SVG. Do not add any chat widget; it is added automatically.",
        messages: [{ role: "user", content: `Business: ${k?.bedrijf ?? ""}\n\n${data.omschrijving}` }],
      }),
    });
    if (!res.ok) return { ok: false as const, message: `The AI didn't answer (${res.status}).` };
    const j = (await res.json()) as { content: { type: string; text?: string }[] };
    let html = j.content.map((c) => c.text ?? "").join("").trim();
    html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "");
    if (!/<html[\s>]/i.test(html)) return { ok: false as const, message: "The AI didn't return a website. Try again with a bit more detail." };
    const v = await L.schrijf(DB, site, [{ pad: "index.html", data: new TextEncoder().encode(html) }], [], g.naam, "New website by Claude");
    return { ok: true as const, message: `Made version ${v.nummer}. Check the preview, then publish.` };
  });

export const haalBeheerChat = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ id: z.number().int().positive() }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = await eigenaar();
    const r = await DB.prepare("SELECT rol, tekst, gewijzigd FROM (SELECT * FROM site_chat WHERE team_id = ? ORDER BY id DESC LIMIT 40) ORDER BY id")
      .bind(data.id)
      .all<{ rol: string; tekst: string; gewijzigd: string }>();
    return r.results.map((x) => ({ rol: x.rol === "ik" ? ("ik" as const) : ("ai" as const), tekst: x.tekst, gewijzigd: x.gewijzigd ? x.gewijzigd.split(",") : [] }));
  });

// ── The AI helper in the owner dashboard ───────────────────────────
const TOOLS = [
  {
    name: "instellingen_wijzigen",
    description:
      "Change this customer's Volgo chat and calendar settings. Only include the fields you change. vragen: one question per line. open_dagen: 0=Sunday … 6=Saturday. afspraak_soorten: bellen (phone call), langs (visit at their address), chat (chat appointment), kantoor (at the office), insta (Instagram DM).",
    input_schema: {
      type: "object",
      properties: {
        naam: { type: "string" },
        begroeting: { type: "string" },
        bedrijfsinfo: { type: "string", description: "Everything the assistant should know: services, area, prices, opening hours. Replaces the old text, so include what should stay." },
        vragen: { type: "string" },
        kleur: { type: "string", description: "Hex colour like #1f6feb" },
        site_url: { type: "string", description: "https://… or empty" },
        boeken: { type: "boolean" },
        open_dagen: { type: "array", items: { type: "integer" } },
        open_van: { type: "string", description: "HH:MM" },
        open_tot: { type: "string", description: "HH:MM" },
        afspraak_duur: { type: "integer", description: "Minutes" },
        afspraak_soorten: { type: "array", items: { type: "string", enum: [...SOORTEN] } },
        tijdzone: { type: "string" },
      },
    },
  },
  {
    name: "gesprek_lezen",
    description: "Read the full messages of one of this customer's chats, to see what went wrong or what a visitor asked.",
    input_schema: { type: "object", properties: { gesprek_id: { type: "integer" } }, required: ["gesprek_id"] },
  },
];
const SITE_TOOLS = [
  { name: "bestanden_lijst", description: "All files of the concept version of the website, with sizes in bytes.", input_schema: { type: "object", properties: {} } },
  { name: "bestand_lezen", description: "Read one text file (html, css, js, json, svg, txt, xml) of the concept version.", input_schema: { type: "object", properties: { pad: { type: "string" } }, required: ["pad"] } },
  {
    name: "bestand_vervangen",
    description: "Targeted edit: replace an exact piece of text in a file with new text. Prefer this for small changes. The old text must occur exactly once.",
    input_schema: { type: "object", properties: { pad: { type: "string" }, oud: { type: "string" }, nieuw: { type: "string" } }, required: ["pad", "oud", "nieuw"] },
  },
  {
    name: "bestand_schrijven",
    description: "Write a whole text file (new or replacing the old one). Use for new pages or full rewrites. Saves a new concept version.",
    input_schema: { type: "object", properties: { pad: { type: "string", description: "e.g. index.html, tuinonderhoud/index.html, css/site.css" }, inhoud: { type: "string" } }, required: ["pad", "inhoud"] },
  },
  { name: "bestand_verwijderen", description: "Delete a file from the concept version.", input_schema: { type: "object", properties: { pad: { type: "string" } }, required: ["pad"] } },
  { name: "zoeken", description: "Find which text files of the concept version contain a piece of text.", input_schema: { type: "object", properties: { tekst: { type: "string" } }, required: ["tekst"] } },
  { name: "controleren", description: "Check the concept version: broken links, missing images, titles and descriptions, big images. Also checks the live site.", input_schema: { type: "object", properties: {} } },
  {
    name: "publiceren",
    description: "Make the concept version live. ONLY when Damien explicitly confirmed in his latest message (e.g. 'ja, publiceer'). Otherwise ask him first.",
    input_schema: { type: "object", properties: { notitie: { type: "string" } } },
  },
  {
    name: "terugzetten",
    description: "Put an older version back live (by version number). ONLY after Damien explicitly confirmed in his latest message. Otherwise ask first.",
    input_schema: { type: "object", properties: { nummer: { type: "integer" } }, required: ["nummer"] },
  },
];

type Blok = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
type Bericht = { role: "user" | "assistant"; content: string | unknown[] };
const BEVESTIGD = /\b(ja|yes|ok[eé]?|doe maar|go)\b[\s\S]*\b(publiceer|publiceren|publish|zet terug|terugzetten|live)\b|\b(publiceer|publiceren|publish|zet (het )?terug)\b[\s\S]*\b(maar|nu|now)\b/i;

export const beheerChat = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        id: z.number().int().positive(),
        historie: z.array(z.object({ rol: z.enum(["ik", "ai"]), tekst: z.string().max(6000) })).max(30),
        vraag: z.string().trim().min(1).max(4000),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { DB, g, bindings: b } = await eigenaar();
    const { ANTHROPIC_API_KEY, CLAUDE_MODEL, SITE_MODEL } = b();
    if (!ANTHROPIC_API_KEY) return { ok: false as const, antwoord: "The AI key is not set up on the server.", gewijzigd: [] as string[] };
    const k = await laadKlant(DB, data.id);
    const L = await sitesLib();
    let site = await L.siteVoorTeam(DB, data.id);
    const metSite = Boolean(site);
    const bevestigd = BEVESTIGD.test(data.vraag);
    const concept = site ? await L.versie(DB, site.concept_versie) : null;
    const system = `You are the assistant inside the Volgo owner dashboard. You help Damien, the owner of Volgo, manage one customer: the Volgo AI chat on their website, their calendar settings${metSite ? ", and their website itself, which is hosted in Volgo" : ""}.
Answer in the language Damien writes in (usually Dutch). Be short and practical. When he asks for a change, make it with the tools, then say in one sentence what changed and which page to look at in the preview.
${
  metSite
    ? `WEBSITE RULES
- You edit the CONCEPT version. Nothing is live until it is published. After each change the preview refreshes for Damien.
- Read a file before you change it. Prefer bestand_vervangen for small edits; use bestand_schrijven for new pages or full rewrites. Keep the existing style.
- Pages are folders with index.html (e.g. tuinonderhoud/index.html at /tuinonderhoud/). Images Damien uploads are under images/.
- Never put API keys or secrets in files. The Volgo chat is added to every page automatically: don't add it yourself.
- Publish or roll back ONLY when Damien's latest message explicitly confirms it. If he didn't, ask "Zal ik publiceren?" and wait.`
    : "This customer has no website in Volgo yet. If Damien asks to change the website, say he can create or import it in the Website tab first."
}

CUSTOMER
${k.klant.bedrijf} · ${k.klant.naam} · ${k.klant.email} · plan ${k.klant.planNaam} · status ${k.klant.status}

CHAT AND CALENDAR SETTINGS
${JSON.stringify(k.inst, null, 2)}

PROBLEMS FOUND
${k.problemen.map((p) => `- ${p.tekst}`).join("\n") || "- none"}
${site ? `\nWEBSITE\nTemporary address: https://${site.slug}.${L.SITE_HOST} · domain: ${site.domein ?? "none"} (${site.domein_status || "not linked"}) · status ${site.status} · concept version ${concept?.nummer ?? "-"} · live version id ${site.live_versie ?? "none"}\nFiles: ${Object.keys(concept?.manifest ?? {}).slice(0, 80).join(", ") || "none"}\n` : ""}
RECENT CHATS (id · visitor · subject · messages · last activity)
${k.gesprekken.slice(0, 15).map((x) => `- ${x.id} · ${x.bezoeker} · ${x.onderwerp} · ${x.berichten} · ${x.laatste}`).join("\n") || "- none"}

RECENT APPOINTMENTS
${k.afspraken.slice(0, 10).map((a) => `- ${a.start} · ${a.titel} · ${a.locatie ?? ""}`).join("\n") || "- none"}`;

    const msgs: Bericht[] = [
      ...data.historie.map((h) => ({ role: (h.rol === "ik" ? "user" : "assistant") as "user" | "assistant", content: h.tekst })),
      { role: "user", content: data.vraag },
    ];
    const gewijzigd: string[] = [];
    const bewaar = async (antwoord: string) => {
      await DB.batch([
        DB.prepare("INSERT INTO site_chat (team_id, rol, tekst) VALUES (?, 'ik', ?)").bind(data.id, data.vraag),
        DB.prepare("INSERT INTO site_chat (team_id, rol, tekst, gewijzigd) VALUES (?, 'ai', ?, ?)").bind(data.id, antwoord, [...new Set(gewijzigd)].join(",")),
      ]).catch(() => undefined);
      return { ok: true as const, antwoord, gewijzigd: [...new Set(gewijzigd)] };
    };
    const tekstVan = (pad: string) => {
      const p = L.normPad(pad);
      if (!p) throw new Error(`Not a valid file name: ${pad}`);
      if (!L.isTekst(L.typeVan(p))) throw new Error(`${p} is not a text file.`);
      return p;
    };
    for (let ronde = 0; ronde < 12; ronde++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: metSite ? SITE_MODEL || "claude-sonnet-5-5" : CLAUDE_MODEL || "claude-haiku-5-5",
          max_tokens: metSite ? 16000 : 1500,
          system,
          tools: metSite ? [...TOOLS, ...SITE_TOOLS] : TOOLS,
          messages: msgs,
        }),
      });
      if (!res.ok) return bewaar(`The AI didn't answer (${res.status}). Try again in a minute.`);
      const j = (await res.json()) as { content: Blok[]; stop_reason: string };
      msgs.push({ role: "assistant", content: j.content });
      const tools = j.content.filter((x): x is Extract<Blok, { type: "tool_use" }> => x.type === "tool_use");
      if (!tools.length || j.stop_reason !== "tool_use") {
        const tekst = j.content
          .filter((x): x is Extract<Blok, { type: "text" }> => x.type === "text")
          .map((x) => x.text)
          .join("\n")
          .trim();
        return bewaar(tekst || "Done.");
      }
      const resultaten: unknown[] = [];
      for (const t of tools) {
        let uit = "";
        try {
          const inp = t.input as Record<string, string>;
          if (t.name === "instellingen_wijzigen") {
            const velden = await pasAan(DB, data.id, instellingSchema.parse(t.input));
            gewijzigd.push(...velden);
            uit = velden.length ? `Saved: ${velden.join(", ")}` : "Nothing to change.";
          } else if (t.name === "gesprek_lezen") {
            const gid = Number(t.input.gesprek_id);
            const eigen = await DB.prepare("SELECT id FROM ava_gesprekken WHERE id = ? AND team_id = ?").bind(gid, data.id).first();
            if (!eigen) uit = "That chat doesn't belong to this customer.";
            else {
              const r = await DB.prepare("SELECT rol, tekst FROM ava_berichten WHERE gesprek_id = ? ORDER BY id LIMIT 80").bind(gid).all<{ rol: string; tekst: string }>();
              uit = r.results.map((x) => `${x.rol}: ${x.tekst}`).join("\n").slice(0, 12000) || "(empty)";
            }
          } else if (!site) uit = "This customer has no website in Volgo yet.";
          else {
            const huidig = (await L.versie(DB, site.concept_versie))?.manifest ?? {};
            if (t.name === "bestanden_lijst") uit = Object.entries(huidig).map(([p, f]) => `${p} (${f.grootte} B)`).join("\n") || "(no files)";
            else if (t.name === "bestand_lezen") uit = ((await L.leesTekst(site.id, huidig, tekstVan(inp.pad))) ?? "File not found.").slice(0, 60000);
            else if (t.name === "zoeken") {
              const gevonden: string[] = [];
              for (const p of Object.keys(huidig)) if (L.isTekst(huidig[p].type) && ((await L.leesTekst(site.id, huidig, p)) ?? "").includes(inp.tekst)) gevonden.push(p);
              uit = gevonden.join("\n") || "Not found in any file.";
            } else if (t.name === "bestand_vervangen") {
              const p = tekstVan(inp.pad);
              const oud = (await L.leesTekst(site.id, huidig, p)) ?? null;
              if (oud === null) uit = "File not found.";
              else {
                const n = oud.split(inp.oud).length - 1;
                if (n !== 1) uit = n ? `The old text occurs ${n} times: include more surrounding text.` : "The old text was not found: read the file again.";
                else {
                  const v = await L.schrijf(DB, site, [{ pad: p, data: new TextEncoder().encode(oud.replace(inp.oud, inp.nieuw)) }], [], g.naam, `Edited ${p}`);
                  gewijzigd.push(p);
                  uit = `Saved as concept version ${v.nummer}.`;
                }
              }
            } else if (t.name === "bestand_schrijven") {
              const p = tekstVan(inp.pad);
              const v = await L.schrijf(DB, site, [{ pad: p, data: new TextEncoder().encode(inp.inhoud) }], [], g.naam, `Wrote ${p}`);
              gewijzigd.push(p);
              uit = `Saved as concept version ${v.nummer}.`;
            } else if (t.name === "bestand_verwijderen") {
              const p = L.normPad(inp.pad);
              if (!p || !huidig[p]) uit = "File not found.";
              else {
                const v = await L.schrijf(DB, site, [], [p], g.naam, `Deleted ${p}`);
                gewijzigd.push(`deleted ${p}`);
                uit = `Deleted. Concept version ${v.nummer}.`;
              }
            } else if (t.name === "controleren") {
              const c = await L.controleerConcept(site.id, huidig);
              const live = site.live_versie ? (await L.controleerLive(DB, site)).punten.map((x) => `LIVE: ${x.tekst}`) : ["LIVE: not published yet."];
              uit = [...c, ...live].join("\n");
            } else if (t.name === "publiceren") {
              if (!bevestigd) uit = "Not confirmed. Ask Damien: 'Zal ik publiceren?' and wait for his yes.";
              else if (!site.concept_versie) uit = "Nothing to publish.";
              else {
                await L.publiceer(DB, site, site.concept_versie);
                gewijzigd.push("published");
                uit = `Published. Live at ${L.liveUrl(site)}.`;
              }
            } else if (t.name === "terugzetten") {
              if (!bevestigd) uit = "Not confirmed. Ask Damien first and wait for his yes.";
              else {
                const r = await DB.prepare("SELECT id FROM site_versies WHERE site_id = ? AND nummer = ?").bind(site.id, Number(t.input.nummer)).first<{ id: number }>();
                if (!r) uit = "That version number doesn't exist.";
                else {
                  await L.zetTerug(DB, site, r.id);
                  gewijzigd.push(`rolled back to ${t.input.nummer}`);
                  uit = "Rolled back. That version is live again.";
                }
              }
            } else uit = "Unknown tool.";
            site = (await L.siteVoorTeam(DB, data.id)) ?? site;
          }
        } catch (e) {
          uit = `Error: ${e instanceof Error ? e.message.slice(0, 300) : "invalid input"}`;
        }
        resultaten.push({ type: "tool_result", tool_use_id: t.id, content: uit });
      }
      msgs.push({ role: "user", content: resultaten });
    }
    return bewaar("Done. (Stopped after several steps; ask me to continue if needed.)");
  });

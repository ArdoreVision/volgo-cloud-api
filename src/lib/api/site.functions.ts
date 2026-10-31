import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { huidigeGebruiker } from "../auth.server";
import { instellingenVoorTeam } from "../ava.server";
import { bindings } from "../bindings.server";
import { planVoorTeam } from "../limieten.server";
import { type SiteData, siteSchema, slugVan, standaardSite } from "../site";

type DB = NonNullable<ReturnType<typeof bindings>["DB"]>;

async function zorgVoorSite(DB: DB, teamId: number) {
  const r = await DB.prepare("SELECT slug, data, vorige, gepubliceerd FROM sites WHERE team_id = ?")
    .bind(teamId)
    .first<{ slug: string; data: string; vorige: string | null; gepubliceerd: number }>();
  if (r) return r;
  const inst = await instellingenVoorTeam(DB, teamId);
  const basis = slugVan(inst.bedrijf);
  let slug = basis;
  for (let i = 2; await DB.prepare("SELECT 1 FROM sites WHERE slug = ?").bind(slug).first(); i++) slug = `${basis}-${i}`;
  const data = JSON.stringify(standaardSite(inst.bedrijf, inst.bedrijfsinfo));
  await DB.prepare("INSERT INTO sites (team_id, slug, data) VALUES (?, ?, ?)").bind(teamId, slug, data).run();
  return { slug, data, vorige: null, gepubliceerd: 0 };
}

async function sessie(alleenBuilder: boolean) {
  const g = await huidigeGebruiker();
  const { DB } = bindings();
  if (!g || !DB) throw new Error("You're logged out.");
  const plan = await planVoorTeam(DB, g.team_id);
  if (alleenBuilder && !plan.limieten.builder) throw new Error("The website builder is part of Premium.");
  return { g, DB, plan };
}

export const haalMijnSite = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB, plan } = await sessie(false);
  const s = await zorgVoorSite(DB, g.team_id);
  return { slug: s.slug, site: siteSchema.parse(JSON.parse(s.data)), gepubliceerd: Boolean(s.gepubliceerd), kanTerug: Boolean(s.vorige), magBewerken: plan.limieten.builder };
});

export const zetGepubliceerd = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ aan: z.boolean() }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie(true);
    await zorgVoorSite(DB, g.team_id);
    await DB.prepare("UPDATE sites SET gepubliceerd = ? WHERE team_id = ?").bind(data.aan ? 1 : 0, g.team_id).run();
    return { ok: true };
  });

export const zetTerug = createServerFn({ method: "POST" }).handler(async () => {
  const { g, DB } = await sessie(true);
  const s = await zorgVoorSite(DB, g.team_id);
  if (!s.vorige) return { ok: false as const };
  await DB.prepare("UPDATE sites SET data = ?, vorige = ?, updated_at = datetime('now') WHERE team_id = ?").bind(s.vorige, s.data, g.team_id).run();
  return { ok: true as const, site: siteSchema.parse(JSON.parse(s.vorige)) };
});

const toolSchema = {
  type: "object",
  required: ["site", "samenvatting"],
  properties: {
    samenvatting: { type: "string", description: "One short sentence for the owner about what you changed, in the owner's language." },
    site: {
      type: "object",
      description: "The COMPLETE updated website content.",
      required: ["naam", "hero"],
      properties: {
        taal: { type: "string", enum: ["en", "nl", "de", "fr"], description: "Language of the website copy" },
        kleur: { type: "string", description: "Main brand color as #RRGGBB" },
        stijl: { type: "string", enum: ["licht", "donker"], description: "licht = light theme, donker = dark theme" },
        naam: { type: "string" },
        tagline: { type: "string" },
        hero: { type: "object", properties: { titel: { type: "string" }, tekst: { type: "string" }, knop: { type: "string", description: "Label of the button that opens the AVA chat" } } },
        diensten: { type: "array", maxItems: 8, items: { type: "object", properties: { titel: { type: "string" }, tekst: { type: "string" } } } },
        over: { type: "object", properties: { titel: { type: "string" }, tekst: { type: "string" } } },
        reviews: { type: "array", maxItems: 6, items: { type: "object", properties: { naam: { type: "string" }, tekst: { type: "string" } } } },
        faq: { type: "array", maxItems: 8, items: { type: "object", properties: { vraag: { type: "string" }, antwoord: { type: "string" } } } },
        contact: { type: "object", properties: { telefoon: { type: "string" }, email: { type: "string" }, adres: { type: "string" }, openingstijden: { type: "string" } } },
      },
    },
  },
};

/** Premium: change the website by asking AVA in plain language. */
export const bewerkSiteMetAva = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ opdracht: z.string().trim().min(2).max(1500) }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie(true);
    const { ANTHROPIC_API_KEY, CLAUDE_MODEL } = bindings();
    if (!ANTHROPIC_API_KEY) return { ok: false as const, antwoord: "AVA can't edit right now. Please try again later." };
    const s = await zorgVoorSite(DB, g.team_id);
    const inst = await instellingenVoorTeam(DB, g.team_id);

    const system = `You are AVA inside Volgo's website builder. You edit the website of ${inst.bedrijf} by calling the tool update_site with the COMPLETE new content.
Rules:
- Change only what the owner asks. Keep everything else exactly as it is.
- Write website copy that is clear, warm and professional. Short sentences. No emoji.
- Website copy language: use the language the existing copy is written in, unless the owner asks for another language. If the site is still mostly empty, use the language of the owner's request.
- Never invent facts like prices, certifications, years in business, phone numbers or addresses. Use only what the owner or the business info gives you. Reviews: only add them if the owner provides them.
- Field "taal" must match the language of the website copy (en, nl, de or fr).
- Field "stijl": "licht" (light) or "donker" (dark). "kleur" is the main color as #RRGGBB.
- Max 8 services, 6 reviews, 8 FAQ items.
- If the request has nothing to do with the website, still call the tool with the site unchanged and explain in samenvatting.

Business info from the owner:
${inst.bedrijfsinfo || "(none yet)"}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: CLAUDE_MODEL || "claude-haiku-5-5",
          max_tokens: 4000,
          thinking: { type: "disabled" },
          system,
          tools: [{ name: "update_site", description: "Save the complete updated website content.", input_schema: toolSchema }],
          tool_choice: { type: "tool", name: "update_site" },
          messages: [{ role: "user", content: `Current website (JSON):\n${s.data}\n\nRequest from the owner:\n${data.opdracht}` }],
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const out = (await res.json()) as { content: { type: string; input?: { site?: unknown; samenvatting?: string } }[] };
      const use = out.content.find((b) => b.type === "tool_use");
      const nieuw: SiteData = siteSchema.parse({ ...JSON.parse(s.data), ...(use?.input?.site as object) });
      await DB.prepare("UPDATE sites SET vorige = data, data = ?, updated_at = datetime('now') WHERE team_id = ?").bind(JSON.stringify(nieuw), g.team_id).run();
      return { ok: true as const, antwoord: use?.input?.samenvatting || "Done.", site: nieuw };
    } catch (err) {
      console.error("[builder]", err);
      return { ok: false as const, antwoord: "That didn't work. Try saying it a bit differently." };
    }
  });

/** Public: a published site (or a preview for the owner's own team). */
export const haalPubliekeSite = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ slug: z.string().max(60), preview: z.boolean().default(false) }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = bindings();
    if (!DB) return null;
    const r = await DB.prepare("SELECT s.team_id, s.data, s.gepubliceerd, a.sleutel FROM sites s LEFT JOIN ava_instellingen a ON a.team_id = s.team_id WHERE s.slug = ?")
      .bind(data.slug)
      .first<{ team_id: number; data: string; gepubliceerd: number; sleutel: string | null }>();
    if (!r) return null;
    if (!r.gepubliceerd) {
      if (!data.preview) return null;
      const g = await huidigeGebruiker().catch(() => null);
      if (!g || g.team_id !== r.team_id) return null;
    }
    return { site: siteSchema.parse(JSON.parse(r.data)), sleutel: r.sleutel, concept: !r.gepubliceerd };
  });

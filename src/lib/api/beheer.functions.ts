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
  review_url: z.union([z.literal(""), z.string().trim().max(500).regex(/^https:\/\/[^\s]+$/)]).optional(),
  taal: z.enum(["nl", "en"]).optional(),
  auto_herinnering: z.boolean().optional(),
  auto_review: z.boolean().optional(),
  auto_opvolging: z.boolean().optional(),
  auto_seizoen: z.boolean().optional(),
  antwoord_mail: z.union([z.literal(""), z.string().trim().email().max(160)]).optional(),
  iban: z.union([z.literal(""), z.string().trim().toUpperCase().regex(/^[A-Z]{2}\d{2}[A-Z0-9 ]{10,32}$/)]).optional(),
  /** Their own Stripe key (restricted key with Checkout write). "" removes it; leave out to keep it. */
  stripe_sleutel: z.union([z.literal(""), z.string().trim().regex(/^(rk|sk)_(live|test)_[A-Za-z0-9]{10,}$/)]).optional(),
  zakelijk_nummer: z.string().trim().max(30).optional(),
  /** Meta phone number ID of the business's verified WhatsApp number (digits). */
  wa_phone_id: z.union([z.literal(""), z.string().trim().regex(/^\d{6,30}$/)]).optional(),
  /** Twilio number in E.164 that forwards calls to the business. */
  twilio_nummer: z.union([z.literal(""), z.string().trim().regex(/^\+[1-9]\d{7,14}$/)]).optional(),
  sms_terug: z.boolean().optional(),
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
  if (w.review_url !== undefined) zet("review_url", w.review_url);
  if (w.taal !== undefined) zet("taal", w.taal);
  for (const k of ["auto_herinnering", "auto_review", "auto_opvolging", "auto_seizoen"] as const) if (w[k] !== undefined) zet(k, w[k] ? 1 : 0);
  if (w.antwoord_mail !== undefined) zet("antwoord_mail", w.antwoord_mail);
  if (w.iban !== undefined) zet("iban", w.iban.replace(/\s+/g, " "));
  if (w.stripe_sleutel !== undefined) zet("stripe_sleutel", w.stripe_sleutel);
  if (w.zakelijk_nummer !== undefined) {
    const { normNummer } = await import("../kanalen.server");
    zet("zakelijk_nummer", w.zakelijk_nummer ? normNummer(w.zakelijk_nummer) : "");
  }
  if (w.wa_phone_id !== undefined) zet("wa_phone_id", w.wa_phone_id);
  if (w.twilio_nummer !== undefined) zet("twilio_nummer", w.twilio_nummer);
  if (w.sms_terug !== undefined) zet("sms_terug", w.sms_terug ? 1 : 0);
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
  const extra = await DB.prepare(
    "SELECT site_url, review_url, taal, auto_herinnering, auto_review, auto_opvolging, auto_seizoen, antwoord_mail, iban, stripe_sleutel, zakelijk_nummer, wa_phone_id, twilio_nummer, sms_terug, kanaal_wens FROM ava_instellingen WHERE team_id = ?",
  )
    .bind(id)
    .first<{ site_url: string; review_url: string; taal: string; auto_herinnering: number; auto_review: number; auto_opvolging: number; auto_seizoen: number; antwoord_mail: string; iban: string; stripe_sleutel: string; zakelijk_nummer: string; wa_phone_id: string; twilio_nummer: string; sms_terug: number; kanaal_wens: string }>();
  const { platform } = await import("../kanalen.server");
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
      review_url: extra?.review_url ?? "",
      taal: (extra?.taal === "en" ? "en" : "nl") as "nl" | "en",
      auto_herinnering: Boolean(extra?.auto_herinnering ?? 1),
      auto_review: Boolean(extra?.auto_review ?? 1),
      auto_opvolging: Boolean(extra?.auto_opvolging ?? 1),
      auto_seizoen: Boolean(extra?.auto_seizoen ?? 0),
      antwoord_mail: extra?.antwoord_mail ?? "",
      iban: extra?.iban ?? "",
      stripe: extra?.stripe_sleutel ? `${extra.stripe_sleutel.slice(0, 8)}…${extra.stripe_sleutel.slice(-4)}` : "",
      zakelijk_nummer: extra?.zakelijk_nummer ?? "",
      wa_phone_id: extra?.wa_phone_id ?? "",
      twilio_nummer: extra?.twilio_nummer ?? "",
      sms_terug: Boolean(extra?.sms_terug),
    },
    kanaalWens: extra?.kanaal_wens ?? "",
    platform: platform(),
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

// ── The AI helper in the owner dashboard ───────────────────────────
const TOOLS = [
  {
    name: "instellingen_wijzigen",
    description:
      "Change this customer's Volgo settings. Only include the fields you change. vragen: one question per line. open_dagen: 0=Sunday … 6=Saturday. afspraak_soorten: bellen (phone call), langs (visit at their address), chat (chat appointment), kantoor (at the office), insta (Instagram DM).",
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

type Blok = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
type Bericht = { role: "user" | "assistant"; content: string | unknown[] };

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
    const { DB } = await eigenaar();
    const { ANTHROPIC_API_KEY, CLAUDE_MODEL } = (await import("../bindings.server")).bindings();
    if (!ANTHROPIC_API_KEY) return { ok: false as const, antwoord: "The AI key is not set up on the server.", gewijzigd: [] as string[] };
    const k = await laadKlant(DB, data.id);
    const system = `You are the assistant inside the Volgo owner dashboard. You help Damien, the owner of Volgo, manage one customer's Volgo: the AI chat on that customer's website.
Answer in the language Damien writes in (usually Dutch). Be short and practical. When Damien asks for a change, make it with the instellingen_wijzigen tool, then confirm in one sentence what changed. When he asks what is wrong, look at the problems, the recent chats (use gesprek_lezen for details) and say plainly what to fix.
You can only change the Volgo chat and calendar settings below. You cannot edit the customer's website files themselves: say so if asked, and suggest what to do instead.

CUSTOMER
${k.klant.bedrijf} · ${k.klant.naam} · ${k.klant.email} · plan ${k.klant.planNaam} · status ${k.klant.status}

CURRENT SETTINGS
${JSON.stringify(k.inst, null, 2)}

PROBLEMS FOUND
${k.problemen.map((p) => `- ${p.tekst}`).join("\n") || "- none"}

RECENT CHATS (id · visitor · subject · messages · last activity)
${k.gesprekken.slice(0, 15).map((g) => `- ${g.id} · ${g.bezoeker} · ${g.onderwerp} · ${g.berichten} · ${g.laatste}`).join("\n") || "- none"}

RECENT APPOINTMENTS
${k.afspraken.slice(0, 10).map((a) => `- ${a.start} · ${a.titel} · ${a.locatie ?? ""}`).join("\n") || "- none"}`;

    const msgs: Bericht[] = [
      ...data.historie.map((h) => ({ role: (h.rol === "ik" ? "user" : "assistant") as "user" | "assistant", content: h.tekst })),
      { role: "user", content: data.vraag },
    ];
    const gewijzigd: string[] = [];
    for (let ronde = 0; ronde < 5; ronde++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: CLAUDE_MODEL || "claude-haiku-5-5", max_tokens: 1500, thinking: { type: "disabled" }, system, tools: TOOLS, messages: msgs }),
      });
      if (!res.ok) return { ok: false as const, antwoord: `The AI didn't answer (${res.status}). Try again in a minute.`, gewijzigd };
      const j = (await res.json()) as { content: Blok[]; stop_reason: string };
      msgs.push({ role: "assistant", content: j.content });
      const tools = j.content.filter((b): b is Extract<Blok, { type: "tool_use" }> => b.type === "tool_use");
      if (!tools.length || j.stop_reason !== "tool_use") {
        const tekst = j.content
          .filter((b): b is Extract<Blok, { type: "text" }> => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return { ok: true as const, antwoord: tekst || "Done.", gewijzigd };
      }
      const resultaten: unknown[] = [];
      for (const t of tools) {
        let uit = "";
        try {
          if (t.name === "instellingen_wijzigen") {
            const w = instellingSchema.parse(t.input);
            const velden = await pasAan(DB, data.id, w);
            gewijzigd.push(...velden);
            uit = velden.length ? `Saved: ${velden.join(", ")}` : "Nothing to change.";
          } else if (t.name === "gesprek_lezen") {
            const gid = Number(t.input.gesprek_id);
            const eigen = await DB.prepare("SELECT id FROM ava_gesprekken WHERE id = ? AND team_id = ?").bind(gid, data.id).first();
            if (!eigen) uit = "That chat doesn't belong to this customer.";
            else {
              const r = await DB.prepare("SELECT rol, tekst FROM ava_berichten WHERE gesprek_id = ? ORDER BY id LIMIT 80").bind(gid).all<{ rol: string; tekst: string }>();
              uit = r.results.map((b) => `${b.rol}: ${b.tekst}`).join("\n").slice(0, 12000) || "(empty)";
            }
          } else uit = "Unknown tool.";
        } catch (e) {
          uit = `Error: ${e instanceof Error ? e.message.slice(0, 300) : "invalid input"}`;
        }
        resultaten.push({ type: "tool_result", tool_use_id: t.id, content: uit });
      }
      msgs.push({ role: "user", content: resultaten });
    }
    return { ok: true as const, antwoord: "Done. (Stopped after several steps.)", gewijzigd: [...new Set(gewijzigd)] };
  });

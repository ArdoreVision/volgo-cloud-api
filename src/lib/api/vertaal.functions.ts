import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sha256 } from "../auth.server";
import { bindings } from "../bindings.server";
import { TALEN, isTaal } from "../talen";

const STUK = 40;

/** Translate website texts into one language. Cached per text in D1, so every string costs one AI call ever. */
export const vertaalTeksten = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        taal: z.string().length(2).refine(isTaal, "Unknown language"),
        teksten: z.array(z.string().min(1).max(800)).min(1).max(200),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { DB, ANTHROPIC_API_KEY, CLAUDE_MODEL } = bindings();
    const uit: Record<string, string> = {};
    if (data.taal === "en") {
      for (const t of data.teksten) uit[t] = t;
      return { ok: true as const, vertalingen: uit };
    }
    if (!DB) return { ok: false as const, vertalingen: uit };
    const uniek = [...new Set(data.teksten)];
    const sleutels = new Map<string, string>();
    for (const t of uniek) sleutels.set(t, `${data.taal}:${await sha256(t)}`);

    // 1. Cache
    const rows = await DB.batch(uniek.map((t) => DB.prepare("SELECT bron, tekst FROM vertalingen WHERE sleutel = ?").bind(sleutels.get(t))));
    const ontbreekt: string[] = [];
    rows.forEach((r, i) => {
      const hit = (r.results as { bron: string; tekst: string }[])[0];
      if (hit) uit[uniek[i]!] = hit.tekst;
      else ontbreekt.push(uniek[i]!);
    });
    if (!ontbreekt.length || !ANTHROPIC_API_KEY) return { ok: true as const, vertalingen: uit };

    // 2. Translate what is missing, in chunks
    const taalNaam = TALEN.find((t) => t.code === data.taal)?.engels ?? data.taal;
    for (let i = 0; i < ontbreekt.length; i += STUK) {
      const stuk = ontbreekt.slice(i, i + STUK);
      const vertaald = await vertaalMetClaude(ANTHROPIC_API_KEY, CLAUDE_MODEL || "claude-haiku-5-5", taalNaam, stuk).catch(() => null);
      if (!vertaald) continue;
      const inserts = [];
      for (let j = 0; j < stuk.length; j++) {
        const v = vertaald[j];
        if (typeof v !== "string" || !v.trim()) continue;
        uit[stuk[j]!] = v;
        inserts.push(DB.prepare("INSERT OR IGNORE INTO vertalingen (sleutel, taal, bron, tekst) VALUES (?, ?, ?, ?)").bind(sleutels.get(stuk[j]!), data.taal, stuk[j], v));
      }
      if (inserts.length) await DB.batch(inserts);
    }
    return { ok: true as const, vertalingen: uit };
  });

async function vertaalMetClaude(key: string, model: string, taal: string, teksten: string[]): Promise<string[] | null> {
  const system = `You translate the user interface and marketing copy of Volgo, a software product, from English into ${taal}.
Rules:
- Return ONLY a JSON array of strings, same length and order as the input array. No commentary.
- Keep the tone: short, friendly, confident, written for small business owners (contractors, installers, studios).
- Never translate or change: "Volgo", "AVA", URLs, email addresses, prices and currency (€147, $4,250), product names (WordPress, Wix, Shopify, Squarespace, Webflow, Stripe), placeholders like {n} or {{name}}, and anything inside quotation marks that is a button name a visitor must find on screen (keep it, then add the translation in parentheses only if it helps).
- Keep punctuation, capitalization style, line breaks and leading/trailing spaces exactly as in the source.
- Use the informal register where the language has one (tu / du / je), consistently.
- If a string is a single word like a number, a symbol, or a code, return it unchanged.`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      thinking: { type: "disabled" },
      system,
      messages: [{ role: "user", content: JSON.stringify(teksten) }],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const json = (await res.json()) as { content: { type: string; text?: string }[] };
  const tekst = json.content.find((b) => b.type === "text")?.text ?? "";
  const start = tekst.indexOf("[");
  const eind = tekst.lastIndexOf("]");
  if (start < 0 || eind < 0) return null;
  const arr = JSON.parse(tekst.slice(start, eind + 1)) as unknown;
  if (!Array.isArray(arr) || arr.length !== teksten.length) return null;
  return arr as string[];
}

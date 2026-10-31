import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { huidigeGebruiker } from "../auth.server";
import { bindings } from "../bindings.server";
import { actieveGebruiker } from "../toegang.server";
import { planVoorTeam } from "../limieten.server";
import { esc, mailOpmaak, verstuurMail } from "../mail.server";

const VOLGO_INBOX = "hanssenscornerstone@outlook.com";

async function sessie() {
  const g = await actieveGebruiker().catch(() => null);
  const { DB } = bindings();
  if (!g || !DB) throw new Error("You're logged out.");
  return { g, DB, plan: await planVoorTeam(DB, g.team_id) };
}

export const haalWebsite = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB, plan } = await sessie();
  const a = await DB.prepare("SELECT id, created_at, contact, telefoon, domein, huidige_site, wensen, status FROM website_aanvragen WHERE team_id = ? ORDER BY id DESC LIMIT 1")
    .bind(g.team_id)
    .first<{ id: number; created_at: string; contact: string; telefoon: string; domein: string; huidige_site: string; wensen: string; status: string }>();
  return { mag: plan.limieten.website, plan: plan.naam, aanvraag: a ?? null };
});

export const stuurWebsiteAanvraag = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        contact: z.enum(["chat", "call"]),
        telefoon: z.string().trim().max(40).default(""),
        domein: z.string().trim().max(120).default(""),
        huidige_site: z.string().trim().max(200).default(""),
        wensen: z.string().trim().min(10).max(4000),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { g, DB, plan } = await sessie();
    if (!plan.limieten.website) return { ok: false as const, message: "A custom website is part of Pro and Premium." };
    if (data.contact === "call" && data.telefoon.length < 6) return { ok: false as const, message: "Add a phone number so we can call you." };
    await DB.prepare("INSERT INTO website_aanvragen (team_id, contact, telefoon, domein, huidige_site, wensen) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(g.team_id, data.contact, data.telefoon, data.domein, data.huidige_site, data.wensen)
      .run();
    // Let the Volgo team know (works once email is set up).
    await verstuurMail(
      VOLGO_INBOX,
      `New website request: ${g.bedrijf} (${plan.naam})`,
      mailOpmaak(
        `Website request from ${esc(g.bedrijf)}`,
        `<p><strong>${esc(g.naam)}</strong> · ${esc(g.email)}${data.telefoon ? ` · ${esc(data.telefoon)}` : ""}</p>
         <p>Prefers: <strong>${data.contact === "call" ? "a call" : "chat / email"}</strong> · Plan: ${plan.naam}</p>
         <p>Domain: ${esc(data.domein || "none yet")} · Current site: ${esc(data.huidige_site || "none")}</p>
         <p style="white-space:pre-wrap;background:#f5f7fa;padding:12px;border-radius:10px">${esc(data.wensen)}</p>`,
      ),
    );
    return { ok: true as const, message: "" };
  });

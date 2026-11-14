import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { huidigeGebruiker } from "../auth.server";
import { bindings } from "../bindings.server";
import { bouwBeurt, haalSite, vorigeSite } from "../bouwer.server";
import { intakeSchema } from "../intake";
import { binnenLimiet } from "../limiet.server";
import { actieveGebruiker } from "../toegang.server";
import { planVoorTeam } from "../limieten.server";
import { VOLGO_INBOX, esc, mailOpmaak, verstuurMail } from "../mail.server";

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
    if (!plan.limieten.website) return { ok: false as const, message: "A website built by us is part of the Complete package." };
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
         <p>Prefers: <strong>${data.contact === "call" ? "a call" : "email"}</strong> · Plan: ${plan.naam}</p>
         <p>Domain: ${esc(data.domein || "none yet")} · Current site: ${esc(data.huidige_site || "none")}</p>
         <p style="white-space:pre-wrap;background:#f5f7fa;padding:12px;border-radius:10px">${esc(data.wensen)}</p>`,
      ),
    );
    return { ok: true as const, message: "" };
  });

/** Website builder by chat: the draft, the conversation and whether it is online. */
export const haalBouwer = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB, plan } = await sessie();
  const site = plan.limieten.website ? await haalSite(DB, g.team_id) : null;
  const { haalIntake, DOMEIN_DOEL } = await import("../intake.server");
  const intake = await haalIntake(DB, g.team_id);
  return {
    domein: intake?.domein ?? "",
    domeinStatus: intake?.domeinStatus ?? "",
    domeinDoel: DOMEIN_DOEL,
    heeftGegevens: Boolean(intake?.gegevens),
    drieD: Boolean(plan.limieten.drieD),
    mag: plan.limieten.website,
    eigenaar: g.rol === "eigenaar",
    bedrijf: g.bedrijf,
    heeftSite: Boolean(site?.html),
    chat: site?.chat ?? [],
    slug: site?.slug ?? "",
    gepubliceerd: site?.gepubliceerd ?? false,
    heeftVorige: site?.heeftVorige ?? false,
  };
});

export const bouwSite = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ tekst: z.string().trim().min(2).max(3000) }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB, plan } = await sessie();
    if (!plan.limieten.website) return { ok: false as const, message: "Your plan has no website. Choose a plan first." };
    if (!(await binnenLimiet(DB, `bouw:${g.team_id}`, 60 * 24, 40))) return { ok: false as const, message: "You reached the maximum number of changes for today. You can continue tomorrow." };
    return bouwBeurt(DB, g.team_id, data.tekst, { drieD: Boolean(plan.limieten.drieD) });
  });

export const publiceerSite = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ aan: z.boolean() }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB, plan } = await sessie();
    if (!plan.limieten.website || g.rol !== "eigenaar") return { ok: false as const };
    const { publiceerWebsite } = await import("../intake.server");
    const r = await publiceerWebsite(DB, g.team_id, data.aan);
    if (!r.ok) return { ok: false as const };
    return { ok: true as const };
  });

export const herstelSite = createServerFn({ method: "POST" }).handler(async () => {
  const { g, DB, plan } = await sessie();
  if (!plan.limieten.website) return { ok: false as const };
  return { ok: await vorigeSite(DB, g.team_id) };
});

// ── Before the dashboard: the business and its domain, then Volgo builds the website ──

/** Add, change or remove the domain later, from the Website page. */
export const bewaarDomein = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ domein: z.string().trim().max(260) }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB, plan } = await sessie();
    if (g.rol !== "eigenaar") return { ok: false as const, message: "Only the account owner can change the domain." };
    if (!plan.limieten.website) return { ok: false as const, message: "Your plan has no website. Choose a plan first." };
    const { zetDomein } = await import("../intake.server");
    return zetDomein(DB, g, plan.naam, data.domein, g.bedrijf);
  });

/** What the owner already filled in, to show the form again with their answers. */
export const haalIntakeGegevens = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB, plan } = await sessie();
  const { haalIntake, DOMEIN_DOEL } = await import("../intake.server");
  const i = await haalIntake(DB, g.team_id);
  return { gegevens: i?.gegevens ?? null, domein: i?.domein ?? "", domeinStatus: i?.domeinStatus ?? "", domeinDoel: DOMEIN_DOEL, bedrijf: g.bedrijf, drieD: Boolean(plan.limieten.drieD), plan: plan.naam };
});

/**
 * Save the business details and the domain. The details also become what the chat knows (when that is still empty)
 * and the business number (when none is set), so the owner fills things in once.
 */
export const bewaarIntake = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ gegevens: intakeSchema, domein: z.string().trim().max(260).default("") }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB, plan } = await sessie();
    if (g.rol !== "eigenaar") return { ok: false as const, message: "Only the account owner can fill this in." };
    if (!plan.limieten.website) return { ok: false as const, message: "Your plan has no website. Choose a plan first." };
    const { infoVoorChat, zetDomein } = await import("../intake.server");
    const d = await zetDomein(DB, g, plan.naam, data.domein, data.gegevens.bedrijf, JSON.stringify(data.gegevens));
    if (!d.ok) return d;
    const domein = d.domein;

    const { instellingenVoorTeam } = await import("../ava.server");
    const inst = await instellingenVoorTeam(DB, g.team_id);
    if (data.gegevens.bedrijf !== g.bedrijf) await DB.prepare("UPDATE gebruikers SET bedrijf = ? WHERE id = ?").bind(data.gegevens.bedrijf, g.team_id).run();
    if (!inst.bedrijfsinfo.trim()) await DB.prepare("UPDATE ava_instellingen SET bedrijfsinfo = ? WHERE team_id = ?").bind(infoVoorChat(data.gegevens), g.team_id).run();
    if (data.gegevens.telefoon) {
      const { normNummer } = await import("../kanalen.server");
      const nummer = normNummer(data.gegevens.telefoon);
      if (nummer) await DB.prepare("UPDATE ava_instellingen SET zakelijk_nummer = ?, kanalen_gezien = 1 WHERE team_id = ? AND zakelijk_nummer = ''").bind(nummer, g.team_id).run();
    }

    return { ok: true as const, message: "", domein };
  });

/** Build the first version of the website from the saved details. Does nothing when a website already exists. */
export const bouwEersteWebsite = createServerFn({ method: "POST" }).handler(async () => {
  const { g, DB, plan } = await sessie();
  if (g.rol !== "eigenaar") return { ok: false as const, message: "Only the account owner can start this." };
  if (!plan.limieten.website) return { ok: false as const, message: "Your plan has no website. Choose a plan first." };
  const site = await haalSite(DB, g.team_id);
  if (site?.html) return { ok: true as const, message: "", alGebouwd: true };
  const { haalIntake, bouwOpdracht } = await import("../intake.server");
  const i = await haalIntake(DB, g.team_id);
  if (!i?.gegevens) return { ok: false as const, message: "Fill in your business details first." };
  if (!(await binnenLimiet(DB, `bouw:${g.team_id}`, 60 * 24, 40))) return { ok: false as const, message: "You reached the maximum number of builds for today. You can continue tomorrow." };
  const r = await bouwBeurt(DB, g.team_id, bouwOpdracht(i.gegevens, i.domein), { chatTekst: "Build my website from my business details.", drieD: Boolean(plan.limieten.drieD) && i.gegevens.drieD !== false });
  if (!r.ok) return { ok: false as const, message: r.message };
  if (!r.gewijzigd) return { ok: false as const, message: "Volgo could not build the page from these details. Open Website and tell the chat what you want." };
  return { ok: true as const, message: "", alGebouwd: false };
});

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Channels page and onboarding step: business number, click buttons and (honest) integration status.
async function sessie() {
  const { actieveGebruiker } = await import("../toegang.server");
  const { bindings } = await import("../bindings.server");
  const g = await actieveGebruiker().catch(() => null);
  const { DB } = bindings();
  if (!g || !DB) throw new Error("Not logged in");
  const { instellingenVoorTeam } = await import("../ava.server");
  await instellingenVoorTeam(DB, g.team_id);
  return { g, DB };
}

export const haalKanalen = createServerFn({ method: "GET" }).handler(async () => {
  const { g, DB } = await sessie();
  const k = await import("../kanalen.server");
  const i = (await k.kanaalInst(DB, g.team_id))!;
  // The website chat counts as working once it reported a visit in the last 30 days.
  const gezien = await DB.prepare("SELECT 1 FROM site_views WHERE team_id = ? AND dag >= date('now', '-30 days') LIMIT 1").bind(g.team_id).first().catch(() => null);
  return {
    eigenaar: g.rol === "eigenaar",
    nummer: i.zakelijk_nummer,
    knopWhatsapp: Boolean(i.knop_whatsapp),
    knopBellen: Boolean(i.knop_bellen),
    volgoNummer: i.twilio_nummer,
    smsTerug: Boolean(i.sms_terug),
    kanalen: k.kanaalStatus(i, Boolean(gezien)),
  };
});

export const bewaarKanalen = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ nummer: z.string().trim().max(30), knopWhatsapp: z.boolean(), knopBellen: z.boolean() }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    if (g.rol !== "eigenaar") return { ok: false as const, message: "Only the account owner can change the connections." };
    const { normNummer } = await import("../kanalen.server");
    const nummer = data.nummer ? normNummer(data.nummer) : "";
    if (data.nummer && !nummer) return { ok: false as const, message: "This number does not look right. Use for example 06 12345678 or +31 6 12345678." };
    if ((data.knopWhatsapp || data.knopBellen) && !nummer) return { ok: false as const, message: "Fill in your business number first." };
    await DB.prepare("UPDATE ava_instellingen SET zakelijk_nummer = ?, knop_whatsapp = ?, knop_bellen = ?, kanalen_gezien = 1 WHERE team_id = ?")
      .bind(nummer, data.knopWhatsapp ? 1 : 0, data.knopBellen ? 1 : 0, g.team_id)
      .run();
    return { ok: true as const, message: "", nummer };
  });

export const slaKanalenOver = createServerFn({ method: "POST" }).handler(async () => {
  const { g, DB } = await sessie();
  await DB.prepare("UPDATE ava_instellingen SET kanalen_gezien = 1 WHERE team_id = ?").bind(g.team_id).run();
  return { ok: true };
});

/** The business asks Volgo to link WhatsApp or phone. Volgo (the owner) gets an email with the details. */
export const vraagKoppelingAan = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ soort: z.enum(["whatsapp", "telefoon"]) }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    if (g.rol !== "eigenaar") return { ok: false as const, message: "Only the account owner can request this." };
    const i = await DB.prepare("SELECT a.kanaal_wens, a.zakelijk_nummer, g.bedrijf, g.email FROM ava_instellingen a JOIN gebruikers g ON g.id = a.team_id WHERE a.team_id = ?")
      .bind(g.team_id)
      .first<{ kanaal_wens: string; zakelijk_nummer: string; bedrijf: string; email: string }>();
    if (!i) return { ok: false as const, message: "Not found." };
    if (!i.zakelijk_nummer) return { ok: false as const, message: "Fill in your business number first and save." };
    const wens = new Set(i.kanaal_wens.split(",").filter(Boolean));
    const al = wens.has(data.soort);
    wens.add(data.soort);
    await DB.prepare("UPDATE ava_instellingen SET kanaal_wens = ? WHERE team_id = ?").bind([...wens].join(","), g.team_id).run();
    if (!al) {
      const { bindings } = await import("../bindings.server");
      const { verstuurMail, mailOpmaak, esc, SITE_URL } = await import("../mail.server");
      const aan = (bindings().ADMIN_EMAILS ?? "").split(",").map((x) => x.trim()).filter(Boolean)[0];
      const wat = data.soort === "whatsapp" ? "WhatsApp-koppeling" : "Telefoonkoppeling (Volgo-nummer)";
      if (aan)
        await verstuurMail(
          aan,
          `${wat} aangevraagd: ${i.bedrijf}`,
          mailOpmaak(
            `${wat} aangevraagd`,
            `<p style="margin:0 0 8px"><strong>${esc(i.bedrijf)}</strong> (${esc(i.email)})</p><p style="margin:0">Zakelijk nummer: ${esc(i.zakelijk_nummer)}</p>`,
            { tekst: "Open in admin", url: `${SITE_URL}/admin` },
          ),
        ).catch(() => false);
    }
    return { ok: true as const, message: "" };
  });

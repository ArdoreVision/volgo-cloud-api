import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { hashIp, recentCount } from "../aanvraag.server";
import { checkWachtwoord, hashWachtwoord, huidigeGebruiker, maakSessie, randomToken, sha256 } from "../auth.server";
import { bindings } from "../bindings.server";
import { esc, mailOpmaak, verstuurMail } from "../mail.server";

const origin = () => `https://${getRequestHeader("host") ?? "volgo.damienhanssens.workers.dev"}`;
const sterk = z.string().min(8, "Kies een wachtwoord van minstens 8 tekens.").max(200);

/** Stap 1: herstellink aanvragen. Zegt altijd hetzelfde, zodat niemand kan zien welke adressen een account hebben. */
export const vraagHerstel = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(200) }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = bindings();
    const algemeen = { ok: true as const, message: "Als dit e-mailadres bij Volgo bekend is, krijg je binnen een paar minuten een mail met een link." };
    if (!DB) return algemeen;
    const ipHash = await hashIp(getRequestHeader("cf-connecting-ip") ?? "onbekend");
    if ((await recentCount("chat_log", ipHash, 15)) >= 30) return { ok: false as const, message: "Te veel pogingen. Probeer het over een kwartier opnieuw." };
    await DB.prepare("INSERT INTO chat_log (ip_hash) VALUES (?)").bind(ipHash).run();

    const g = await DB.prepare("SELECT id, naam FROM gebruikers WHERE email = ?").bind(data.email).first<{ id: number; naam: string }>();
    if (!g) return algemeen;
    const token = randomToken();
    await DB.prepare("INSERT INTO wachtwoord_resets (token_hash, gebruiker_id, verloopt) VALUES (?, ?, datetime('now', '+1 hour'))")
      .bind(await sha256(token), g.id)
      .run();
    const link = `${origin()}/wachtwoord-herstellen?token=${token}`;
    const verstuurd = await verstuurMail(
      data.email,
      "Nieuw wachtwoord voor Volgo",
      mailOpmaak(
        `Hoi ${esc(g.naam.split(/\s+/)[0])}, kies een nieuw wachtwoord`,
        "<p>Je vroeg om een nieuw wachtwoord voor je Volgo-account. Klik op de knop hieronder. De link werkt één uur en kan één keer worden gebruikt.</p><p>Heb je dit niet zelf gevraagd? Dan kun je deze mail negeren, je wachtwoord blijft hetzelfde.</p>",
        { tekst: "Nieuw wachtwoord kiezen", url: link },
      ),
    );
    if (!verstuurd) {
      return {
        ok: false as const,
        message: "We kunnen op dit moment geen mail versturen. Mail naar hanssenscornerstone@outlook.com, dan helpen we je persoonlijk.",
      };
    }
    return algemeen;
  });

/** Stap 2: nieuw wachtwoord instellen met de link uit de mail. */
export const herstelWachtwoord = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ token: z.string().regex(/^[0-9a-f]{64}$/), wachtwoord: sterk }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = bindings();
    if (!DB) return { ok: false as const, message: "Database niet beschikbaar." };
    const h = await sha256(data.token);
    const r = await DB.prepare("SELECT gebruiker_id FROM wachtwoord_resets WHERE token_hash = ? AND gebruikt = 0 AND verloopt > datetime('now')")
      .bind(h)
      .first<{ gebruiker_id: number }>();
    if (!r) return { ok: false as const, message: "Deze link is verlopen of al gebruikt. Vraag een nieuwe aan." };
    await DB.batch([
      DB.prepare("UPDATE gebruikers SET wachtwoord = ? WHERE id = ?").bind(await hashWachtwoord(data.wachtwoord), r.gebruiker_id),
      DB.prepare("UPDATE wachtwoord_resets SET gebruikt = 1 WHERE gebruiker_id = ?").bind(r.gebruiker_id),
      // Overal uitloggen: oude sessies vervallen.
      DB.prepare("DELETE FROM sessies WHERE gebruiker_id = ?").bind(r.gebruiker_id),
    ]);
    await maakSessie(r.gebruiker_id);
    return { ok: true as const, message: "" };
  });

/** Accountgegevens wijzigen vanuit het dashboard. */
export const wijzigAccount = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        naam: z.string().trim().min(2).max(100),
        bedrijf: z.string().trim().min(2).max(120).optional(),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const g = await huidigeGebruiker();
    const { DB } = bindings();
    if (!g || !DB) return { ok: false as const, message: "Je bent uitgelogd." };
    await DB.prepare("UPDATE gebruikers SET naam = ? WHERE id = ?").bind(data.naam, g.id).run();
    if (data.bedrijf && g.rol === "eigenaar") await DB.prepare("UPDATE gebruikers SET bedrijf = ? WHERE id = ?").bind(data.bedrijf, g.id).run();
    return { ok: true as const, message: "Opgeslagen." };
  });

export const wijzigWachtwoord = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ huidig: z.string().max(200), nieuw: sterk }).parse(v))
  .handler(async ({ data }) => {
    const g = await huidigeGebruiker();
    const { DB } = bindings();
    if (!g || !DB) return { ok: false as const, message: "Je bent uitgelogd." };
    const rij = await DB.prepare("SELECT wachtwoord FROM gebruikers WHERE id = ?").bind(g.id).first<{ wachtwoord: string }>();
    if (!rij || !(await checkWachtwoord(data.huidig, rij.wachtwoord))) return { ok: false as const, message: "Je huidige wachtwoord klopt niet." };
    await DB.prepare("UPDATE gebruikers SET wachtwoord = ? WHERE id = ?").bind(await hashWachtwoord(data.nieuw), g.id).run();
    return { ok: true as const, message: "Je wachtwoord is gewijzigd." };
  });

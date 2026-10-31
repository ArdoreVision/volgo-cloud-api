import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { hashIp, recentCount } from "../aanvraag.server";
import { checkWachtwoord, hashWachtwoord, huidigeGebruiker, maakSessie, randomToken, sha256 } from "../auth.server";
import { bindings } from "../bindings.server";
import { SITE_URL, esc, mailOpmaak, verstuurMail } from "../mail.server";

const origin = () => SITE_URL;
const sterk = z.string().min(8, "Choose a password of at least 8 characters.").max(200);

/** Stap 1: herstellink aanvragen. Zegt altijd hetzelfde, zodat niemand kan zien welke adressen een account hebben. */
export const vraagHerstel = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(200) }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = bindings();
    const algemeen = { ok: true as const, message: "If this email address is registered with Volgo, you’ll receive an email with a link within a few minutes." };
    if (!DB) return algemeen;
    const ipHash = await hashIp(getRequestHeader("cf-connecting-ip") ?? "onbekend");
    const { binnenLimiet } = await import("../limiet.server");
    if (!(await binnenLimiet(DB, `reset:${ipHash}`, 15, 10)) || !(await binnenLimiet(DB, `reset-mail:${data.email}`, 60, 3))) {
      return { ok: false as const, message: "Too many attempts. Please try again later." };
    }

    const g = await DB.prepare("SELECT id, naam FROM gebruikers WHERE email = ?").bind(data.email).first<{ id: number; naam: string }>();
    if (!g) return algemeen;
    const token = randomToken();
    await DB.prepare("INSERT INTO wachtwoord_resets (token_hash, gebruiker_id, verloopt) VALUES (?, ?, datetime('now', '+1 hour'))")
      .bind(await sha256(token), g.id)
      .run();
    const link = `${origin()}/reset-password?token=${token}`;
    const verstuurd = await verstuurMail(
      data.email,
      "Reset your Volgo password",
      mailOpmaak(
        `Hi ${esc(g.naam.split(/\s+/)[0])}, choose a new password`,
        "<p>You asked for a new password for your Volgo account. Click the button below. The link works for one hour and can be used once.</p><p>Didn’t request this? You can ignore this email — your password stays the same.</p>",
        { tekst: "Choose a new password", url: link },
      ),
    );
    if (!verstuurd) {
      return {
        ok: false as const,
        message: "We can’t send email right now. Email hanssenscornerstone@outlook.com and we’ll help you personally.",
      };
    }
    return algemeen;
  });

/** Stap 2: nieuw wachtwoord instellen met de link uit de mail. */
export const herstelWachtwoord = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ token: z.string().regex(/^[0-9a-f]{64}$/), wachtwoord: sterk }).parse(v))
  .handler(async ({ data }) => {
    const { DB } = bindings();
    if (!DB) return { ok: false as const, message: "Database unavailable." };
    const h = await sha256(data.token);
    const r = await DB.prepare("SELECT gebruiker_id FROM wachtwoord_resets WHERE token_hash = ? AND gebruikt = 0 AND verloopt > datetime('now')")
      .bind(h)
      .first<{ gebruiker_id: number }>();
    if (!r) return { ok: false as const, message: "This link has expired or was already used. Request a new one." };
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
    if (!g || !DB) return { ok: false as const, message: "You’ve been logged out." };
    await DB.prepare("UPDATE gebruikers SET naam = ? WHERE id = ?").bind(data.naam, g.id).run();
    if (data.bedrijf && g.rol === "eigenaar") await DB.prepare("UPDATE gebruikers SET bedrijf = ? WHERE id = ?").bind(data.bedrijf, g.id).run();
    return { ok: true as const, message: "Saved." };
  });

export const wijzigWachtwoord = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ huidig: z.string().max(200), nieuw: sterk }).parse(v))
  .handler(async ({ data }) => {
    const g = await huidigeGebruiker();
    const { DB } = bindings();
    if (!g || !DB) return { ok: false as const, message: "You’ve been logged out." };
    const rij = await DB.prepare("SELECT wachtwoord FROM gebruikers WHERE id = ?").bind(g.id).first<{ wachtwoord: string }>();
    if (!rij || !(await checkWachtwoord(data.huidig, rij.wachtwoord))) return { ok: false as const, message: "Your current password is incorrect." };
    await DB.prepare("UPDATE gebruikers SET wachtwoord = ? WHERE id = ?").bind(await hashWachtwoord(data.nieuw), g.id).run();
    // Log out everywhere else; this device stays logged in with a fresh session.
    await DB.prepare("DELETE FROM sessies WHERE gebruiker_id = ?").bind(g.id).run();
    await maakSessie(g.id);
    return { ok: true as const, message: "Your password has been changed. Other devices have been logged out." };
  });

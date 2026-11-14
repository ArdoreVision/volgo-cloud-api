// What the owner tells Volgo before the dashboard opens: the business, and their own domain name.
// Volgo builds the website from it. Also: serving a published website on the owner's own domain.
import type { D1Database } from "@cloudflare/workers-types";
import { bindings } from "./bindings.server";
import { type Intake, THEMAS, intakeSchema } from "./intake";
import { VOLGO_INBOX, esc, mailOpmaak, verstuurMail } from "./mail.server";

/** Where a customer's domain has to point. A record in Volgo's own zone that Cloudflare forwards to this app. */
export const DOMEIN_DOEL = "sites.thevolgo.app";

export function leesIntake(json: string | null | undefined): Intake | null {
  try {
    const p = intakeSchema.safeParse(JSON.parse(json || "null"));
    return p.success ? p.data : null;
  } catch {
    return null;
  }
}

const NIET_EIGEN = /(^|\.)(thevolgo\.app|workers\.dev|pages\.dev|myshopify\.com|wixsite\.com|squarespace\.com|webflow\.io|framer\.website|wordpress\.com|localhost|example\.(com|org|net))$/;

/**
 * A domain the way people type it ("https://www.Bakker-Jan.nl/contact") → "bakker-jan.nl".
 * Returns "" when it is not a real domain name, or one the owner cannot point at Volgo (a builder's free address).
 */
export function normDomein(invoer: string): string {
  let d = invoer.trim().toLowerCase();
  d = d.replace(/^[a-z]+:\/\//, "").replace(/[/?#].*$/, "").replace(/:\d+$/, "").replace(/\.$/, "").replace(/^www\./, "");
  if (!/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(d)) return "";
  if (NIET_EIGEN.test(d)) return "";
  return d;
}

export async function haalIntake(DB: D1Database, team: number) {
  const r = await DB.prepare("SELECT gegevens, domein, domein_status FROM website_intake WHERE team_id = ?").bind(team).first<{ gegevens: string; domein: string; domein_status: string }>();
  return r ? { gegevens: leesIntake(r.gegevens), domein: r.domein, domeinStatus: r.domein_status } : null;
}

/** Is this domain already used by another team? */
export async function domeinBezet(DB: D1Database, team: number, domein: string) {
  if (!domein) return false;
  return Boolean(await DB.prepare("SELECT 1 FROM website_intake WHERE domein = ? AND team_id != ? LIMIT 1").bind(domein, team).first());
}

/** The request Volgo's website builder gets for the first version: everything the owner filled in, as plain facts. */
export function bouwOpdracht(i: Intake, domein: string) {
  const regel = (kop: string, w: string) => (w ? `${kop}: ${w}` : "");
  return [
    "Build the complete website for my business from the details below. Use only these facts. Where something is missing, write neutral text or leave that part out.",
    "",
    regel("Business name", i.bedrijf),
    regel("What we do", i.watDoetHet),
    i.diensten ? `Services:\n${i.diensten}` : "",
    regel("Where we work", i.gebied),
    regel("Phone", i.telefoon),
    regel("Email", i.email),
    regel("Address", i.adres),
    regel("Opening hours", i.openingstijden),
    regel("Website address", domein ? `https://www.${domein}` : ""),
    regel("Theme", THEMAS.find((t) => t.id === i.thema)?.opdracht ?? (i.stijl === "donker" ? "dark background, light text" : "light background, dark text")),
    regel("Accent colour", i.kleur),
    i.extra ? `Also good to know:\n${i.extra}` : "",
  ]
    .filter((x, n) => x || n === 1)
    .join("\n");
}

/** What the chat on the website should know, when the owner has not written that yet. */
export function infoVoorChat(i: Intake) {
  return [i.watDoetHet, i.diensten ? `Services:\n${i.diensten}` : "", i.gebied ? `Area: ${i.gebied}` : "", i.openingstijden ? `Opening hours: ${i.openingstijden}` : "", i.adres ? `Address: ${i.adres}` : ""]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 4000);
}

/**
 * Tell Cloudflare that this customer domain belongs to Volgo, so it gets a certificate and its visitors reach this app.
 * Needs Cloudflare for SaaS on the thevolgo.app zone plus CF_SAAS_ZONE_ID and CF_SAAS_TOKEN. Without those nothing is
 * sent and the Volgo team connects the domain by hand. Never throws.
 */
export async function meldDomeinAan(domein: string): Promise<"aangemeld" | "handmatig" | "mislukt"> {
  const b = bindings() as { CF_SAAS_ZONE_ID?: string; CF_SAAS_TOKEN?: string };
  if (!b.CF_SAAS_ZONE_ID || !b.CF_SAAS_TOKEN) return "handmatig";
  try {
    let goed = 0;
    for (const hostname of [`www.${domein}`, domein]) {
      const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${b.CF_SAAS_ZONE_ID}/custom_hostnames`, {
        method: "POST",
        headers: { Authorization: `Bearer ${b.CF_SAAS_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ hostname, ssl: { method: "http", type: "dv" } }),
        signal: AbortSignal.timeout(10000),
      });
      // 409 = already registered: fine.
      if (r.ok || r.status === 409) goed += 1;
    }
    return goed ? "aangemeld" : "mislukt";
  } catch {
    return "mislukt";
  }
}

/**
 * Set (or clear) a team's own domain. Checks it is a real domain of their own and not in use by another account,
 * registers it with Cloudflare when that is set up, and tells the Volgo team. `gegevens` is only written when given.
 */
export async function zetDomein(DB: D1Database, g: { team_id: number; naam: string; email: string }, planNaam: string, invoer: string, bedrijf: string, gegevens?: string) {
  const domein = invoer ? normDomein(invoer) : "";
  if (invoer && !domein) return { ok: false as const, message: "That does not look like a domain name of your own. Example: yourbusiness.com" };
  if (await domeinBezet(DB, g.team_id, domein)) return { ok: false as const, message: "This domain is already connected to another Volgo account. Write to volgo.app@outlook.com if it is yours." };
  const oud = await haalIntake(DB, g.team_id);
  const nieuwDomein = domein !== (oud?.domein ?? "");
  const status = !domein ? "" : nieuwDomein ? "wacht" : oud?.domeinStatus || "wacht";
  if (gegevens !== undefined)
    await DB.prepare(
      `INSERT INTO website_intake (team_id, gegevens, domein, domein_status) VALUES (?, ?, ?, ?)
       ON CONFLICT(team_id) DO UPDATE SET gegevens = excluded.gegevens, domein = excluded.domein, domein_status = excluded.domein_status, updated_at = datetime('now')`,
    )
      .bind(g.team_id, gegevens, domein, status)
      .run();
  else
    await DB.prepare(
      `INSERT INTO website_intake (team_id, domein, domein_status) VALUES (?, ?, ?)
       ON CONFLICT(team_id) DO UPDATE SET domein = excluded.domein, domein_status = excluded.domein_status, updated_at = datetime('now')`,
    )
      .bind(g.team_id, domein, status)
      .run();
  if (domein && nieuwDomein) {
    const hoe = await meldDomeinAan(domein);
    // The Volgo team hears about every new domain: to connect it by hand, or to keep an eye on the automatic one.
    await verstuurMail(
      VOLGO_INBOX,
      `Domain to connect: ${domein} (${bedrijf})`,
      mailOpmaak(
        `Domain for ${esc(bedrijf)}`,
        `<p><strong>${esc(g.naam)}</strong> · ${esc(g.email)} · ${esc(planNaam)}</p>
         <p>Domain: <strong>${esc(domein)}</strong> (www.${esc(domein)})</p>
         <p>${hoe === "aangemeld" ? "Registered with Cloudflare automatically. It becomes active when the customer points the domain at Volgo." : hoe === "mislukt" ? "Registering with Cloudflare failed. Add it by hand under Custom Hostnames." : "Cloudflare for SaaS is not set up yet: add it by hand under Custom Hostnames."}</p>`,
      ),
    ).catch(() => undefined);
  }
  return { ok: true as const, message: "", domein };
}

const EIGEN_HOST = /(^|\.)(thevolgo\.app|workers\.dev)$|^(localhost|127\.0\.0\.1|\[::1\])$/;

/** Is this request for a customer's own domain (and not for Volgo itself)? */
export const isKlantHost = (host: string) => !EIGEN_HOST.test(host.toLowerCase());

/**
 * A visitor on a customer's own domain: the published website of the team that owns it, or null when no team has it.
 * The first visit that arrives on the domain proves it points at Volgo, so the status flips to "actief" by itself.
 */
export async function siteVoorHost(DB: D1Database, host: string) {
  const domein = host.toLowerCase().replace(/^www\./, "");
  const r = await DB.prepare(
    "SELECT i.team_id, i.domein_status, s.data, s.gepubliceerd FROM website_intake i LEFT JOIN sites s ON s.team_id = i.team_id WHERE i.domein = ? LIMIT 1",
  )
    .bind(domein)
    .first<{ team_id: number; domein_status: string; data: string | null; gepubliceerd: number | null }>();
  if (!r) return null;
  if (r.domein_status !== "actief") await DB.prepare("UPDATE website_intake SET domein_status = 'actief', updated_at = datetime('now') WHERE team_id = ?").bind(r.team_id).run().catch(() => undefined);
  return { data: r.data, gepubliceerd: Boolean(r.gepubliceerd) };
}

/** Put the website online or take it offline. Online also records its address, so "My website" and the live check work. */
export async function publiceerWebsite(DB: D1Database, team: number, aan: boolean): Promise<{ ok: boolean; adres: string }> {
  const site = await DB.prepare("SELECT slug, data FROM sites WHERE team_id = ?").bind(team).first<{ slug: string; data: string }>();
  let html = "";
  try {
    html = String((JSON.parse(site?.data || "{}") as { html?: string }).html ?? "");
  } catch {
    html = "";
  }
  if (!site || !html) return { ok: false, adres: "" };
  await DB.prepare("UPDATE sites SET gepubliceerd = ? WHERE team_id = ?").bind(aan ? 1 : 0, team).run();
  const i = await haalIntake(DB, team);
  const adres = i?.domein && i.domeinStatus === "actief" ? `https://www.${i.domein}` : `https://thevolgo.app/s/${site.slug}`;
  if (aan) {
    await DB.prepare("UPDATE ava_instellingen SET site_url = ? WHERE team_id = ? AND (site_url = '' OR site_url LIKE 'https://thevolgo.app/s/%')").bind(adres, team).run();
    await DB.prepare("INSERT INTO onboarding (team_id, geinstalleerd) VALUES (?, 1) ON CONFLICT(team_id) DO UPDATE SET geinstalleerd = 1").bind(team).run().catch(() => undefined);
  }
  return { ok: true, adres };
}

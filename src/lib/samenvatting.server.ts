import { bindings } from "./bindings.server";
import { SITE_URL, esc, mailOpmaak, verstuurMail } from "./mail.server";

const tijd = (iso: string) =>
  new Date(iso.replace(" ", "T") + "Z").toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

/** Elke ochtend: per team een korte mail met wat er is binnengekomen en wie je moet bellen. */
export async function stuurOchtendSamenvattingen() {
  const { DB, RESEND_API_KEY } = bindings();
  if (!DB || !RESEND_API_KEY) return { verstuurd: 0 };

  const teams = await DB.prepare("SELECT id, bedrijf FROM gebruikers WHERE id NOT IN (SELECT gebruiker_id FROM team_leden WHERE rol != 'eigenaar') AND status != 'gestopt'")
    .all<{ id: number; bedrijf: string }>();
  let verstuurd = 0;

  for (const t of teams.results) {
    const [nieuweLeads, gesprekken, heet, afspraken, ontvangers] = await Promise.all([
      DB.prepare("SELECT COUNT(*) AS n FROM klant_leads WHERE gebruiker_id = ? AND voorbeeld = 0 AND created_at > datetime('now', '-1 day')").bind(t.id).first<{ n: number }>(),
      DB.prepare("SELECT COUNT(*) AS n FROM ava_gesprekken WHERE team_id = ? AND voorbeeld = 0 AND gestart > datetime('now', '-1 day')").bind(t.id).first<{ n: number }>(),
      DB.prepare(
        `SELECT l.naam, l.onderwerp, COALESCE(s.warmte, 50) AS warmte, l.laatste_actie FROM klant_leads l LEFT JOIN lead_scores s ON s.lead_id = l.id
         WHERE l.gebruiker_id = ? AND l.voorbeeld = 0 AND l.status IN ('nieuw','opvolging','offerte') ORDER BY warmte DESC LIMIT 3`,
      )
        .bind(t.id)
        .all<{ naam: string; onderwerp: string; warmte: number; laatste_actie: string | null }>(),
      DB.prepare(
        "SELECT titel, start FROM afspraken WHERE team_id = ? AND voorbeeld = 0 AND date(start, '+1 hour') = date('now', '+1 hour') ORDER BY start",
      )
        .bind(t.id)
        .all<{ titel: string; start: string }>(),
      DB.prepare(
        `SELECT g.email, g.naam FROM gebruikers g LEFT JOIN team_leden tl ON tl.gebruiker_id = g.id LEFT JOIN meldingen m ON m.gebruiker_id = g.id
         WHERE (g.id = ? OR tl.team_id = ?) AND COALESCE(m.samenvatting, 1) = 1`,
      )
        .bind(t.id, t.id)
        .all<{ email: string; naam: string }>(),
    ]);

    const nl = nieuweLeads?.n ?? 0;
    const ng = gesprekken?.n ?? 0;
    // Niets te melden? Dan geen mail.
    if (!nl && !ng && !heet.results.length && !afspraken.results.length) continue;

    const blokken: string[] = [
      `<p style="margin:0 0 18px">In the last 24 hours AVA talked to <strong>${ng}</strong> ${ng === 1 ? "visitor" : "visitors"} and <strong>${nl}</strong> ${nl === 1 ? "new lead" : "new leads"} came in.</p>`,
    ];
    if (heet.results.length) {
      blokken.push(
        `<p style="margin:0 0 6px;font-weight:600;color:#0b1220">Call these first today</p><ol style="margin:0 0 18px;padding-left:20px">${heet.results
          .map((l) => `<li style="margin:0 0 6px"><strong>${esc(l.naam)}</strong> · warmth ${l.warmte}<br><span style="color:#64748b">${esc(l.onderwerp)}${l.laatste_actie ? ` · ${esc(l.laatste_actie)}` : ""}</span></li>`)
          .join("")}</ol>`,
      );
    }
    if (afspraken.results.length) {
      blokken.push(
        `<p style="margin:0 0 6px;font-weight:600;color:#0b1220">On your calendar today</p><ul style="margin:0;padding-left:20px">${afspraken.results
          .map((a) => `<li style="margin:0 0 4px">${tijd(a.start)} · ${esc(a.titel)}</li>`)
          .join("")}</ul>`,
      );
    }

    for (const o of ontvangers.results) {
      const ok = await verstuurMail(
        o.email,
        `Your morning at ${t.bedrijf}: ${nl} ${nl === 1 ? "new lead" : "new leads"}`,
        mailOpmaak(`Good morning, ${esc(o.naam.split(/\s+/)[0])}`, blokken.join(""), { tekst: "Open Volgo", url: `${SITE_URL}/dashboard` }),
      );
      if (ok) verstuurd++;
    }
  }
  return { verstuurd };
}

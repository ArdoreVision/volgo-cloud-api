// Team, agenda en voorbeelddata. Alles is per team (team_id = id van de eigenaar).
import type { D1Database } from "@cloudflare/workers-types";

const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });
export const amsDatum = (d: Date) => fmt.format(d); // YYYY-MM-DD in Amsterdamse tijd
const plusDagen = (n: number) => new Date(Date.now() + n * 86400000);

function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const NAMEN = ["Sanne de Vries", "Mark Jansen", "Fatima El Amrani", "Pieter Bakker", "Lisa Visser", "Ahmed Yilmaz", "Eva Smit", "Tom de Boer", "Noor Mulder", "Jeroen Bos", "Sophie Dekker", "Daan Meijer", "Anouk Kok", "Bram Hendriks", "Lotte van Dijk", "Youssef Ouali", "Iris Peters", "Ruben Willems", "Emma Jacobs", "Sem de Graaf", "Julia Verbeek", "Thijs Kuipers", "Mila Brouwer", "Luuk van Leeuwen"];
const ONDERWERPEN = ["Warmtepomp, vrijstaande woning", "Airco voor slaapkamer", "Cv-ketel vervangen", "Offerte zonnepanelen", "Ventilatie in nieuwbouw", "Storing vloerverwarming", "Hybride warmtepomp", "Thuisbatterij bij zonnepanelen", "Airco voor kantoor", "Onderhoud cv-ketel"];
const KANALEN = ["Website", "WhatsApp", "E-mail", "Telefoon"];
const REDENEN: Record<string, string[]> = {
  heet: ["Vroeg naar prijs en wanneer jullie kunnen starten", "Wil deze maand nog laten installeren", "Heeft al offertes vergeleken en wil beslissen", "Vroeg zelf om een afspraak bij hem thuis"],
  warm: ["Vroeg naar subsidie en terugverdientijd", "Wil eerst advies over het type", "Reageerde snel op de herinnering van AVA"],
  lauw: ["Oriënteert zich nog, geen haast", "Vroeg alleen naar algemene informatie"],
};

export async function seedTeam(DB: D1Database, teamId: number) {
  const r = rng(teamId * 7919);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const stmts = [];

  // 48 aanvragen verspreid over 90 dagen (meer recent dan vroeger)
  const leadRows: { naam: string; uren: number; status: string; warmte: number; reden: string }[] = [];
  for (let i = 0; i < 48; i++) {
    const dagen = Math.floor(Math.pow(r(), 1.5) * 90);
    const uren = dagen * 24 + Math.floor(r() * 10) + 1;
    const x = r();
    const status = dagen < 3 ? (x < 0.6 ? "nieuw" : "opvolging") : x < 0.22 ? "klant" : x < 0.4 ? "afspraak" : x < 0.58 ? "offerte" : x < 0.78 ? "opvolging" : x < 0.9 ? "verloren" : "nieuw";
    const base = { nieuw: 55, opvolging: 60, offerte: 72, afspraak: 82, klant: 100, verloren: 10 }[status] ?? 50;
    const warmte = Math.max(5, Math.min(99, Math.round(base + (r() - 0.5) * 30 - Math.min(dagen, 30) / 3)));
    const reden = pick(warmte >= 75 ? REDENEN.heet : warmte >= 55 ? REDENEN.warm : REDENEN.lauw);
    leadRows.push({ naam: pick(NAMEN), uren, status, warmte, reden });
  }
  for (const l of leadRows) {
    stmts.push(
      DB.prepare(
        "INSERT INTO klant_leads (gebruiker_id, created_at, naam, onderwerp, kanaal, status, laatste_actie, voorbeeld) VALUES (?, datetime('now', ?), ?, ?, ?, ?, ?, 1)",
      ).bind(teamId, `-${l.uren} hours`, l.naam, pick(ONDERWERPEN), pick(KANALEN), l.status, l.reden),
    );
  }

  // Afspraken: komende 4 weken + een paar in het verleden
  const tijden = ["08:30", "09:00", "10:00", "11:30", "13:00", "14:30", "15:00", "16:30"];
  const soorten = ["Adviesgesprek", "Opname op locatie", "Installatie", "Offertebespreking", "Onderhoud"];
  for (let i = 0; i < 18; i++) {
    const off = Math.floor(r() * 32) - 5;
    const t = pick(tijden);
    const [h, m] = t.split(":").map(Number);
    const duur = pick([30, 60, 90, 120]);
    const eindMin = h * 60 + m + duur;
    const eind = `${String(Math.floor(eindMin / 60)).padStart(2, "0")}:${String(eindMin % 60).padStart(2, "0")}`;
    const naam = pick(NAMEN);
    const d = amsDatum(plusDagen(off));
    stmts.push(
      DB.prepare("INSERT INTO afspraken (team_id, titel, start, eind, locatie, notitie, voorbeeld) VALUES (?, ?, ?, ?, ?, ?, 1)").bind(
        teamId,
        `${pick(soorten)} · ${naam}`,
        `${d}T${t}`,
        `${d}T${eind}`,
        pick(["Bij de klant thuis", "Op kantoor", "Videogesprek", "Bij de klant thuis"]),
        "Ingepland door AVA",
      ),
    );
  }

  // AVA-gesprekken: 3 live, de rest afgerond
  const gesprekken: [string, string, string, string, number, number, number][] = [
    ["Kevin Smit", "WhatsApp", "Wil een warmtepomp, vraagt naar levertijd", "live", 2, 9, 91],
    ["Bezoeker uit Middelburg", "Website", "Vraagt naar subsidie op isolatie", "live", 1, 5, 64],
    ["Hanna de Wit", "Website", "Airco voor 3 slaapkamers, wil prijsindicatie", "live", 3, 12, 78],
    ["Rob Mertens", "E-mail", "Offerte zonnepanelen besproken, afspraak gepland", "afgerond", 45, 14, 86],
    ["Bezoeker uit Goes", "Website", "Algemene vraag over onderhoud", "afgerond", 130, 4, 32],
    ["Yara Bakker", "WhatsApp", "Storing cv-ketel, monteur ingepland", "afgerond", 210, 8, 88],
    ["Joost Verhoef", "Website", "Vergelijkt warmtepompen, komt erop terug", "afgerond", 380, 10, 55],
    ["Bezoeker uit Vlissingen", "Website", "Vroeg naar openingstijden", "afgerond", 900, 3, 18],
  ];
  for (const [b, k, o, s, minGeleden, n, w] of gesprekken) {
    stmts.push(
      DB.prepare(
        "INSERT INTO ava_gesprekken (team_id, bezoeker, kanaal, onderwerp, status, gestart, laatste, berichten, warmte, voorbeeld) VALUES (?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?), ?, ?, 1)",
      ).bind(teamId, b, k, o, s, `-${minGeleden + n * 2} minutes`, `-${minGeleden} minutes`, n, w),
    );
  }
  await DB.batch(stmts);

  // Warmte-scores voor alle voorbeeldaanvragen van dit team
  const leads = await DB.prepare("SELECT id, status, laatste_actie FROM klant_leads WHERE gebruiker_id = ? AND voorbeeld = 1").bind(teamId).all<{ id: number; status: string; laatste_actie: string | null }>();
  const r2 = rng(teamId * 104729);
  await DB.batch(
    leads.results.map((l) => {
      const base = { nieuw: 58, opvolging: 62, offerte: 74, afspraak: 84, klant: 100, verloren: 8 }[l.status] ?? 50;
      const w = Math.max(5, Math.min(99, Math.round(base + (r2() - 0.5) * 34)));
      return DB.prepare("INSERT OR REPLACE INTO lead_scores (lead_id, warmte, reden) VALUES (?, ?, ?)").bind(l.id, w, l.laatste_actie ?? "");
    }),
  );
}

export async function zorgVoorKanaal(DB: D1Database, teamId: number) {
  const k = await DB.prepare("SELECT id FROM kanalen WHERE team_id = ? LIMIT 1").bind(teamId).first();
  if (!k) {
    await DB.batch([
      DB.prepare("INSERT INTO kanalen (team_id, naam) VALUES (?, 'algemeen')").bind(teamId),
      DB.prepare("INSERT INTO kanalen (team_id, naam) VALUES (?, 'leads')").bind(teamId),
    ]);
  }
}

export const dmKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bestaandeLead, boekViaChat, contactSleutel, instellingenVoorTeam, verwerkBericht } from "@/lib/ava.server";

import { maakDb, maakTeam } from "./d1";

describe("lead de-duplication", () => {
  it("treats the same email or phone number written differently as the same contact", () => {
    expect(contactSleutel("Jan@Mail.NL ")).toBe(contactSleutel("jan@mail.nl"));
    expect(contactSleutel("06 12 34 56 78")).toBe(contactSleutel("+31612345678"));
    expect(contactSleutel("0612345678")).toBe(contactSleutel("06-1234-5678"));
    expect(contactSleutel("0612345678")).not.toBe(contactSleutel("0687654321"));
    expect(contactSleutel("")).toBe("");
  });

  it("finds an open lead with the same contact, but not a won/lost one", async () => {
    const DB = maakDb();
    const team = await maakTeam(DB);
    const ins = async (contact: string, status: string) => {
      const l = await DB.prepare("INSERT INTO klant_leads (gebruiker_id, naam, onderwerp, kanaal, status) VALUES (?, 'X', 'Y', 'Website-chat', ?)").bind(team, status).run();
      const g = await DB.prepare("INSERT INTO ava_gesprekken (team_id, bezoeker, kanaal, onderwerp, status, gestart, laatste) VALUES (?, 'X', 'Website-chat', 'Y', 'afgerond', datetime('now'), datetime('now'))").bind(team).run();
      await DB.prepare("INSERT INTO ava_gesprek_meta (gesprek_id, token, contact, lead_id) VALUES (?, ?, ?, ?)").bind(g.meta.last_row_id, `t${g.meta.last_row_id}`, contact, l.meta.last_row_id).run();
      return Number(l.meta.last_row_id);
    };
    const open = await ins("06 1234 5678", "nieuw");
    await ins("klaar@mail.nl", "klant");
    expect((await bestaandeLead(DB, team, "+31612345678"))?.id).toBe(open);
    expect(await bestaandeLead(DB, team, "KLAAR@mail.nl")).toBeNull();
    expect(await bestaandeLead(DB, team, "0699999999")).toBeNull();
    // Another business never sees this lead.
    const ander = await maakTeam(DB);
    expect(await bestaandeLead(DB, ander, "0612345678")).toBeNull();
  });
});

describe("the whole chain in basic mode (no AI key): visitor → conversation → lead → appointment", () => {
  beforeEach(() => vi.useFakeTimers({ now: Date.UTC(2026, 10, 3, 9, 0), toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());

  it("creates one lead, books an appointment on it, and does not duplicate the lead on a second visit", async () => {
    const DB = maakDb();
    const team = await maakTeam(DB);
    const inst = await instellingenVoorTeam(DB, team);
    // Sample data is purged the moment a real conversation starts.
    await DB.prepare("INSERT INTO klant_leads (gebruiker_id, naam, onderwerp, kanaal, status, voorbeeld) VALUES (?, 'Sample', 'S', 'Website', 'nieuw', 1)").bind(team).run();

    const r1 = await verwerkBericht(DB, inst, undefined, "Ik wil een offerte voor een warmtepomp, wat is de prijs en kan dat deze week?");
    expect(r1.token).toMatch(/^[0-9a-f]{32}$/);
    expect(r1.antwoord).toContain("name");
    const r2 = await verwerkBericht(DB, inst, r1.token, "Jan de Vries");
    expect(r2.antwoord).toContain("Jan");
    const r3 = await verwerkBericht(DB, inst, r1.token, "blablabla");
    expect(r3.antwoord).toMatch(/phone number or email/);
    const r4 = await verwerkBericht(DB, inst, r1.token, "06 12 34 56 78");
    expect(r4.antwoord).toMatch(/may .* contact you/i);
    const r5 = await verwerkBericht(DB, inst, r1.token, "ja graag");
    expect(r5.antwoord).toMatch(/passed on/);

    const leads = (await DB.prepare("SELECT id, naam, status, voorbeeld FROM klant_leads WHERE gebruiker_id = ? ORDER BY id").bind(team).all<{ id: number; naam: string; status: string; voorbeeld: number }>()).results;
    expect(leads).toHaveLength(1); // sample lead gone, one real lead
    expect(leads[0]).toMatchObject({ naam: "Jan de Vries", status: "nieuw", voorbeeld: 0 });
    const score = await DB.prepare("SELECT warmte FROM lead_scores WHERE lead_id = ?").bind(leads[0]!.id).first<{ warmte: number }>();
    expect(score!.warmte).toBeGreaterThanOrEqual(75); // "offerte", "prijs", "deze week" + contact details

    // Books in the same chat: appointment lands on that lead.
    const boek = await boekViaChat(DB, inst, r1.token, { start: "2026-11-04T13:00", soort: "bellen", naam: "Jan de Vries", contact: "0612345678" });
    expect(boek.ok).toBe(true);
    const af = await DB.prepare("SELECT lead_id, start FROM afspraken WHERE team_id = ?").bind(team).first<{ lead_id: number; start: string }>();
    expect(af).toEqual({ lead_id: leads[0]!.id, start: "2026-11-04T13:00" });
    expect((await DB.prepare("SELECT status FROM klant_leads WHERE id = ?").bind(leads[0]!.id).first<{ status: string }>())!.status).toBe("afspraak");

    // Comes back a week later from another device (new conversation), same number: no second lead.
    const s1 = await verwerkBericht(DB, inst, undefined, "Hoi, nog even over mijn warmtepomp");
    await verwerkBericht(DB, inst, s1.token, "Jan de Vries");
    await verwerkBericht(DB, inst, s1.token, "+31 6 12345678");
    await verwerkBericht(DB, inst, s1.token, "ja");
    const alle = (await DB.prepare("SELECT COUNT(*) AS n FROM klant_leads WHERE gebruiker_id = ? AND voorbeeld = 0").bind(team).first<{ n: number }>())!.n;
    expect(alle).toBe(1);
    const koppel = (await DB.prepare("SELECT COUNT(*) AS n FROM ava_gesprek_meta WHERE lead_id = ?").bind(leads[0]!.id).first<{ n: number }>())!.n;
    expect(koppel).toBe(2); // both conversations hang under the same lead

    // Someone from the team takes over: AVA stays quiet.
    await DB.prepare("UPDATE ava_gesprek_meta SET overgenomen_door = ?, overgenomen_naam = 'Damien' WHERE token = ?").bind(team, s1.token).run();
    const stil = await verwerkBericht(DB, inst, s1.token, "Bent u er nog?");
    expect(stil.antwoord).toBe("");
    expect(stil.mens).toBe("Damien");
  });

  it("refuses the second booking of a slot that was just taken, with a clear reason", async () => {
    const DB = maakDb();
    const team = await maakTeam(DB);
    const inst = await instellingenVoorTeam(DB, team);
    const a = await boekViaChat(DB, inst, undefined, { start: "2026-11-04T13:00", soort: "bellen", naam: "A", contact: "a@a.nl" });
    const b = await boekViaChat(DB, inst, undefined, { start: "2026-11-04T13:00", soort: "bellen", naam: "B", contact: "b@b.nl" });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.reden).toMatch(/no longer available/);
    expect((await DB.prepare("SELECT COUNT(*) AS n FROM klant_leads WHERE gebruiker_id = ?").bind(team).first<{ n: number }>())!.n).toBe(1);
  });
});

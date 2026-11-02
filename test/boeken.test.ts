import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { instellingenVoorTeam } from "@/lib/ava.server";
import { boekAfspraak, nuLokaal, vrijeDagen } from "@/lib/boeken.server";

import { maakDb, maakTeam } from "./d1";

// A Tuesday, 10:00 in Amsterdam (winter time, UTC+1).
const DINSDAG_10U = Date.UTC(2026, 10, 3, 9, 0); // 2026-11-03T09:00Z

describe("calendar in the chat", () => {
  beforeEach(() => vi.useFakeTimers({ now: DINSDAG_10U, toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());

  it("knows the business's local time, also across the DST switch", () => {
    expect(nuLokaal("Europe/Amsterdam")).toBe("2026-11-03T10:00");
    expect(nuLokaal("America/New_York")).toBe("2026-11-03T04:00");
    // 2026-03-29 02:00 local time does not exist (clocks jump to 03:00); the hour after midnight UTC is 02:00 → 03:00.
    vi.setSystemTime(Date.UTC(2026, 2, 29, 1, 30));
    expect(nuLokaal("Europe/Amsterdam")).toBe("2026-03-29T03:30");
    // and on the autumn switch (2026-10-25) the local clock goes back: 00:30Z is 02:30 CEST, 01:30Z is 02:30 CET again.
    vi.setSystemTime(Date.UTC(2026, 9, 25, 0, 30));
    expect(nuLokaal("Europe/Amsterdam")).toBe("2026-10-25T02:30");
    vi.setSystemTime(Date.UTC(2026, 9, 25, 1, 30));
    expect(nuLokaal("Europe/Amsterdam")).toBe("2026-10-25T02:30");
  });

  it("only offers slots inside opening hours, on open days, at least two hours ahead", async () => {
    const DB = maakDb();
    const team = await maakTeam(DB);
    const inst = await instellingenVoorTeam(DB, team);
    const dagen = await vrijeDagen(DB, inst);
    expect(dagen).toHaveLength(21);
    const vandaag = dagen.find((d) => d.datum === "2026-11-03")!;
    expect(vandaag.status).toBe("open");
    // 09:00, 10:00 and 11:00 are too soon (now + 2 h = 12:00); 12:00 to 16:00 are free; 17:00 would end at 18:00, after closing.
    expect(vandaag.tijden.map((t) => `${t.t}${t.vrij ? "" : "x"}`)).toEqual(["09:00x", "10:00x", "11:00x", "12:00", "13:00", "14:00", "15:00", "16:00"]);
    expect(dagen.find((d) => d.datum === "2026-11-07")!.status).toBe("dicht"); // Saturday
    expect(dagen.find((d) => d.datum === "2026-11-02")!.status).toBe("voorbij"); // yesterday
  });

  it("books a free slot and links it to the lead", async () => {
    const DB = maakDb();
    const team = await maakTeam(DB);
    const inst = await instellingenVoorTeam(DB, team);
    const r = await boekAfspraak(DB, inst, { start: "2026-11-04T13:00", soort: "bellen", naam: "Jan de Vries", contact: "0612345678" }, null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.eind).toBe("2026-11-04T14:00");
    const row = await DB.prepare("SELECT titel, locatie, voorbeeld FROM afspraken WHERE id = ?").bind(r.id).first<{ titel: string; locatie: string; voorbeeld: number }>();
    expect(row?.titel).toBe("Phone call · Jan de Vries");
    expect(row?.locatie).toBe("Phone call: 0612345678");
    expect(row?.voorbeeld).toBe(0);
  });

  it("refuses closed days, times outside opening hours, off-grid minutes, the past and too far ahead", async () => {
    const DB = maakDb();
    const team = await maakTeam(DB);
    const inst = await instellingenVoorTeam(DB, team);
    const b = (start: string) => boekAfspraak(DB, inst, { start, soort: "bellen", naam: "A B", contact: "a@b.nl" }, null);
    expect((await b("2026-11-07T10:00")).ok).toBe(false); // Saturday
    expect((await b("2026-11-04T08:00")).ok).toBe(false); // before opening
    expect((await b("2026-11-04T16:30")).ok).toBe(false); // ends after closing
    expect((await b("2026-11-04T13:30")).ok).toBe(false); // not on the hourly grid
    expect((await b("2026-11-03T11:00")).ok).toBe(false); // less than two hours from now
    expect((await b("2026-12-15T10:00")).ok).toBe(false); // beyond 28 days
    expect((await b("2026-11-04T13:00")).ok).toBe(true);
    expect(await DB.prepare("SELECT COUNT(*) AS n FROM afspraken").first<{ n: number }>()).toEqual({ n: 1 });
  });

  it("requires name, contact, a kind the business offers and an address for a visit", async () => {
    const DB = maakDb();
    const team = await maakTeam(DB);
    const inst = await instellingenVoorTeam(DB, team);
    expect((await boekAfspraak(DB, inst, { start: "2026-11-04T13:00", soort: "kantoor", naam: "A B", contact: "a@b.nl" }, null)).ok).toBe(false);
    expect((await boekAfspraak(DB, inst, { start: "2026-11-04T13:00", soort: "langs", naam: "A B", contact: "a@b.nl" }, null)).ok).toBe(false);
    expect((await boekAfspraak(DB, inst, { start: "2026-11-04T13:00", soort: "langs", naam: "", contact: "a@b.nl", adres: "Markt 1, Goes" }, null)).ok).toBe(false);
    expect((await boekAfspraak(DB, inst, { start: "2026-11-04T13:00", soort: "langs", naam: "A B", contact: "a@b.nl", adres: "Markt 1, Goes" }, null)).ok).toBe(true);
  });

  it("never double-books: the second visitor who picks the same (or an overlapping) moment is refused", async () => {
    const DB = maakDb();
    const team = await maakTeam(DB, { afspraak_duur: 90 });
    const inst = await instellingenVoorTeam(DB, team);
    const eerste = await boekAfspraak(DB, inst, { start: "2026-11-04T13:00", soort: "bellen", naam: "Eerste", contact: "0611111111" }, null);
    expect(eerste.ok).toBe(true);
    // Same slot, and a slot that starts while the first one is still running (14:00–15:30 overlaps 13:00–14:30).
    const tweede = await boekAfspraak(DB, inst, { start: "2026-11-04T13:00", soort: "bellen", naam: "Tweede", contact: "0622222222" }, null);
    const derde = await boekAfspraak(DB, inst, { start: "2026-11-04T14:00", soort: "bellen", naam: "Derde", contact: "0633333333" }, null);
    expect(tweede.ok).toBe(false);
    expect(derde.ok).toBe(false);
    // Two bookings fired at the same time: exactly one wins.
    const race = await Promise.all([
      boekAfspraak(DB, inst, { start: "2026-11-05T10:00", soort: "bellen", naam: "X", contact: "0644444444" }, null),
      boekAfspraak(DB, inst, { start: "2026-11-05T10:00", soort: "bellen", naam: "Y", contact: "0655555555" }, null),
    ]);
    expect(race.filter((r) => r.ok)).toHaveLength(1);
    expect(await DB.prepare("SELECT COUNT(*) AS n FROM afspraken").first<{ n: number }>()).toEqual({ n: 2 });
    // The calendar in the chat shows the taken slot as not free.
    const dag = (await vrijeDagen(DB, inst)).find((d) => d.datum === "2026-11-04")!;
    expect(dag.tijden.find((t) => t.t === "13:00")?.vrij).toBe(false);
    expect(dag.tijden.find((t) => t.t === "15:00")?.vrij).toBe(true);
  });

  it("ignores sample appointments when checking what is free", async () => {
    const DB = maakDb();
    const team = await maakTeam(DB);
    const inst = await instellingenVoorTeam(DB, team);
    await DB.prepare("INSERT INTO afspraken (team_id, titel, start, eind, voorbeeld) VALUES (?, 'Sample', '2026-11-04T13:00', '2026-11-04T14:00', 1)").bind(team).run();
    expect((await boekAfspraak(DB, inst, { start: "2026-11-04T13:00", soort: "bellen", naam: "A B", contact: "a@b.nl" }, null)).ok).toBe(true);
  });
});

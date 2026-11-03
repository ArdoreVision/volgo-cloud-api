// A tiny D1 look-alike on top of node:sqlite, with the real migrations applied. Enough for prepare/bind/run/first/all/batch.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { D1Database } from "@cloudflare/workers-types";

export function maakDb(): D1Database & { raw: DatabaseSync } {
  const db = new DatabaseSync(":memory:");
  const map = join(import.meta.dirname, "..", "migrations");
  for (const f of readdirSync(map).sort()) db.exec(readFileSync(join(map, f), "utf8"));

  const maak = (sql: string, args: unknown[] = []) => {
    const run = () => {
      const st = db.prepare(sql);
      const r = st.run(...(args as never[]));
      return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) }, results: [] };
    };
    const all = () => {
      const st = db.prepare(sql);
      return { success: true, results: st.all(...(args as never[])) as Record<string, unknown>[], meta: {} };
    };
    const stmt = {
      bind: (...b: unknown[]) => maak(sql, b),
      run: async () => run(),
      all: async () => all(),
      first: async (col?: string) => {
        const rows = all().results;
        const r = rows[0] ?? null;
        return col && r ? r[col] : r;
      },
      raw: async () => all().results.map((r) => Object.values(r)),
      __sql: sql,
      __isSelect: /^\s*(select|with)/i.test(sql),
    };
    return stmt;
  };
  const d1 = {
    raw: db,
    prepare: (sql: string) => maak(sql),
    batch: async (stmts: ReturnType<typeof maak>[]) => Promise.all(stmts.map((s) => (s.__isSelect ? s.all() : s.run()))),
    exec: async (sql: string) => {
      db.exec(sql);
      return { count: 1, duration: 0 };
    },
    dump: async () => new ArrayBuffer(0),
    withSession: () => d1,
  };
  return d1 as unknown as D1Database & { raw: DatabaseSync };
}

/** A paying team with AVA settings, like a real account after signup. Returns the team id. */
export async function maakTeam(DB: D1Database, opts: Partial<{ open_dagen: string; open_van: string; open_tot: string; afspraak_duur: number; tijdzone: string; afspraak_soorten: string }> = {}) {
  const r = await DB.prepare("INSERT INTO gebruikers (email, naam, bedrijf, wachtwoord, plan, status) VALUES (?, ?, ?, 'x', 'start', 'actief')")
    .bind(`team${Math.random().toString(36).slice(2)}@test.nl`, "Test Eigenaar", "Testbedrijf")
    .run();
  const id = Number(r.meta.last_row_id);
  await DB.prepare("INSERT INTO ava_instellingen (team_id, sleutel, begroeting, open_dagen, open_van, open_tot, afspraak_duur, tijdzone, afspraak_soorten) VALUES (?, ?, 'Hi!', ?, ?, ?, ?, ?, ?)")
    .bind(id, `k${id}`, opts.open_dagen ?? "1,2,3,4,5", opts.open_van ?? "09:00", opts.open_tot ?? "17:00", opts.afspraak_duur ?? 60, opts.tijdzone ?? "Europe/Amsterdam", opts.afspraak_soorten ?? "bellen,langs")
    .run();
  return id;
}

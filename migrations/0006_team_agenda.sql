CREATE TABLE IF NOT EXISTS team_leden (
  gebruiker_id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL,
  rol TEXT NOT NULL DEFAULT 'lid'
);
CREATE TABLE IF NOT EXISTS uitnodigingen (
  token TEXT PRIMARY KEY,
  team_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  gebruikt INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS kanalen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  naam TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS berichten (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  kanaal_id INTEGER,
  dm_key TEXT,
  afzender_id INTEGER NOT NULL,
  tekst TEXT NOT NULL,
  soort TEXT NOT NULL DEFAULT 'tekst',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_berichten_kanaal ON berichten (team_id, kanaal_id, id);
CREATE INDEX IF NOT EXISTS idx_berichten_dm ON berichten (team_id, dm_key, id);
CREATE TABLE IF NOT EXISTS afspraken (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  lead_id INTEGER,
  titel TEXT NOT NULL,
  start TEXT NOT NULL,
  eind TEXT NOT NULL,
  locatie TEXT,
  notitie TEXT,
  voorbeeld INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_afspraken_team ON afspraken (team_id, start);
CREATE TABLE IF NOT EXISTS ava_gesprekken (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  bezoeker TEXT NOT NULL,
  kanaal TEXT NOT NULL,
  onderwerp TEXT NOT NULL,
  status TEXT NOT NULL,
  gestart TEXT NOT NULL,
  laatste TEXT NOT NULL,
  berichten INTEGER NOT NULL DEFAULT 0,
  warmte INTEGER NOT NULL DEFAULT 50,
  voorbeeld INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS lead_scores (
  lead_id INTEGER PRIMARY KEY,
  warmte INTEGER NOT NULL,
  reden TEXT
);

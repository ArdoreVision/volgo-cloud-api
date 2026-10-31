CREATE TABLE IF NOT EXISTS ava_instellingen (
  team_id INTEGER PRIMARY KEY,
  sleutel TEXT NOT NULL UNIQUE,
  naam TEXT NOT NULL DEFAULT 'AVA',
  begroeting TEXT NOT NULL,
  bedrijfsinfo TEXT NOT NULL DEFAULT '',
  kleur TEXT NOT NULL DEFAULT '#1677d9'
);
CREATE TABLE IF NOT EXISTS ava_berichten (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gesprek_id INTEGER NOT NULL,
  rol TEXT NOT NULL,
  tekst TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ava_berichten ON ava_berichten (gesprek_id, id);
CREATE TABLE IF NOT EXISTS ava_gesprek_meta (
  gesprek_id INTEGER PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  stap INTEGER NOT NULL DEFAULT 0,
  naam TEXT,
  contact TEXT,
  lead_id INTEGER
);
CREATE TABLE IF NOT EXISTS meldingen (
  gebruiker_id INTEGER PRIMARY KEY,
  chat INTEGER NOT NULL DEFAULT 1,
  lead INTEGER NOT NULL DEFAULT 1,
  email INTEGER NOT NULL DEFAULT 0
);

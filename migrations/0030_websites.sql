-- Customer websites hosted in Volgo, managed by the owner from /admin.
CREATE TABLE IF NOT EXISTS klant_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  domein TEXT UNIQUE,
  domein_id TEXT,
  domein_status TEXT NOT NULL DEFAULT '',
  live_versie INTEGER,
  concept_versie INTEGER,
  status TEXT NOT NULL DEFAULT 'concept',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS site_versies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  nummer INTEGER NOT NULL,
  gemaakt_door TEXT NOT NULL DEFAULT '',
  notitie TEXT NOT NULL DEFAULT '',
  manifest TEXT NOT NULL DEFAULT '{}',
  token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_site_versies ON site_versies (site_id, nummer);
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_versies_token ON site_versies (token);
CREATE TABLE IF NOT EXISTS site_controles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ok INTEGER NOT NULL DEFAULT 1,
  details TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_site_controles ON site_controles (site_id, id);
CREATE TABLE IF NOT EXISTS site_chat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  rol TEXT NOT NULL,
  tekst TEXT NOT NULL,
  gewijzigd TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_site_chat ON site_chat (team_id, id);

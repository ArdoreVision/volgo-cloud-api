-- Pro/Premium: aanvraag voor een website op maat (via chat of call), met status.
CREATE TABLE IF NOT EXISTS website_aanvragen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  contact TEXT NOT NULL,
  telefoon TEXT NOT NULL DEFAULT '',
  domein TEXT NOT NULL DEFAULT '',
  huidige_site TEXT NOT NULL DEFAULT '',
  wensen TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ontvangen'
);
CREATE INDEX IF NOT EXISTS idx_website_aanvragen_team ON website_aanvragen (team_id, id);

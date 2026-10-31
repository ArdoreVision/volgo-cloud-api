-- Privacy-friendly website analytics from the AVA script: no cookies, no IP addresses stored.
-- "bezoeker" is a daily-changing hash, so a visitor can't be followed across days or websites.
CREATE TABLE IF NOT EXISTS site_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  dag TEXT NOT NULL,
  bezoeker TEXT NOT NULL,
  sessie TEXT NOT NULL,
  pad TEXT NOT NULL,
  titel TEXT,
  bron TEXT,
  apparaat TEXT,
  land TEXT,
  duur INTEGER NOT NULL DEFAULT 0,
  scroll INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_site_views_team ON site_views (team_id, dag);
CREATE TABLE IF NOT EXISTS site_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  dag TEXT NOT NULL,
  sessie TEXT NOT NULL,
  soort TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_site_events_team ON site_events (team_id, dag);

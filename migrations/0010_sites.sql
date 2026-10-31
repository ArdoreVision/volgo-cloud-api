-- Website per team (Premium kan hem zelf aanpassen met AVA).
CREATE TABLE IF NOT EXISTS sites (
  team_id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  data TEXT NOT NULL,
  vorige TEXT,
  gepubliceerd INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

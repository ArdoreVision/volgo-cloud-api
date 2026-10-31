CREATE TABLE IF NOT EXISTS aanvragen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  naam TEXT NOT NULL,
  bedrijf TEXT NOT NULL,
  email TEXT NOT NULL,
  telefoon TEXT,
  website TEXT,
  branche TEXT,
  wens TEXT,
  bericht TEXT,
  ip_hash TEXT
);

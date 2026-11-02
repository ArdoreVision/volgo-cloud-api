-- Real customer reviews, added by the Volgo team in the admin. Shown on the landing page once there is at least one.
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  naam TEXT NOT NULL,
  bedrijf TEXT NOT NULL,
  plaats TEXT NOT NULL DEFAULT '',
  branche TEXT NOT NULL DEFAULT '',
  tekst TEXT NOT NULL,
  sterren INTEGER NOT NULL DEFAULT 5,
  resultaat TEXT NOT NULL DEFAULT '',
  zichtbaar INTEGER NOT NULL DEFAULT 1
);

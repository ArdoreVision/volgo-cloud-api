-- Cached translations of website texts, one row per (text hash, language).
CREATE TABLE IF NOT EXISTS vertalingen (
  sleutel TEXT PRIMARY KEY,
  taal TEXT NOT NULL,
  bron TEXT NOT NULL,
  tekst TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

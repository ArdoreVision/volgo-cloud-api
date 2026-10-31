-- Gedeelde teller voor rate limits (inloggen, wachtwoord, widget, mails), per sleutel.
CREATE TABLE IF NOT EXISTS limieten (
  sleutel TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_limieten ON limieten (sleutel, created_at);

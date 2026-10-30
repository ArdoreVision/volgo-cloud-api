CREATE TABLE IF NOT EXISTS gebruikers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  email TEXT NOT NULL UNIQUE,
  naam TEXT NOT NULL,
  bedrijf TEXT NOT NULL,
  wachtwoord TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'actief',
  proef_tot TEXT,
  stripe_klant TEXT,
  stripe_abonnement TEXT,
  testmodus INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessies (
  token_hash TEXT PRIMARY KEY,
  gebruiker_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  verloopt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS betalingen (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  email TEXT,
  stripe_klant TEXT,
  stripe_abonnement TEXT,
  testmodus INTEGER NOT NULL DEFAULT 0,
  gebruikt INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS klant_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gebruiker_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  naam TEXT NOT NULL,
  onderwerp TEXT NOT NULL,
  kanaal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nieuw',
  laatste_actie TEXT,
  voorbeeld INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_klant_leads_gebruiker ON klant_leads (gebruiker_id, created_at);

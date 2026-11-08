-- Automatic messages to visitors, payment requests, reviews and the one inbox.
ALTER TABLE ava_instellingen ADD COLUMN review_url TEXT NOT NULL DEFAULT '';
ALTER TABLE ava_instellingen ADD COLUMN taal TEXT NOT NULL DEFAULT 'nl';
ALTER TABLE ava_instellingen ADD COLUMN auto_herinnering INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ava_instellingen ADD COLUMN auto_review INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ava_instellingen ADD COLUMN auto_opvolging INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ava_instellingen ADD COLUMN auto_seizoen INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ava_instellingen ADD COLUMN antwoord_mail TEXT NOT NULL DEFAULT '';
ALTER TABLE ava_instellingen ADD COLUMN iban TEXT NOT NULL DEFAULT '';
ALTER TABLE ava_instellingen ADD COLUMN stripe_sleutel TEXT NOT NULL DEFAULT '';
ALTER TABLE ava_gesprek_meta ADD COLUMN afgemeld INTEGER NOT NULL DEFAULT 0;

-- Every automatic message, once per (team, kind, reference).
CREATE TABLE IF NOT EXISTS auto_berichten (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  soort TEXT NOT NULL,
  ref TEXT NOT NULL,
  aan TEXT NOT NULL DEFAULT '',
  kanaal TEXT NOT NULL DEFAULT 'mail',
  onderwerp TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'verstuurd',
  gemaakt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (team_id, soort, ref)
);
CREATE INDEX IF NOT EXISTS auto_berichten_team ON auto_berichten (team_id, gemaakt);

CREATE TABLE IF NOT EXISTS betaalverzoeken (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  lead_id INTEGER,
  gesprek_id INTEGER,
  naam TEXT NOT NULL,
  contact TEXT NOT NULL,
  bedrag INTEGER NOT NULL,
  omschrijving TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  stripe_sessie TEXT,
  gemaakt TEXT NOT NULL DEFAULT (datetime('now')),
  betaald TEXT
);
CREATE INDEX IF NOT EXISTS betaalverzoeken_team ON betaalverzoeken (team_id, gemaakt);

CREATE TABLE IF NOT EXISTS review_antwoorden (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  sterren INTEGER NOT NULL DEFAULT 5,
  review TEXT NOT NULL,
  antwoord TEXT NOT NULL,
  gemaakt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Wachtwoord vergeten
CREATE TABLE IF NOT EXISTS wachtwoord_resets (
  token_hash TEXT PRIMARY KEY,
  gebruiker_id INTEGER NOT NULL,
  verloopt TEXT NOT NULL,
  gebruikt INTEGER NOT NULL DEFAULT 0
);
-- Mail bij hete lead en ochtendsamenvatting (standaard aan)
ALTER TABLE meldingen ADD COLUMN heet_mail INTEGER NOT NULL DEFAULT 1;
ALTER TABLE meldingen ADD COLUMN samenvatting INTEGER NOT NULL DEFAULT 1;
-- Eerste dag: welke stappen zijn gedaan
CREATE TABLE IF NOT EXISTS onboarding (
  team_id INTEGER PRIMARY KEY,
  ava_getest INTEGER NOT NULL DEFAULT 0,
  verborgen INTEGER NOT NULL DEFAULT 0
);

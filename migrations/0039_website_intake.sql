-- Before the dashboard opens, the owner tells Volgo about the business and gives their own domain name.
-- Volgo then builds the website from these details. One row per team.
CREATE TABLE IF NOT EXISTS website_intake (
  team_id INTEGER PRIMARY KEY,
  gegevens TEXT NOT NULL DEFAULT '{}',
  -- The owner's own domain without "www." ('' = none yet).
  domein TEXT NOT NULL DEFAULT '',
  -- '' = no domain, 'wacht' = given but not pointing at Volgo yet, 'actief' = the website is served on it.
  domein_status TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_website_intake_domein ON website_intake (domein);

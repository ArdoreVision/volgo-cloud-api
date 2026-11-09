-- Requests can be archived (swipe or button) and restored; archived ones are hidden from the lists.
ALTER TABLE klant_leads ADD COLUMN gearchiveerd INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS klant_leads_archief ON klant_leads (gebruiker_id, gearchiveerd);

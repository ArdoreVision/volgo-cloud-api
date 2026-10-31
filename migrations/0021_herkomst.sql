-- Where visitors come from (only stored after the visitor gave permission in the consent screen).
ALTER TABLE ava_instellingen ADD COLUMN toestemming INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_views ADD COLUMN toestemming INTEGER NOT NULL DEFAULT 0;
ALTER TABLE site_views ADD COLUMN vast TEXT;
ALTER TABLE site_views ADD COLUMN stad TEXT;
ALTER TABLE site_views ADD COLUMN regio TEXT;
ALTER TABLE site_views ADD COLUMN browser TEXT;
ALTER TABLE site_views ADD COLUMN os TEXT;
ALTER TABLE site_views ADD COLUMN taal TEXT;
CREATE INDEX IF NOT EXISTS idx_site_views_sessie ON site_views (team_id, sessie);
ALTER TABLE ava_gesprek_meta ADD COLUMN sessie TEXT;
ALTER TABLE ava_gesprek_meta ADD COLUMN herkomst TEXT;

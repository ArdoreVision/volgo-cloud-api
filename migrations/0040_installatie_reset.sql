-- "Connect another website" on the Install page: remember when the owner started over, and which website a
-- visit came from, so the live check only counts visits on the website that is connected now.
ALTER TABLE ava_instellingen ADD COLUMN installatie_reset TEXT NOT NULL DEFAULT '';
ALTER TABLE site_views ADD COLUMN host TEXT;

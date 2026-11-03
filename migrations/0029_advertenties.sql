-- Which ad brought the visitor (from utm_* and Meta's campaign_name / adset_name / ad_name / placement in the landing URL).
-- The click id (fbclid / gclid) is only kept when the visitor accepted the consent screen.
ALTER TABLE site_views ADD COLUMN medium TEXT;
ALTER TABLE site_views ADD COLUMN campagne TEXT;
ALTER TABLE site_views ADD COLUMN adset TEXT;
ALTER TABLE site_views ADD COLUMN advertentie TEXT;
ALTER TABLE site_views ADD COLUMN plaatsing TEXT;
ALTER TABLE site_views ADD COLUMN klik_id TEXT;
-- Short "via Facebook · campaign · ad" note on the conversation, so every lead shows which ad it came from.
ALTER TABLE ava_gesprek_meta ADD COLUMN advertentie TEXT;

-- AVA-editor (zoals Shopify "Customize"): extra vormopties en het adres van de eigen website voor de live preview.
ALTER TABLE ava_stijl ADD COLUMN knop TEXT NOT NULL DEFAULT 'pil';
ALTER TABLE ava_stijl ADD COLUMN grootte TEXT NOT NULL DEFAULT 'normaal';
ALTER TABLE ava_stijl ADD COLUMN afstand INTEGER NOT NULL DEFAULT 18;
ALTER TABLE ava_stijl ADD COLUMN zij INTEGER NOT NULL DEFAULT 18;
ALTER TABLE ava_stijl ADD COLUMN uitnodiging TEXT NOT NULL DEFAULT '';
ALTER TABLE ava_instellingen ADD COLUMN site_url TEXT NOT NULL DEFAULT '';

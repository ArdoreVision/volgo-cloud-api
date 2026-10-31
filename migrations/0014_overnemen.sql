-- Een medewerker kan een AVA-gesprek overnemen vanuit het dashboard.
ALTER TABLE ava_gesprek_meta ADD COLUMN overgenomen_door INTEGER;
ALTER TABLE ava_gesprek_meta ADD COLUMN overgenomen_naam TEXT;

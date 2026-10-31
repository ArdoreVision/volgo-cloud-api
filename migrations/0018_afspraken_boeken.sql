-- AVA can book appointments in the business calendar, within opening hours.
ALTER TABLE ava_instellingen ADD COLUMN boeken INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ava_instellingen ADD COLUMN tijdzone TEXT NOT NULL DEFAULT 'Europe/Amsterdam';
ALTER TABLE ava_instellingen ADD COLUMN open_dagen TEXT NOT NULL DEFAULT '1,2,3,4,5';
ALTER TABLE ava_instellingen ADD COLUMN open_van TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE ava_instellingen ADD COLUMN open_tot TEXT NOT NULL DEFAULT '17:00';
ALTER TABLE ava_instellingen ADD COLUMN afspraak_duur INTEGER NOT NULL DEFAULT 60;
-- Which kinds of appointment visitors can pick: bellen (phone call), langs (visit at their address), kantoor (at the office).
ALTER TABLE ava_instellingen ADD COLUMN afspraak_soorten TEXT NOT NULL DEFAULT 'bellen,langs';

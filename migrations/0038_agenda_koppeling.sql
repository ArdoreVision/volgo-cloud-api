-- The business's own calendar: a private iCal address Volgo reads busy times from,
-- and a private token for the iCal feed of Volgo's appointments.
ALTER TABLE ava_instellingen ADD COLUMN agenda_ics TEXT NOT NULL DEFAULT '';
ALTER TABLE ava_instellingen ADD COLUMN agenda_token TEXT NOT NULL DEFAULT '';

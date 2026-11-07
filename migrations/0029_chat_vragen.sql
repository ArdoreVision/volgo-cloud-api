-- What the business owner wants the assistant to ask every visitor before an appointment (one question per line).
ALTER TABLE ava_instellingen ADD COLUMN vragen TEXT NOT NULL DEFAULT '';

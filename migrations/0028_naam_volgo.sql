-- The assistant is now simply called Volgo. Chats that still use the old default name get the new one
-- (and their greeting too); names a customer chose themselves stay as they are.
UPDATE ava_instellingen SET begroeting = REPLACE(begroeting, 'I''m AVA', 'I''m Volgo') WHERE naam = 'AVA';
UPDATE ava_instellingen SET naam = 'Volgo' WHERE naam = 'AVA';

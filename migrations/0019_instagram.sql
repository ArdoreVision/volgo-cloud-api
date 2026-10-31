-- Businesses can offer "DM us on Instagram" as a kind of appointment in the chat.
ALTER TABLE ava_instellingen ADD COLUMN instagram TEXT NOT NULL DEFAULT '';

-- Email as soon as a new conversation starts on the website (per user, on by default).
ALTER TABLE meldingen ADD COLUMN chat_mail INTEGER NOT NULL DEFAULT 1;
